# Tigom ta brad

A shared trip savings & expense tracker for the barkada — contributions, expenses,
available funds, savings goals, and reports, with real accounts and admin/member roles.

This is a full Next.js app (not a sandbox demo) meant to be deployed on Vercel with a
real Postgres database, so the whole group can sign in and share the same data.

## What's new in this version

- **Home page**: a real landing dashboard listing every trip as a card, with a
  combined "saved across all trips" / "available now" summary up top. Opening a trip
  from here drops you into its dashboard, members, contributions, etc.
- **Receipt photos**: contributions and expenses can attach a photo (compressed and
  resized client-side before it's saved, so it stays reasonably small). Click a
  thumbnail to view it full-size.
- **Trip-relative weeks**: the weekly overview now numbers weeks from when the trip
  fund was created ("Week 1, Week 2…") instead of the ISO calendar week of the year.
- **"Delete this trip"** moved out of the dashboard and into the trip's Edit screen,
  under a Danger Zone section — no more stray delete button on the main view.
- Renamed throughout to **Tigom ta brad**, with a redesigned visual identity (custom
  color palette, serif/sans type pairing, ticket-style trip cards) instead of the
  generic default look.

## What changed from the in-chat prototype

- Passwords are hashed with bcrypt (never stored in plain text).
- Sessions are signed JWTs in an httpOnly, secure cookie — not readable by JavaScript,
  not stored in localStorage.
- All financial mutations are validated server-side (positive amounts, required fields)
  before they touch the database, regardless of what the client sends.
- Only admins can create/edit/delete trips, members, contributions, expenses, and accounts.
  Members get read-only access.
- Data lives in Postgres, not in memory, so it persists and is shared across everyone
  who signs in.

## 1. Get a Postgres database

Any of these work and have a free tier:
- **Vercel Postgres** (Storage tab in your Vercel project → Create Database → Postgres)
- **Neon** (neon.tech)
- **Supabase** (supabase.com)

Copy the connection string it gives you (starts with `postgres://`).

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local dev:

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — the connection string from step 1
- `JWT_SECRET` — a random secret, e.g. generate one with `openssl rand -base64 32`

The database tables are created automatically the first time the app talks to the
database (see `lib/db.js`), and a default admin account is seeded automatically:

```
username: admin
password: admin123
```

**Sign in and change this password immediately** (Settings → Change your password) —
especially before sharing the link with your group.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit http://localhost:3000.

## 4. Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel
```

Or push this folder to a GitHub repo and import it in the Vercel dashboard.

When you set up the project in Vercel, add the same two environment variables
(`DATABASE_URL`, `JWT_SECRET`) under Project Settings → Environment Variables, for
both Production and Preview. If you created the database through Vercel's Storage tab,
it usually adds `DATABASE_URL` (or a similarly named var) for you — just make sure the
name matches what `lib/db.js` reads (`DATABASE_URL`), or update it there.

Redeploy after adding env vars.

## 5. Invite your group

Once you've signed in as admin and changed the default password:
1. Go to **Settings → Accounts → Add account** to create a login for each friend
   (pick "Member" for everyone who shouldn't manage money, "Admin" for co-organizers).
2. Share the site URL and their individual username/password with each person directly
   (not in a group chat, ideally) — the account creation form doesn't email anything
   automatically.
3. Create your first trip from the "Create a trip" button.

## Notes on the data model

Trip metadata (name, destination, dates, target) lives in normal Postgres columns.
Members, contributions, expenses, and category budgets live together in a single
`data` JSONB column per trip. This keeps the app simple to run and reason about for a
friend-group scale tool, while still keeping every contribution/expense as its own
transaction record (nothing overwrites a running total — totals are always computed
from the underlying list). If you outgrow this later (many trips, need for reporting
across trips in SQL, etc.), the natural next step is splitting `data` into normalized
`members`, `contributions`, and `expenses` tables — the API route shapes were kept
close to that split to make migrating later straightforward.
