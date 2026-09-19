# LearnCode

A complete course for learning **Python**, **HTML** and **C++** from absolute
zero, built as an installable app for **iPhone** and **Windows**.

Every lesson follows the same loop:

> **read** a short explanation → **study** a worked sample → **answer** a question

Your place is saved to the cloud **after every single answer**, so you can stop
halfway through a level on your phone and pick it up on your PC at exactly the
step you left.

---

## What is in it

**240 lessons across four tracks, each with five difficulties.**

| Track | Beginner | Amateur | Intermediate | Skilled | Pro |
| --- | --- | --- | --- | --- | --- |
| **Python** | first lines of code | lists & loops | functions, files, errors | classes, generators, testing | the data model, async, packaging |
| **HTML** | first web pages | CSS, semantics, forms | layout, responsive, a11y | JavaScript & the DOM | rendering pipeline, PWAs, security |
| **C++ · Normal** | compilers & variables | loops, functions, vectors | memory, structs, classes | RAII, templates, polymorphism | value categories, concurrency, UB |
| **C++ · OpenGL** | window & first triangle | shapes, uniforms, refactoring | textures, matrices, 3D camera | lighting, framebuffers, instancing | deferred, PBR, compute, GPU-driven |

**Beginner assumes you have never written a line of code in your life** — it
starts at "what a program is" and "how to install Python".

C++ is the only language with two modes. You pick **Normal** or **OpenGL**
before choosing a difficulty. OpenGL mode teaches exactly the same language,
but every idea produces something you can see on screen — by the end of
Beginner you have a triangle, and by the end of Intermediate you are flying a
camera through a 3D scene.

---

## Quick start

```bash
npm install
npm run dev
```

It works straight away in **local mode** (accounts and progress stored in that
browser). To sync across devices, follow **[SETUP.md](SETUP.md)** — it takes
about ten minutes and is mostly clicking things in the Supabase dashboard.

---

## Install it as an app

It is a Progressive Web App, so it installs from the browser with no app store.

**iPhone / iPad** — open the site in **Safari** → tap **Share** → **Add to
Home Screen**.

**Windows** — open it in **Edge** or **Chrome** → click the **install icon** in
the address bar (or ⋯ → Apps → Install this site as an app). You get a Start
menu entry and a proper app window.

**Android** — Chrome offers an "Install app" banner.

Installation needs `https`, which you get automatically on Vercel, Netlify or
Cloudflare Pages. There is an **Install** page inside the app with the same
instructions.

Lessons are cached, so the whole course works with no signal. Answers sync to
the cloud as soon as you are back online.

---

## How progress works

Progress is written **twice** on every answer:

- to `localStorage`, synchronously — so the app is instant and works offline
- to a `progress` row in Supabase — so it follows you between devices

On sign-in the two are merged by *keep the most progress*, never by
overwriting, so an offline session on your phone can never wipe out what you
did on your PC. If a save fails, it is retried on the next answer and when the
connection returns.

The pill in the top bar tells you which state you are in: **Saved to cloud**,
**Saving…**, **Saved on device** (offline, will sync) or **Local only** (no
Supabase keys configured).

---

## Accounts

Sign-in is by email and password, stored in your own Supabase project's
`auth.users` table — Dashboard → Authentication → Users.

The password is stored as a **bcrypt hash**, not as plain text. That is
deliberate: if the database ever leaked, plaintext passwords would give an
attacker the real password for every one of your friends, and people reuse
passwords across sites. Hashing changes nothing about how signing in works and
makes a leaked database worthless.

There is **no confirmation email** — [SETUP.md](SETUP.md) step 4 turns that
off, and the app detects and explains it if the setting is still on. Once
everybody has an account you can switch sign-ups off entirely so nobody else
can join.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run icons` | Regenerate the app icons |
| `npm run verify-content` | Check every lesson, and that each question's own answer passes its grader |

`npm run verify-content` is worth knowing about if you edit the lessons: it
catches duplicate step ids, out-of-range answers, markdown that will not
render, and — most usefully — any `code` question whose grading pattern does
not match its own published solution.

---

## How it is built

- **React + TypeScript + Vite** — no framework beyond that
- **`vite-plugin-pwa`** for the manifest and service worker
- **Supabase** for auth and progress
- **No UI library, no CSS framework** — one hand-written stylesheet
- **No syntax-highlighting library** — a small tokeniser in `src/lib/highlight.ts`

```
src/
  content/           the course — one file per track per difficulty
    python/ html/ cpp/ cpp-gl/
  lib/               auth, progress sync, grading, highlighting
  components/        CodeBlock, Markdown, QuestionCard, ProgressBar
  pages/             auth, home, C++ mode, levels, lesson, profile, install
supabase/schema.sql  tables, constraints and row level security
scripts/             icon generation, content verification
```

Lessons are plain TypeScript data, so adding one is adding an object to an
array — no build step, no CMS, and the compiler checks the shape.

---

## Adding your own lessons

Open any file under `src/content/`, copy a step, and change it:

```ts
{
  id: 'py-b-13',            // must be unique across the whole course
  title: 'Something new',
  read: `Markdown-lite: ## headings, **bold**, \`code\`, - lists, > callouts`,
  sample: {
    lang: 'python',
    caption: 'What to look at',
    code: `print("hello")`,
    output: `hello`,
  },
  question: {
    kind: 'mcq',            // or 'fill' (typed answer) or 'code' (write code)
    prompt: 'What does it print?',
    options: ['hello', 'goodbye'],
    answer: 0,
    explain: 'Because that is the argument to print.',
    hint: 'Read the string.',
  },
}
```

Then run `npm run verify-content`. Never renumber an existing `id` — progress
is keyed on it.
