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

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart the dev server (`Ctrl+C`, then `npm run dev`). The pill in the top bar
should now say **Saved to cloud**.

### Is the anon key safe to publish?

Yes. It is designed to ship inside browser apps — it only says "a request is
coming from this project". What actually protects the data is Row Level
Security, which the schema turns on for every table.

**Never** put the `service_role` key in this file. That one bypasses every
security rule.

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

### Vercel

```bash
npm install -g vercel
vercel
```

Then in the Vercel dashboard → **Settings** → **Environment Variables**, add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and redeploy.

### Netlify

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

Add the same two variables under **Site settings** → **Environment variables**.

### Cloudflare Pages / GitHub Pages

Build command `npm run build`, output directory `dist`. Add the two variables
in the project settings.

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
The dev server reads `.env` at startup — restart it. Check the file is called
exactly `.env`, sits next to `package.json`, and that the variable names start
with `VITE_` (Vite only exposes variables with that prefix).

**Top bar says "Saved on device"**
The app reached for Supabase and could not get there. Check your connection and
that the URL is right. Nothing is lost — progress is kept locally and pushed up
automatically as soon as it reconnects.

**Progress is not syncing between devices**
Make sure both are signed in as the same account, and that step 3 ran without
errors. Table Editor → `progress` will show you whether rows are arriving.

**A permissions error in the browser console**
The RLS policies did not get created. Re-run `supabase/schema.sql`.
