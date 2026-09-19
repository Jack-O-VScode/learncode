import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Layout, responsiveness and accessibility',
  summary:
    'The level where your pages start looking professional: Flexbox, Grid, media queries, positioning, transitions, custom properties, dark mode and the accessibility rules that actually matter.',
  outcomes: [
    'Lay out anything with Flexbox and CSS Grid',
    'Build pages that work on a phone and a 27-inch monitor',
    'Choose the right unit for every job',
    'Position elements, and understand stacking',
    'Add transitions and hover states that feel good',
    'Support dark mode and meet accessibility basics',
  ],
  steps: [
    {
      id: 'html-i-01',
      title: 'Flexbox: one dimension at a time',
      read: `Flexbox lays children out along **one axis** — a row or a column. It is the right tool for navbars, toolbars, card footers, and centring.

\`\`\`css
.row {
  display: flex;
  gap: 1rem;
}
\`\`\`

That one line turns the children into a row. \`gap\` adds space between them — and unlike margins, no leftover space at the ends.

## On the container

- \`flex-direction\` — \`row\` (default) | \`column\` | \`row-reverse\`
- \`justify-content\` — spacing along the **main** axis: \`flex-start\`, \`center\`, \`space-between\`, \`space-around\`, \`space-evenly\`
- \`align-items\` — alignment on the **cross** axis: \`stretch\` (default), \`center\`, \`flex-start\`, \`baseline\`
- \`gap\`

## The mental model

Main axis follows \`flex-direction\`. Set \`flex-direction: column\` and \`justify-content\` now controls **vertical** spacing while \`align-items\` controls horizontal. Nearly every Flexbox confusion is forgetting this swap.

## Perfect centring, finally

\`\`\`css
display: flex;
justify-content: center;
align-items: center;
\`\`\`

Three lines. This used to take absolute positioning and negative margins.`,
      sample: {
        lang: 'css',
        caption: 'The four layouts you will build over and over',
        code: `/* a navbar: logo left, links right */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.navbar nav ul {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* dead-centre, both axes */
.hero {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  text-align: center;
}

/* a media object: fixed avatar, text takes the rest */
.comment {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.comment img { flex: 0 0 48px; }
.comment .body { flex: 1; }

/* footer pinned to the bottom of a card of any height */
.card {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}
.card .content { flex: 1; }`,
        output: `navbar   -> [Logo]              Home  About  Contact
hero     -> content centred horizontally and vertically
comment  -> [48px avatar] text that wraps and fills the rest
card     -> content grows, footer always sits at the bottom`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'With `flex-direction: column`, which property controls **vertical** spacing between the items?',
        options: ['`align-items`', '`justify-content`', '`vertical-align`', '`align-content`'],
        answer: 1,
        explain:
          '`justify-content` always works along the main axis, and `flex-direction: column` makes the main axis vertical. `align-items` then controls horizontal alignment. The two swap the moment you change direction.',
        hint: 'Which axis does `flex-direction` set?',
      },
    },

    {
      id: 'html-i-02',
      title: 'Flexbox: sizing, growing and wrapping',
      read: `## The flex shorthand

On a **child**, \`flex\` is three values in one:

\`\`\`css
flex: <grow> <shrink> <basis>;
\`\`\`

- **grow** — share of leftover space to absorb (0 = do not grow)
- **shrink** — willingness to shrink when space is tight (1 = yes)
- **basis** — starting size before growing or shrinking

The ones worth memorising:

- \`flex: 1\` → \`1 1 0\` — "take an equal share of the space". Two siblings with \`flex: 1\` end up equal width *regardless of content*.
- \`flex: auto\` → \`1 1 auto\` — grow, but start from content size, so bigger content gets more room
- \`flex: none\` → \`0 0 auto\` — never grow or shrink. Perfect for icons and avatars.
- \`flex: 0 0 200px\` — exactly 200px, always

## Wrapping

By default flex items refuse to wrap and squash instead. \`flex-wrap: wrap\` lets them move to a new line. Combined with a basis, that gives a responsive grid with no media queries:

\`\`\`css
.cards { display: flex; flex-wrap: wrap; gap: 1rem; }
.cards > * { flex: 1 1 260px; }
\`\`\`

Each card wants at least 260px; as many fit per row as will, and the last row stretches to fill.

## align-self and order

\`align-self\` overrides \`align-items\` for one child. \`order\` moves an item visually — but it does **not** change the DOM order, so keyboard and screen-reader users still get the original sequence. Use it sparingly.`,
      sample: {
        lang: 'html',
        caption: 'A responsive card row with no media queries at all',
        code: `<div class="cards">
  <article class="card">Short</article>
  <article class="card">A much longer card with a lot more text in it</article>
  <article class="card">Middling amount</article>
</div>

<style>
  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  /* grow, shrink, and never go below 260px before wrapping */
  .card {
    flex: 1 1 260px;
    padding: 1rem;
    background: #f4f4f5;
    border-radius: 12px;
  }

  /* a toolbar: fixed button, flexible search, fixed avatar */
  .toolbar { display: flex; gap: 0.75rem; align-items: center; }
  .toolbar .back   { flex: none; }
  .toolbar .search { flex: 1; }
  .toolbar .avatar { flex: 0 0 32px; align-self: flex-start; }
</style>`,
        output: `Wide screen  -> [Short] [A much longer card...] [Middling amount]   (equal widths)
Medium       -> [Short] [A much longer card...]
                [Middling amount                                    ]
Phone        -> each card on its own full-width row`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Two sibling flex items both have `flex: 1`. One contains a single word, the other a long paragraph. How wide is each?',
        options: [
          'The paragraph one is wider, because it has more content',
          'Both exactly the same width, because `flex: 1` means basis 0 and an equal share of all space',
          'The single word one is wider',
          'It depends on the container',
        ],
        answer: 1,
        explain:
          '`flex: 1` expands to `1 1 0` — a zero starting size, so *all* the width is leftover space and it splits evenly. Use `flex: auto` (`1 1 auto`) instead when you want content size to influence the share.',
        hint: 'What is the `basis` in the `flex: 1` shorthand?',
      },
    },

    {
      id: 'html-i-03',
      title: 'CSS Grid: two dimensions at once',
      read: `Flexbox handles a row or a column. **Grid** handles rows and columns together — page layouts, image galleries, dashboards, anything where things must line up both ways.

\`\`\`css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  gap: 1rem;
}
\`\`\`

## fr — the fraction unit

\`1fr\` means "one share of the free space". \`1fr 2fr\` gives the second column twice the first, after any fixed columns are subtracted. It exists only in Grid and it removes all the percentage-minus-gutter arithmetic that used to be necessary.

## repeat() and auto-fit

\`\`\`css
grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
\`\`\`

Read it as: *"as many columns as fit, each at least 240px, sharing the space equally."* That single line is a fully responsive gallery with no media query. It is probably the most useful line in modern CSS.

## Placing items

\`grid-column: 1 / 3\` spans from line 1 to line 3 (two columns). \`grid-column: span 2\` is often clearer. Named areas are clearer still:

\`\`\`css
grid-template-areas:
  "header header"
  "sidebar main"
  "footer footer";
\`\`\`

Then \`grid-area: sidebar\` on the element. The CSS becomes a picture of the layout.

## Which one?

**Grid for the page, Flexbox for the components inside it.** They are designed to be used together.`,
      sample: {
        lang: 'css',
        caption: 'Named areas for the page, auto-fit for a gallery',
        code: `.layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: 220px 1fr;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100vh;
}

.layout > header  { grid-area: header; }
.layout > aside   { grid-area: sidebar; }
.layout > main    { grid-area: main; }
.layout > footer  { grid-area: footer; }

/* one column on narrow screens */
@media (max-width: 40rem) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}

/* a responsive gallery — no media query needed */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

/* let one item span two columns and two rows */
.gallery .featured {
  grid-column: span 2;
  grid-row: span 2;
}`,
        output: `Desktop:  ┌─────────────────────────┐
          │        header           │
          ├────────┬────────────────┤
          │sidebar │     main       │
          ├────────┴────────────────┤
          │        footer           │
          └─────────────────────────┘
Phone:    header / main / sidebar / footer, stacked.
Gallery:  4 columns at 1200px, 2 at 600px, 1 at 320px — automatically.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `repeat(auto-fit, minmax(240px, 1fr))` do?',
        options: [
          'Creates exactly 240 columns',
          'Fits as many columns as possible at 240px minimum each, sharing leftover space equally — reflowing automatically as the window resizes',
          'Creates one column that is between 240px and 1fr wide',
          'Repeats the first column 240 times',
        ],
        answer: 1,
        explain:
          '`auto-fit` decides the column count from the available width, and `minmax(240px, 1fr)` sets each column’s floor and lets it grow to share the space. It replaces a stack of media queries with one declaration.',
        hint: 'Read `minmax` as "at least, at most".',
      },
    },

    {
      id: 'html-i-04',
      title: 'Units: px, rem, em, %, vh, ch',
      read: `Choosing units well removes most responsive bugs before they happen.

## Absolute

- **px** — a fixed device pixel. Right for hairline borders and small fixed offsets. Wrong for font sizes: it ignores a user who has enlarged their default text.

## Relative to font size

- **rem** — relative to the **root** font size (16px by default). Predictable everywhere. **Use this for font sizes, spacing and breakpoints.**
- **em** — relative to the **current element's** font size. Handy inside a component (padding that scales with its own text), but it compounds through nesting, which surprises people.

## Relative to the container

- **%** — of the parent. Note \`padding: 5%\` and \`margin: 5%\` are both relative to the parent's **width**, even vertically.

## Relative to the viewport

- **vw / vh** — 1% of viewport width/height. \`100vh\` is the classic full-screen hero — but on mobile it is famously wrong because of the address bar, so prefer **\`100dvh\`** (dynamic viewport height).
- **vmin / vmax** — of the smaller/larger dimension.

## Relative to content

- **ch** — the width of a "0". \`max-width: 65ch\` is the single best readability rule there is.

## clamp()

\`\`\`css
font-size: clamp(1.5rem, 4vw, 3rem);
\`\`\`

Minimum, preferred, maximum. Fluid typography with no breakpoints at all.`,
      sample: {
        lang: 'css',
        caption: 'A unit choice for every job',
        code: `html { font-size: 100%; }           /* respect the user's setting */

body {
  font-size: 1rem;
  line-height: 1.6;
  max-width: 65ch;                   /* comfortable measure */
  margin-inline: auto;
  padding-inline: 1.25rem;
}

h1 { font-size: clamp(1.75rem, 5vw, 3rem); }

.card {
  padding: 1.5rem;                   /* rem: consistent everywhere */
  border: 1px solid #ddd;            /* px: a hairline is a hairline */
  border-radius: 0.75rem;
}

.badge {
  font-size: 0.8rem;
  padding: 0.35em 0.8em;             /* em: scales with the badge's own text */
  border-radius: 999px;
}

.hero {
  min-height: 100dvh;                /* dvh, not vh — mobile address bars */
  display: grid;
  place-items: center;
}

.sidebar { width: 30%; }             /* % of the parent */`,
        output: `A user who sets their browser font to 20px gets everything scaled up
proportionally, because sizes are in rem — except the 1px borders,
which stay crisp hairlines.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why prefer `rem` over `px` for font sizes?',
        options: [
          'rem renders more sharply',
          'rem scales with the user’s browser font-size setting, so people who need larger text actually get it',
          'px is deprecated',
          'rem is faster to parse',
        ],
        answer: 1,
        explain:
          'A `px` font size is fixed and silently overrides the accessibility setting someone chose deliberately. `rem` is a multiple of the root size, so the whole page scales with their preference. This is one of the most common real accessibility failures on the web.',
        hint: 'What happens when someone sets their default font size to 24px?',
      },
    },

    {
      id: 'html-i-05',
      title: 'Media queries and responsive design',
      read: `A media query applies CSS only when a condition holds:

\`\`\`css
@media (min-width: 48rem) {
  .layout { grid-template-columns: 220px 1fr; }
}
\`\`\`

## Mobile first

Write the small-screen styles as the base, then use \`min-width\` queries to **add** complexity as space allows. The alternative (\`max-width\`, desktop first) means constantly undoing rules, and it sends phones — the least powerful devices — the most CSS.

## Choose breakpoints from your content

Do not copy device sizes; they change every year. Widen the window until your layout looks bad, and put a breakpoint there. Most sites need two or three, not eight.

Use \`rem\` in breakpoints so they respond to font-size changes too.

## Other useful queries

- \`@media (prefers-color-scheme: dark)\` — dark mode
- \`@media (prefers-reduced-motion: reduce)\` — **always** honour this; motion makes some people genuinely ill
- \`@media print\` — printed pages
- \`@media (hover: hover)\` — only apply hover effects on devices that really hover

## Container queries

\`@container\` responds to a **parent's** width rather than the viewport, so a component can adapt to where it is placed rather than how big the screen is. Supported everywhere modern, and the better tool for reusable components.`,
      sample: {
        lang: 'css',
        caption: 'Mobile-first, with reduced motion and dark mode honoured',
        code: `/* base: phone */
.layout { display: grid; gap: 1rem; grid-template-columns: 1fr; }
.nav-links { display: none; }
.menu-button { display: block; }
h1 { font-size: 1.75rem; }

/* tablet and up */
@media (min-width: 48rem) {
  .layout { grid-template-columns: 220px 1fr; }
  .nav-links { display: flex; gap: 1.5rem; }
  .menu-button { display: none; }
  h1 { font-size: 2.5rem; }
}

/* desktop */
@media (min-width: 72rem) {
  .layout { grid-template-columns: 240px 1fr 260px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

@media (hover: hover) {
  .card:hover { transform: translateY(-2px); }
}

/* container query: this card adapts to its own box, not the window */
.card-wrap { container-type: inline-size; }

@container (min-width: 30rem) {
  .card { display: grid; grid-template-columns: 120px 1fr; gap: 1rem; }
}`,
        output: `320px  -> single column, hamburger button, 1.75rem heading
768px  -> sidebar appears, inline nav links, 2.5rem heading
1152px -> three columns
A card in a narrow sidebar stays stacked even on a huge screen,
because the container query asks about the card's box, not the window.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is mobile-first (`min-width` queries) the recommended approach?',
        options: [
          'Phones are more common than desktops',
          'The base styles stay simple and each query only *adds* complexity, instead of a pile of rules undoing each other',
          '`max-width` queries are deprecated',
          'It produces smaller HTML',
        ],
        answer: 1,
        explain:
          'Desktop-first means writing a complex layout and then unwinding it for small screens — more code, more specificity fights, and the heaviest CSS delivered to the weakest devices. Mobile-first is additive and reads in the order the layout grows.',
        hint: 'Think about whether each query adds rules or cancels them.',
      },
    },

    {
      id: 'html-i-06',
      title: 'Position and stacking',
      read: `\`position\` takes an element out of (or nudges it within) the normal flow.

- **\`static\`** — the default. \`top\`/\`left\` do nothing.
- **\`relative\`** — offset from where it *would* have been, and **its original space is kept**. Its real job is to become a positioning context for absolute children.
- **\`absolute\`** — removed from the flow, positioned against the nearest **positioned ancestor** (anything that is not \`static\`). Forget to set \`position: relative\` on the parent and it escapes all the way to the page.
- **\`fixed\`** — positioned against the viewport; stays put while the page scrolls.
- **\`sticky\`** — normal until it hits the threshold you set, then sticks. Needs a \`top\` (or similar) value, **and** a parent that does not have \`overflow: hidden\`. Those two omissions account for almost every "sticky doesn't work" question.

## z-index

Controls what is drawn on top — but **only within the same stacking context**, and only on positioned elements.

A new stacking context is created by \`position\` + \`z-index\`, and also by \`transform\`, \`opacity < 1\`, \`filter\` and \`will-change\`. That is why \`z-index: 9999\` sometimes still loses: the element is trapped inside an ancestor's context. The fix is to move the element, not to raise the number.

Keep a small scale (10, 20, 30) written down once, rather than escalating to 99999.`,
      sample: {
        lang: 'css',
        caption: 'A badge on a card, a sticky header, and a modal that actually sits on top',
        code: `/* badge pinned to the corner of a card */
.card {
  position: relative;       /* the positioning context */
  overflow: hidden;
}
.card .badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
}

/* header that sticks once you scroll past it */
.site-header {
  position: sticky;
  top: 0;                   /* required, or it never sticks */
  z-index: 20;
  background: white;
}

/* full-screen overlay */
.modal-backdrop {
  position: fixed;
  inset: 0;                 /* top/right/bottom/left all 0 */
  background: rgb(0 0 0 / 50%);
  z-index: 100;
  display: grid;
  place-items: center;
}

/* a documented scale beats escalating numbers */
:root {
  --z-dropdown: 10;
  --z-header: 20;
  --z-modal: 100;
  --z-toast: 200;
}`,
        output: `badge  -> sits in the card's top-right corner
header -> scrolls normally, then pins to the top of the window
modal  -> covers everything, centred, above the header`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You set `position: absolute; top: 0; right: 0` on a badge and it jumps to the top-right of the *page* instead of its card. Why?',
        options: [
          'Absolute positioning always uses the page',
          'No ancestor is positioned, so it fell back to the initial containing block — the card needs `position: relative`',
          '`top` and `right` cannot be combined',
          'The z-index is too low',
        ],
        answer: 1,
        explain:
          'An absolutely positioned element looks up the tree for the nearest ancestor whose `position` is not `static`. Finding none, it uses the page. `position: relative` on the card creates that context without moving the card at all.',
        hint: 'What is absolute positioning measured against?',
      },
    },

    {
      id: 'html-i-07',
      title: 'Backgrounds, borders, shadows and gradients',
      read: `## Backgrounds

\`background\` is shorthand for colour, image, position, size and repeat:

\`\`\`css
background: url("hero.jpg") center / cover no-repeat;
\`\`\`

\`cover\` fills the box, cropping as needed; \`contain\` fits it all in, possibly leaving gaps. You can layer several backgrounds, comma-separated, first on top.

## Borders and radius

\`border: 1px solid #ddd\`. \`border-radius\` takes one value for all corners, or four. \`border-radius: 50%\` on a square gives a circle; \`999px\` gives a pill.

## Shadows

\`\`\`css
box-shadow: 0 1px 3px rgb(0 0 0 / 12%);
\`\`\`

x, y, blur, colour. The trick to shadows that look real: **layer two or three**, all subtle, with increasing blur. One big dark shadow always looks cheap.

\`inset\` puts it inside the box. \`text-shadow\` is the same idea for text.

## Gradients

\`linear-gradient(to bottom, #fff, #eee)\` — an image, so it goes in \`background\`, not \`background-color\`. Also \`radial-gradient\` and \`conic-gradient\`.

Tip for a smooth fade: interpolate through \`transparent\` carefully — in some colour spaces it passes through grey. \`rgb(0 0 0 / 0)\` avoids the muddy middle.`,
      sample: {
        lang: 'css',
        caption: 'Layered shadows and a text-on-image overlay that stays readable',
        code: `.card {
  background: white;
  border: 1px solid hsl(220 15% 90%);
  border-radius: 14px;
  /* three subtle layers read as one soft, believable shadow */
  box-shadow:
    0 1px 2px rgb(16 24 40 / 6%),
    0 4px 8px rgb(16 24 40 / 5%),
    0 12px 24px rgb(16 24 40 / 4%);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;          /* crop, do not squash */
}

.hero {
  /* dark overlay first, photo underneath: text stays readable */
  background:
    linear-gradient(rgb(0 0 0 / 55%), rgb(0 0 0 / 25%)),
    url("hero.jpg") center / cover no-repeat;
  color: white;
  padding: 6rem 1.5rem;
}

.divider {
  height: 1px;
  background: linear-gradient(to right,
    rgb(0 0 0 / 0), rgb(0 0 0 / 15%), rgb(0 0 0 / 0));
  border: none;
}`,
        output: `card    -> crisp white panel with a soft, natural-looking shadow
avatar  -> perfect circle, image cropped rather than distorted
hero    -> photo dimmed just enough that white text is legible
divider -> a hairline that fades out at both ends`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `object-fit: cover` do to an `<img>` with a fixed width and height?',
        options: [
          'Stretches the image to fill the box, distorting it',
          'Scales the image to fill the box and crops the overflow, keeping the aspect ratio',
          'Shrinks the image until it fits, leaving gaps',
          'Repeats the image to fill the box',
        ],
        answer: 1,
        explain:
          '`cover` preserves the aspect ratio and crops. Without it, a fixed width and height squash the image. `contain` is the other useful value: it fits the whole image inside, leaving empty space.',
        hint: 'Compare with `background-size: cover`.',
      },
    },

    {
      id: 'html-i-08',
      title: 'Transitions, transforms and motion',
      read: `## Transitions

A transition animates a property when its value changes:

\`\`\`css
.button {
  background: #2563eb;
  transition: background 150ms ease, transform 150ms ease;
}
.button:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}
\`\`\`

The transition goes on the **base** state, not the hover — otherwise it animates in and snaps back out.

**Never write \`transition: all\`.** It animates properties you did not intend, including ones that are expensive.

## Transforms

\`translate()\`, \`scale()\`, \`rotate()\`, \`skew()\`. Transforms do not affect layout — nothing else moves — which is exactly why they are cheap.

## Animate only these two

\`transform\` and \`opacity\` can be handled entirely by the GPU. Animating \`width\`, \`height\`, \`top\`, \`margin\` or \`left\` forces the browser to re-run layout on **every frame**, which is what janky animation actually is.

Need a growing box? Animate \`transform: scaleY()\`. Need to move something? \`translate\`, not \`left\`.

## Keyframes

\`@keyframes\` for multi-step or looping animation, applied with the \`animation\` property.

## Always respect the preference

Wrap motion in \`@media (prefers-reduced-motion: no-preference)\`, or disable it under \`reduce\`. For some people, motion causes real nausea and migraines.`,
      sample: {
        lang: 'css',
        caption: 'Cheap, well-behaved motion',
        code: `.button {
  background: hsl(221 83% 53%);
  transform: translateY(0);
  transition: background 150ms ease, transform 150ms ease, box-shadow 150ms ease;
}
.button:hover {
  background: hsl(221 83% 45%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgb(37 99 235 / 30%);
}
.button:active { transform: translateY(0); }

.card { transition: transform 200ms ease; }
.card:hover { transform: scale(1.02); }

@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: no-preference) {
  .reveal { animation: fade-up 400ms ease both; }
}

@keyframes spin { to { transform: rotate(360deg); } }
.spinner { animation: spin 800ms linear infinite; }

/* focus must always be visible, even with fancy hover states */
.button:focus-visible {
  outline: 3px solid hsl(221 83% 70%);
  outline-offset: 2px;
}`,
        output: `Hovering the button lifts it 2px with a coloured glow; pressing pushes it back.
Cards grow 2% on hover. Content fades up on reveal — unless the visitor has
asked their OS to reduce motion, in which case it simply appears.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why animate `transform: translateX(100px)` instead of `left: 100px`?',
        options: [
          'It is shorter to write',
          '`transform` is composited on the GPU without re-running layout, so it stays at 60fps; animating `left` forces layout every frame',
          '`left` only works on positioned elements',
          'There is no difference',
        ],
        answer: 1,
        explain:
          'Changing `left` makes the browser recalculate positions and repaint on every frame. `transform` and `opacity` skip layout and paint entirely and are handed to the compositor. This is the single biggest performance rule in CSS animation.',
        hint: 'Which one changes where other elements sit?',
      },
    },

    {
      id: 'html-i-09',
      title: 'Custom properties and dark mode',
      read: `**Custom properties** (CSS variables) are real values that live in the cascade, are inherited, and can be changed at runtime.

\`\`\`css
:root {
  --brand: hsl(221 83% 53%);
  --space: 1rem;
}

.button { background: var(--brand); padding: var(--space); }
\`\`\`

- Must start with \`--\`
- \`var(--name, fallback)\` supplies a default
- Because they **inherit**, redefining one on a container re-themes everything inside it

## Dark mode, two ways

**1. Follow the system:**

\`\`\`css
@media (prefers-color-scheme: dark) {
  :root { --bg: #0b1020; --ink: #e8ecf8; }
}
\`\`\`

**2. Let the user choose**, with a \`data-theme\` attribute on \`<html>\` that JavaScript toggles and stores.

The robust pattern combines both: follow the system by default, and let an explicit choice override it. Define colours **semantically** (\`--surface\`, \`--ink\`, \`--border\`) rather than literally (\`--white\`), or your dark theme ends up full of variables named \`--white\` holding black.

Also set \`color-scheme: light dark\` so form controls and scrollbars follow the theme too.`,
      sample: {
        lang: 'css',
        caption: 'Semantic tokens, system default, user override',
        code: `:root {
  color-scheme: light dark;

  --bg: hsl(0 0% 100%);
  --surface: hsl(220 20% 98%);
  --ink: hsl(222 30% 12%);
  --muted: hsl(222 12% 45%);
  --border: hsl(220 15% 88%);
  --brand: hsl(221 83% 53%);

  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --radius: 12px;
}

/* follow the operating system, unless the user picked light explicitly */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: hsl(222 35% 7%);
    --surface: hsl(222 28% 12%);
    --ink: hsl(220 25% 92%);
    --muted: hsl(220 12% 62%);
    --border: hsl(220 15% 22%);
    --brand: hsl(213 90% 62%);
  }
}

/* an explicit choice always wins */
:root[data-theme="dark"] {
  --bg: hsl(222 35% 7%);
  --surface: hsl(222 28% 12%);
  --ink: hsl(220 25% 92%);
  --muted: hsl(220 12% 62%);
  --border: hsl(220 15% 22%);
  --brand: hsl(213 90% 62%);
}

body { background: var(--bg); color: var(--ink); }
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3);
}

/* re-theme a whole subtree by redefining one variable */
.card.danger { --brand: hsl(0 72% 51%); --border: hsl(0 72% 80%); }`,
        output: `Light OS -> white page, dark text.
Dark OS  -> deep navy page, light text, a brighter brand blue for contrast.
Clicking the theme toggle sets data-theme on <html> and overrides either way.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why name a custom property `--surface` rather than `--white`?',
        options: [
          'Shorter names render faster',
          'The name should describe the role, not the value — in dark mode `--white` would hold a dark colour and the code would be lying',
          '`--white` is a reserved name',
          'There is no difference',
        ],
        answer: 1,
        explain:
          'Semantic names survive re-theming. `--surface: #111` reads perfectly in dark mode; `--white: #111` is actively confusing. The same reasoning applies to `--brand` over `--blue`.',
        hint: 'What happens to the name when the theme flips?',
      },
    },

    {
      id: 'html-i-10',
      title: 'Media: video, audio, iframes and responsive images',
      read: `## Video and audio

\`\`\`html
<video controls width="640" poster="thumb.jpg">
  <source src="clip.webm" type="video/webm">
  <source src="clip.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English" default>
  Your browser cannot play this video.
</video>
\`\`\`

Multiple \`<source>\`s let the browser pick a format it supports. Text between the tags is the fallback.

**Autoplay only works muted**, everywhere, on purpose. Always provide captions — for deaf users, and for the very many people watching with the sound off.

## iframes

Embeds another page: maps, videos, payment forms. Always set \`title\` (screen readers announce it), \`loading="lazy"\`, and a restrictive \`sandbox\`/\`allow\` list. An iframe runs someone else's code on your page, so treat it with suspicion.

## Responsive images

\`\`\`html
<img src="photo-800.jpg"
     srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1600.jpg 1600w"
     sizes="(max-width: 40rem) 100vw, 50vw"
     alt="...">
\`\`\`

\`srcset\` lists what exists, \`sizes\` tells the browser how big it will be displayed, and the browser picks — accounting for screen density too. \`<picture>\` goes further, letting you swap format or crop entirely per breakpoint.

\`loading="lazy"\` on below-the-fold images is one attribute for a large loading-speed win.`,
      sample: {
        lang: 'html',
        caption: 'Captioned video, a safe iframe, and art-directed images',
        code: `<video controls width="640" poster="poster.jpg" preload="metadata">
  <source src="clip.webm" type="video/webm">
  <source src="clip.mp4" type="video/mp4">
  <track kind="captions" src="captions-en.vtt" srclang="en"
         label="English" default>
  <p>Sorry — <a href="clip.mp4">download the video</a> instead.</p>
</video>

<iframe
  src="https://www.openstreetmap.org/export/embed.html"
  title="Map showing our office location"
  width="600" height="400"
  loading="lazy"
  referrerpolicy="no-referrer"
  sandbox="allow-scripts allow-same-origin"></iframe>

<picture>
  <source media="(max-width: 40rem)" srcset="hero-square.avif" type="image/avif">
  <source srcset="hero-wide.avif" type="image/avif">
  <source srcset="hero-wide.webp" type="image/webp">
  <img src="hero-wide.jpg"
       alt="A crowded market at sunrise"
       width="1600" height="900"
       loading="lazy" decoding="async">
</picture>`,
        output: `Phone  -> a square crop of the hero, in AVIF if supported
Desktop-> the wide version, AVIF > WebP > JPG depending on the browser
Video  -> plays with English captions available
Map    -> loads only when scrolled near, and cannot navigate your page`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does the `sizes` attribute tell the browser?',
        options: [
          'The file size of each image',
          'How wide the image will be *displayed* at a given viewport size, so it can choose the best file from `srcset` before CSS has been applied',
          'The dimensions to resize the image to',
          'Which image to preload',
        ],
        answer: 1,
        explain:
          'Images start downloading before the stylesheet is parsed, so the browser has no idea the image will be half-width. `sizes` tells it, letting it pick the smallest file that still looks sharp — including on high-density screens.',
        hint: 'The browser has to choose before it knows your CSS.',
      },
    },

    {
      id: 'html-i-11',
      title: 'Accessibility you must get right',
      read: `Accessibility is not a feature you add at the end. Most of it is doing the ordinary things correctly.

## The big six

1. **Semantic HTML.** A real \`<button>\` is focusable, keyboard-activatable and announced as a button. A \`<div onclick>\` is none of those, and fixing it takes four extra attributes.
2. **Keyboard access.** Tab through your page. Can you reach and activate everything? Is the focus ring visible? **Never** write \`outline: none\` without replacing it — use \`:focus-visible\`.
3. **Contrast.** 4.5:1 for body text, 3:1 for large text and UI borders. Grey-on-white placeholder text usually fails.
4. **Alt text.** Meaningful for content images, \`alt=""\` for decoration.
5. **Labels.** Every form control needs a real \`<label>\`.
6. **Do not convey by colour alone.** A red border is invisible to a colour-blind user; add an icon or text.

## ARIA

\`aria-label\`, \`aria-describedby\`, \`aria-expanded\`, \`role\`. Powerful, and easy to make things worse with.

> **The first rule of ARIA is: do not use ARIA.** If a native element does the job, use it. Bad ARIA is worse than none, because it overrides what the browser already knew.

## Test it in five minutes

Unplug your mouse and use the page. Run Lighthouse in devtools. Zoom to 200%. Try the browser's reader mode. Each of those finds different, real problems.`,
      sample: {
        lang: 'html',
        caption: 'The same control, done wrong and done right',
        code: `<!-- WRONG: not focusable, not announced, keyboard cannot use it -->
<div class="btn" onclick="save()">Save</div>

<!-- RIGHT -->
<button type="button" onclick="save()">Save</button>

<!-- icon-only button needs an accessible name -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" width="16" height="16"><!-- x icon --></svg>
</button>

<!-- a link to skip past the navigation -->
<a class="skip-link" href="#main">Skip to main content</a>

<!-- error that is not signalled by colour alone -->
<div class="field">
  <label for="email">Email address</label>
  <input type="email" id="email" name="email"
         aria-describedby="email-error" aria-invalid="true">
  <p id="email-error" class="error">
    <span aria-hidden="true">⚠</span> Enter a valid email address.
  </p>
</div>

<style>
  /* never remove focus styling without replacing it */
  :focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }

  .skip-link {
    position: absolute;
    left: -9999px;
  }
  .skip-link:focus {
    left: 1rem;
    top: 1rem;
    background: white;
    padding: 0.75rem 1rem;
    z-index: 999;
  }
</style>`,
        output: `Tab once on page load -> "Skip to main content" appears and is focused.
The close button announces as "Close dialog, button".
The email error is announced with the field, and marked with an icon
as well as red, so colour-blind users see it too.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `<button>` better than `<div onclick="...">` for a clickable control?',
        options: [
          'It is shorter to type',
          'It is focusable by keyboard, activates on Enter and Space, and is announced as a button — all of which a div lacks',
          'Divs cannot have click handlers',
          'Buttons are styled better by default',
        ],
        answer: 1,
        explain:
          'A native button brings focusability, keyboard activation, the correct accessibility role and the right behaviour inside forms, for free. Reproducing all of that on a div takes `tabindex`, `role`, and keydown handlers for two keys — and people usually forget at least one.',
        hint: 'Try reaching the div with the Tab key.',
      },
    },

    {
      id: 'html-i-12',
      title: 'Project: a responsive, themed gallery page',
      read: `Everything from this level combined: Grid for the page, Flexbox inside components, custom properties for theming, dark mode, responsive images, motion that respects preferences, and accessible controls.

Study how the pieces fit:

- \`:root\` holds every colour and spacing value **once**. Nothing further down hard-codes a colour.
- The page frame is **Grid**; the card internals are **Flexbox**. That is the standard division of labour.
- \`repeat(auto-fit, minmax(...))\` makes the gallery responsive with no breakpoint.
- The only media queries are for the layout change, dark mode and reduced motion.
- Every image has real \`alt\` text, dimensions and \`loading="lazy"\`.
- The skip link and \`:focus-visible\` styles make it usable without a mouse.

Build this, resize the window slowly, then tab through it with your mouse unplugged.`,
      sample: {
        lang: 'html',
        caption: 'Grid page + Flex components + tokens + dark mode',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Field Notes — a photo journal</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }

  :root {
    color-scheme: light dark;
    --bg: hsl(40 30% 98%);
    --surface: hsl(0 0% 100%);
    --ink: hsl(30 15% 15%);
    --muted: hsl(30 8% 45%);
    --border: hsl(35 20% 88%);
    --brand: hsl(18 75% 45%);
    --space: 1rem;
    --radius: 14px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: hsl(30 12% 9%);
      --surface: hsl(30 10% 14%);
      --ink: hsl(35 20% 92%);
      --muted: hsl(35 8% 62%);
      --border: hsl(30 10% 24%);
      --brand: hsl(22 85% 62%);
    }
  }

  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    background: var(--bg);
    color: var(--ink);
  }

  .skip-link { position: absolute; left: -9999px; }
  .skip-link:focus {
    left: var(--space); top: var(--space); z-index: 99;
    background: var(--surface); padding: 0.75rem 1rem; border-radius: 8px;
  }
  :focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }

  .page {
    display: grid;
    grid-template-columns: 1fr;
    gap: calc(var(--space) * 2);
    max-width: 78rem;
    margin-inline: auto;
    padding: var(--space);
  }
  @media (min-width: 60rem) {
    .page { grid-template-columns: 1fr 18rem; }
  }

  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space);
    padding: var(--space);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .site-header nav ul {
    display: flex; gap: 1.25rem; list-style: none; margin: 0; padding: 0;
  }
  .site-header a { color: var(--muted); text-decoration: none; }
  .site-header a:hover { color: var(--brand); }

  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--space);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .shot {
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .shot:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgb(0 0 0 / 10%); }
  .shot img { width: 100%; height: 12rem; object-fit: cover; display: block; }
  .shot .body { padding: var(--space); flex: 1; }
  .shot h3 { margin: 0 0 0.25rem; font-size: 1.05rem; }
  .shot p { margin: 0; color: var(--muted); font-size: 0.9rem; }
  .shot footer {
    padding: 0.75rem var(--space);
    border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.8rem; color: var(--muted);
  }

  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header class="site-header">
    <strong>Field Notes</strong>
    <nav aria-label="Main">
      <ul>
        <li><a href="#main">Gallery</a></li>
        <li><a href="#about">About</a></li>
      </ul>
    </nav>
  </header>

  <div class="page">
    <main id="main">
      <h1>Recent shots</h1>
      <ul class="gallery">
        <li class="shot">
          <img src="images/harbour-800.jpg"
               srcset="images/harbour-400.jpg 400w, images/harbour-800.jpg 800w"
               sizes="(max-width: 60rem) 100vw, 20rem"
               alt="Fishing boats moored in a misty harbour at dawn"
               width="800" height="600" loading="lazy" decoding="async">
          <div class="body">
            <h3>Harbour, 5am</h3>
            <p>Twenty minutes before the fleet went out.</p>
          </div>
          <footer><span>Whitby</span><time datetime="2025-04-02">2 Apr</time></footer>
        </li>

        <li class="shot">
          <img src="images/moor-800.jpg" alt="Heather moorland under a low grey sky"
               width="800" height="600" loading="lazy" decoding="async">
          <div class="body">
            <h3>Moor</h3>
            <p>Rained for the entire walk.</p>
          </div>
          <footer><span>North York Moors</span><time datetime="2025-04-11">11 Apr</time></footer>
        </li>
      </ul>
    </main>

    <aside id="about">
      <h2>About</h2>
      <p>A photo journal kept while learning to build websites by hand.</p>
    </aside>
  </div>
</body>
</html>`,
        output: `Phone   -> one column of cards, sidebar below, sticky header.
Tablet  -> two or three cards per row automatically.
Desktop -> content plus an 18rem sidebar; four cards per row.
Dark OS -> warm dark browns instead of cream, with a brighter accent.
Tab key -> skip link first, then header links, then each card.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The gallery adjusts from four columns to one with no media query. Which declaration is doing that?',
        options: [
          '`display: flex` on `.shot`',
          '`grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))`',
          '`object-fit: cover` on the images',
          '`position: sticky` on the header',
        ],
        answer: 1,
        explain:
          '`auto-fit` computes how many 16rem-minimum columns fit in the current width and shares the remainder between them, recalculating continuously as the window resizes. The media query in this page is only for the sidebar, not the gallery.',
        hint: 'Which line mentions a minimum column width?',
      },
    },
  ],
}

export default level
