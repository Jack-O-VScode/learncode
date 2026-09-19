# Setup

Ten minutes from a fresh clone to a working, cloud-synced app.

---

## 1. Run it locally

```bash
npm install
npm run dev
```

Open the address it prints (usually `http://localhost:5173`).

It works immediately — you can create an account and start learning right now.
Without Supabase keys it runs in **local mode**: the account and progress live
in that browser only, and the top bar says "Local only". Everything else is
identical.

---

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (free tier is plenty).
2. **New project**. Pick any name, any region near you, and set a database
   password — that is the *database* password, not your login; save it
   somewhere but you will rarely need it.
3. Wait about a minute for it to finish provisioning.

---

## 3. Create the tables

1. In your project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the
   whole file, paste it in, and press **Run**.

You should see `Success. No rows returned`. That created:

- `profiles` — one row per account
- `progress` — one row per (person, track, difficulty), with the resume point
- Row Level Security policies, so nobody can read anybody else's progress

It is safe to run the file again later.

---

## 4. Turn off the confirmation email

**This is the step you asked about, and it is not optional.**

1. **Authentication** → **Sign In / Providers** → **Email**
2. Turn **Confirm email** *off*
3. Leave **Allow new users to sign up** *on* for now
4. **Save**

Without this, Supabase creates the account but refuses to sign the person in
until they click a link in an email that often never arrives. With it off,
creating an account signs you straight in.

> Once you and your friends have all made accounts, come back and switch
> **Allow new users to sign up** *off*. Existing accounts keep working and
> nobody else can join.

---

## 5. Paste your two keys in

1. **Project Settings** (the gear) → **API**
2. Copy **Project URL** and the **anon** / **public** key

Then edit [`src/lib/supabaseConfig.ts`](src/lib/supabaseConfig.ts) and replace
the two placeholders:

```ts
export const SUPABASE_URL = 'https://abcdefghijklm.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

That is it — those values are committed, so the app works everywhere with no
further setup: clone it, deploy it, and it connects.

Restart the dev server (`Ctrl+C`, then `npm run dev`). The pill in the top bar
should now say **Saved to cloud**.

### If you would rather not commit them

A `.env` file wins over the committed values, so you can leave the
placeholders alone and do this instead:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

`.env` is gitignored. When deploying, add the same two names as environment
variables in your host's dashboard.

### Is the anon key safe to have in the repo?

Largely, yes — and it is worth understanding exactly why.

The anon key is the **public** key. It is designed to sit inside browser apps,
and **anyone who visits your deployed site can read it out of the JavaScript
bundle** whether or not you commit it. So committing it changes very little
about who can obtain it.

What actually protects the data is **Row Level Security**, which the schema
switches on for every table: each account can only ever read and write its own
rows, and holding the key does not change that.

What the key *does* allow is **creating an account**. If you want to stop that
once you and your friends have registered, it is one toggle and no code
change: Authentication → Sign In / Providers → Email → turn *Allow new users
to sign up* **off**. Existing accounts keep working.

**Never** commit the `service_role` key. That one bypasses every security rule
and belongs only on a server.

---

## 6. Check it works

1. Create an account (any email — no confirmation needed, and nothing is sent)
2. Answer one question in Python → Beginner
3. In Supabase, **Table Editor** → `progress`. There is your row.
4. Open the site in a private window, sign in with the same account — it
   resumes at the same step.

---

## 7. Put it on the internet

The app is a static site, so this is free on any of these.

Because the keys are committed in `supabaseConfig.ts`, there is nothing to
configure on the host — just deploy.

### GitHub Pages (no signup, already wired up)

`.github/workflows/deploy.yml` builds and publishes on every push. You only
have to switch it on once:

**Settings** → **Pages** → **Build and deployment** → **Source** →
**GitHub Actions**

Then push anything (or **Actions** → *Deploy to GitHub Pages* → **Run
workflow**) and it appears at:

```
https://jack-o-vscode.github.io/learncode/
```

The workflow builds with `BASE_PATH=/learncode/`, because Pages serves a
project site from a subpath rather than the root, and copies `index.html` to
`404.html` so that deep links like `/learncode/track/python/beginner` still
work — Pages has no rewrite rules, so it serves `404.html` for any path
without a file, and the app boots from there and reads the URL.

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Cloudflare Pages / GitHub Pages

Build command `npm run build`, output directory `dist`.

> If you chose the `.env` route instead of committing the keys, add
> `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in
> the host's dashboard and redeploy.

> **One thing to configure on any host:** this is a single-page app, so all
> routes must serve `index.html`. Vercel and Netlify do this automatically for
> Vite projects. On other hosts, add a rewrite of `/*` → `/index.html`.

Once it is on https, it can be installed as an app — see the **Install** page
inside the site, or the README.

---

## Troubleshooting

**"Supabase is still set to require email confirmation"**
Step 4. Turn *Confirm email* off, then sign in normally.

**"New sign-ups are switched off in Supabase"**
Authentication → Sign In / Providers → Email → enable *Allow new users to sign up*.

**Top bar says "Local only" after adding keys**
Restart the dev server — it reads config at startup. Check that
`src/lib/supabaseConfig.ts` no longer contains `YOUR-PROJECT-REF`. If you used
`.env` instead, check the file is called exactly `.env`, sits next to
`package.json`, and that the variable names start with `VITE_` (Vite only
exposes variables with that prefix).

**Top bar says "Saved on device"**
The app reached for Supabase and could not get there. Check your connection and
that the URL is right. Nothing is lost — progress is kept locally and pushed up
automatically as soon as it reconnects.

**Progress is not syncing between devices**
Make sure both are signed in as the same account, and that step 3 ran without
errors. Table Editor → `progress` will show you whether rows are arriving.

**A permissions error in the browser console**
The RLS policies did not get created. Re-run `supabase/schema.sql`.
