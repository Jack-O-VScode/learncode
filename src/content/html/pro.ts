import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'How the browser works, and how to ship',
  summary:
    'The rendering pipeline, Core Web Vitals, modern CSS, web components, security, SEO, PWAs, deep accessibility and the process of getting a real site live and keeping it fast.',
  outcomes: [
    'Explain what the browser does between HTML arriving and pixels appearing',
    'Diagnose and fix Core Web Vitals problems',
    'Use container queries, :has(), cascade layers and modern CSS well',
    'Build a reusable web component with shadow DOM',
    'Defend against XSS and set a useful CSP',
    'Ship a fast, installable, accessible site and keep it that way',
  ],
  steps: [
    {
      id: 'html-p-01',
      title: 'The rendering pipeline',
      read: `From "bytes arrive" to "pixels on screen", the browser runs a fixed sequence. Knowing it is what turns performance work from guesswork into engineering.

1. **Parse HTML → DOM.** Incremental: the browser renders what it has while more arrives.
2. **Parse CSS → CSSOM.** CSS is **render-blocking** by design — showing unstyled content then restyling it would be worse. Keep it small.
3. **Style.** Match every rule to every node, computing final values.
4. **Layout (reflow).** Work out the geometry of every box. Expensive, and it cascades: one change can invalidate a whole subtree.
5. **Paint.** Fill in pixels — text, colours, shadows — into layers.
6. **Composite.** The GPU assembles the layers into the final frame.

## Why this matters

Different property changes re-enter the pipeline at different points:

- \`width\`, \`top\`, \`font-size\`, adding a DOM node → **layout + paint + composite** (most expensive)
- \`background-color\`, \`box-shadow\`, \`color\` → **paint + composite**
- \`transform\`, \`opacity\` → **composite only** (cheapest, GPU)

That is the entire reason animations must use \`transform\` and \`opacity\`.

## Forced synchronous layout

Reading a geometric property (\`offsetHeight\`, \`getBoundingClientRect\`) **after** writing a style forces the browser to run layout immediately to answer you. Do it inside a loop and you get "layout thrashing" — the single most common self-inflicted performance bug. **Batch your reads, then your writes.**

## The main thread

Parsing, style, layout, paint, event handlers and *all* your JavaScript share one thread. A 200ms function means 200ms of frozen page.`,
      sample: {
        lang: 'js',
        caption: 'Layout thrashing, and the read-then-write fix',
        code: `// BAD: read, write, read, write... forces layout on every iteration
function resizeAll(boxes) {
  for (const box of boxes) {
    const width = box.offsetWidth;          // READ  -> forces layout
    box.style.height = \`\${width / 2}px\`;    // WRITE -> invalidates it again
  }
}

// GOOD: all reads first, then all writes. One layout for the whole batch.
function resizeAllFast(boxes) {
  const widths = boxes.map((box) => box.offsetWidth);   // all READS
  boxes.forEach((box, i) => {                           // all WRITES
    box.style.height = \`\${widths[i] / 2}px\`;
  });
}

// Measure the difference honestly
performance.mark("start");
resizeAll([...document.querySelectorAll(".box")]);
performance.mark("end");
performance.measure("slow", "start", "end");
console.log(performance.getEntriesByName("slow")[0].duration);

// Long tasks (>50ms) block everything — watch for them
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(\`long task: \${entry.duration.toFixed(0)}ms\`);
  }
}).observe({ type: "longtask", buffered: true });`,
        output: `slow: 184.20 ms   (500 boxes, read/write interleaved)
fast:   3.10 ms   (same 500 boxes, batched)
long task: 184ms`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does reading `offsetWidth` immediately after setting `style.height` cause a performance problem in a loop?',
        options: [
          '`offsetWidth` is a slow property to read',
          'The pending style change must be applied and layout re-run before the browser can give an accurate answer — so each iteration forces a full synchronous layout',
          'It creates a new stacking context each time',
          'It triggers a network request',
        ],
        answer: 1,
        explain:
          'Browsers batch style changes and flush them once. Asking for a geometric value forces an immediate flush so the answer is correct. Interleaving reads and writes defeats the batching entirely — hence "layout thrashing", and hence read-all-then-write-all.',
        hint: 'What must be true before the browser can answer a geometry question?',
      },
    },

    {
      id: 'html-p-02',
      title: 'Core Web Vitals',
      read: `Google's three field metrics. They matter because they are measured on **real users' devices**, and because they correlate with whether people stay.

## LCP — Largest Contentful Paint (good: ≤ 2.5s)

When the biggest element above the fold finishes rendering — usually the hero image or headline.

Fixes: \`fetchpriority="high"\` on the hero, never lazy-load it, inline critical CSS, preconnect to image hosts, serve AVIF/WebP at the right size, cut server response time.

## INP — Interaction to Next Paint (good: ≤ 200ms)

Replaced FID in 2024. Measures the worst delay between a user interacting and seeing a visual response.

Fixes: break up long tasks (\`await scheduler.yield()\`), do less work in handlers, debounce expensive updates, keep third-party scripts off the critical path, and render feedback immediately even if the work continues.

## CLS — Cumulative Layout Shift (good: ≤ 0.1)

How much content jumps around while loading.

Fixes: \`width\`/\`height\` or \`aspect-ratio\` on every image and embed; reserve space for ads and banners; \`font-display: optional\` or a well-matched fallback with \`size-adjust\`; never insert content above existing content after load.

## Lab vs field

Lighthouse is a **lab** test on a simulated device. Real users have worse networks, older phones and browser extensions. Collect field data with the \`web-vitals\` library and believe that over your local score.`,
      sample: {
        lang: 'js',
        caption: 'Measuring what real users actually experience',
        code: `import { onLCP, onINP, onCLS, onTTFB } from "web-vitals";

function send(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,          // "good" | "needs-improvement" | "poor"
    id: metric.id,
    path: location.pathname,
  });
  // sendBeacon survives the page being closed
  navigator.sendBeacon?.("/analytics/vitals", body);
}

onLCP(send);
onINP(send);
onCLS(send);
onTTFB(send);

// Find what the LCP element actually is — it is often not what you assume
new PerformanceObserver((list) => {
  const last = list.getEntries().at(-1);
  console.log("LCP element:", last.element, \`\${last.startTime.toFixed(0)}ms\`);
}).observe({ type: "largest-contentful-paint", buffered: true });

// Find which element is shifting
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.hadRecentInput) continue;     // user-initiated shifts do not count
    console.log("shift", entry.value, entry.sources.map((s) => s.node));
  }
}).observe({ type: "layout-shift", buffered: true });

// Break a long task so the page stays responsive
async function processAll(items) {
  for (const [i, item] of items.entries()) {
    handle(item);
    if (i % 50 === 0) await scheduler.yield();   // let input through
  }
}`,
        output: `LCP element: <img class="hero"> 1840ms
shift 0.043 [<img class="avatar">]     <- no width/height set
LCP  1840  needs-improvement
INP   120  good
CLS 0.043  good`,
      },
      question: {
        kind: 'mcq',
        prompt: 'A page scores 98 in Lighthouse but real users report it feeling slow. What is the most likely explanation?',
        options: [
          'Lighthouse is broken',
          'Lighthouse is a lab test on a simulated network and device; real users have slower connections, older phones, extensions and cold caches',
          'The score only measures accessibility',
          'Real users are on a different site',
        ],
        answer: 1,
        explain:
          'Lab scores are reproducible, not representative. Field data (CrUX, or the `web-vitals` library reporting to your own endpoint) captures the 75th percentile of actual devices — which is the number Google uses and the one your users live with.',
        hint: 'Whose device is Lighthouse simulating?',
      },
    },

    {
      id: 'html-p-03',
      title: 'Modern CSS worth adopting now',
      read: `CSS moved further in the last three years than in the decade before. These are the features that change how you write it.

## :has() — the parent selector

\`\`\`css
.card:has(img) { padding-top: 0; }
label:has(input:checked) { font-weight: 600; }
form:has(:invalid) button { opacity: 0.5; }
\`\`\`

Twenty years of "CSS can't style a parent" is over. It also enables state-driven styling with no JavaScript at all.

## Container queries

\`@container\` responds to the **component's** box, not the viewport. A card in a sidebar and the same card in a wide main column can lay themselves out differently — which is what you actually wanted all along.

## Cascade layers

\`\`\`css
@layer reset, base, components, utilities;
\`\`\`

Layer order beats specificity. A one-class utility in a later layer can override a three-selector component rule without \`!important\`. This is the real fix for specificity wars.

## Nesting

Native, no preprocessor. Keep it shallow — deep nesting produces the same over-specific selectors we spent years escaping.

## Also worth knowing

- \`clamp()\` — fluid type and spacing without breakpoints
- \`aspect-ratio\` — reserve space, kill layout shift
- \`inset\`, \`margin-inline\`, \`padding-block\` — logical properties that work in any writing direction
- \`color-mix()\` and \`oklch()\` — perceptually even colour scales
- \`@starting-style\` and \`transition-behavior: allow-discrete\` — animate elements in and out of \`display: none\`
- \`text-wrap: balance\` — headlines that break evenly`,
      sample: {
        lang: 'css',
        caption: 'Layers, container queries and :has() doing real work',
        code: `@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }
}

@layer base {
  :root {
    --brand: oklch(62% 0.19 258);
    --brand-soft: color-mix(in oklch, var(--brand) 15%, white);
    --space: clamp(0.75rem, 2vw, 1.5rem);
  }
  h1 { font-size: clamp(1.75rem, 5vw, 3rem); text-wrap: balance; }
}

@layer components {
  .card {
    container-type: inline-size;
    background: white;
    border-radius: 14px;
    padding: var(--space);

    /* native nesting, kept one level deep */
    & h3 { margin-block: 0 0.25rem; }
    & img { aspect-ratio: 16 / 9; width: 100%; object-fit: cover; }
  }

  /* the card adapts to ITS OWN width, wherever it is placed */
  @container (min-width: 28rem) {
    .card { display: grid; grid-template-columns: 12rem 1fr; gap: var(--space); }
    .card img { aspect-ratio: 1; }
  }

  /* :has() — style the parent based on its children */
  .card:has(.badge) { border: 2px solid var(--brand); }
  .card:not(:has(img)) { padding-block-start: calc(var(--space) * 1.5); }
  form:has(input:invalid) [type="submit"] { opacity: 0.5; pointer-events: none; }
  label:has(input:checked) { background: var(--brand-soft); }
}

@layer utilities {
  /* one class, no !important, still wins — because of layer order */
  .flow > * + * { margin-block-start: var(--space); }
  .visually-hidden { clip-path: inset(50%); position: absolute; }
}`,
        output: `A .card in a 20rem sidebar: stacked, 16:9 image.
The same .card in a 60rem main column: two columns, square image.
A card containing a .badge gets a brand border — no JavaScript.
The submit button dims itself while any field is invalid — no JavaScript.
.flow overrides .card's margins despite lower specificity, because
"utilities" is declared after "components".`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'With `@layer reset, base, components, utilities;`, a `.mt-0` rule in `utilities` (one class) and a `.card .header h3` rule in `components` (higher specificity) both set `margin-top`. Which wins?',
        options: [
          'The components rule, because its specificity is higher',
          'The utilities rule, because layer order is checked before specificity',
          'Whichever appears later in the file',
          'Neither; it is an error',
        ],
        answer: 1,
        explain:
          'Cascade layers outrank specificity entirely: any rule in a later layer beats any rule in an earlier one, however specific. That is exactly why layers eliminate the `!important` arms race that utility classes used to cause.',
        hint: 'What is layers’ whole reason for existing?',
      },
    },

    {
      id: 'html-p-04',
      title: 'Component architecture and naming',
      read: `Once a stylesheet passes a few hundred lines, the problem stops being "how do I style this" and becomes "how do I change this without breaking something else".

## The three schools

- **BEM** — \`.card\`, \`.card__title\`, \`.card--featured\`. Verbose, but every class says exactly what it belongs to and specificity stays flat. Ages extremely well.
- **Utility-first** (Tailwind and similar) — compose from \`.flex .gap-4 .p-6\`. Very fast to build with, no dead CSS; markup gets noisy and it needs tooling.
- **Scoped / CSS Modules / shadow DOM** — the browser or build tool guarantees isolation. Best when your components genuinely need to be self-contained.

All three solve the same problem: making a style change **local and predictable**. Pick one and apply it consistently; mixing them at random is worse than any of them.

## Rules that survive any choice

1. **Components own their internals, never their surroundings.** No \`margin-bottom\` on a component's root — the parent decides spacing. Otherwise the component behaves differently everywhere you reuse it.
2. **Keep specificity flat.** One class per rule wherever possible.
3. **Design tokens for every value.** Colour, spacing, radius, shadow — defined once as custom properties, referenced everywhere. Changing the brand colour should mean editing one line.
4. **Name by role, not appearance.** \`.button--danger\`, not \`.button--red\`.
5. **Delete aggressively.** Unused CSS is a liability. Coverage in devtools shows you what never ran.`,
      sample: {
        lang: 'css',
        caption: 'A component that does not dictate its own surroundings',
        code: `/* tokens: the single source of truth */
:root {
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --radius-md: 12px;
  --color-surface: white;
  --color-border: hsl(220 15% 90%);
  --color-danger: hsl(0 72% 51%);
  --shadow-sm: 0 1px 3px rgb(16 24 40 / 8%);
}

/* BLOCK — owns its inside, never its outside */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  /* NO margin here: the layout that places the card decides spacing */
}

/* ELEMENTS */
.card__title { margin-block: 0 var(--space-2); font-size: 1.125rem; }
.card__body  { margin: 0; color: hsl(220 10% 40%); }
.card__actions {
  display: flex; gap: var(--space-2); margin-block-start: var(--space-4);
}

/* MODIFIERS — named for meaning, not colour */
.card--danger { border-color: var(--color-danger); }
.card--compact { padding: var(--space-4); }

/* the PARENT owns the spacing between cards */
.card-grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}`,
        output: `<div class="card-grid">
  <article class="card">…</article>
  <article class="card card--danger">…</article>
</div>

The same .card drops into a sidebar, a modal or a grid and looks right in
all three, because it never assumed anything about the space around it.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why should a reusable component not set `margin-bottom` on its own root element?',
        options: [
          'Margins are deprecated on components',
          'Spacing depends on context, so a component that dictates its own external spacing behaves wrongly somewhere else — the parent layout should own the gap',
          'It causes margin collapse bugs',
          'It increases specificity',
        ],
        answer: 1,
        explain:
          'A card in a grid, in a modal and in a sidebar need different surrounding space. If the component ships its own margin, every one of those contexts has to override it — and overrides are where stylesheets rot. Let the parent use `gap` or a flow utility instead.',
        hint: 'How many different places will this component live in?',
      },
    },

    {
      id: 'html-p-05',
      title: 'Web components',
      read: `Custom elements let you define new HTML tags that work in any framework — or none.

\`\`\`js
class StarRating extends HTMLElement {
  connectedCallback() { ... }
}
customElements.define("star-rating", StarRating);
\`\`\`

The name **must contain a hyphen** — that is how the parser tells your element from a future built-in one.

## Lifecycle

\`constructor\` (no DOM work here), \`connectedCallback\` (added to the page — do setup here), \`disconnectedCallback\` (**remove listeners here**, or you leak), \`attributeChangedCallback\` with a static \`observedAttributes\` list.

## Shadow DOM

\`this.attachShadow({ mode: "open" })\` gives the element a private tree. Outside CSS cannot reach in, and inside CSS cannot leak out. Real encapsulation, guaranteed by the browser.

The trade-off is that styling is now deliberate: expose hooks with **CSS custom properties** (which do pierce the shadow boundary) and \`::part()\`.

## Slots

\`<slot>\` marks where the user's content goes, so the element composes instead of dictating.

## When to reach for this

A design-system widget used across several apps and frameworks, or an embeddable widget that must not be affected by the host page's CSS. For a page you fully control, a plain module and a class is usually simpler.`,
      sample: {
        lang: 'html',
        caption: 'A complete, accessible custom element',
        code: `<star-rating value="3" max="5"></star-rating>

<script type="module">
class StarRating extends HTMLElement {
  static observedAttributes = ["value", "max"];

  #shadow = this.attachShadow({ mode: "open" });
  #onClick = (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    this.value = Number(button.dataset.index);
    this.dispatchEvent(new CustomEvent("change", {
      detail: { value: this.value }, bubbles: true,
    }));
  };

  get value() { return Number(this.getAttribute("value") ?? 0); }
  set value(n) { this.setAttribute("value", String(n)); }
  get max() { return Number(this.getAttribute("max") ?? 5); }

  connectedCallback() {
    this.#render();
    this.#shadow.addEventListener("click", this.#onClick);
  }

  disconnectedCallback() {
    this.#shadow.removeEventListener("click", this.#onClick);  // no leaks
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  #render() {
    const stars = Array.from({ length: this.max }, (_, i) => {
      const filled = i < this.value;
      return \`<button type="button" part="star" data-index="\${i + 1}"
                aria-pressed="\${filled}"
                aria-label="Rate \${i + 1} of \${this.max}">
                \${filled ? "★" : "☆"}
              </button>\`;
    }).join("");

    this.#shadow.innerHTML = \`
      <style>
        :host { display: inline-flex; gap: 0.15rem; }
        :host([disabled]) { opacity: 0.5; pointer-events: none; }
        button {
          font-size: var(--star-size, 1.5rem);
          color: var(--star-color, goldenrod);
          background: none; border: none; cursor: pointer; padding: 0;
        }
        button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
      </style>
      <div role="group" aria-label="Rating">\${stars}</div>
    \`;
  }
}
customElements.define("star-rating", StarRating);

document.querySelector("star-rating")
  .addEventListener("change", (e) => console.log("rated", e.detail.value));
</script>

<style>
  /* custom properties cross the shadow boundary; ordinary selectors do not */
  star-rating { --star-color: crimson; --star-size: 2rem; }
  star-rating::part(star) { transition: transform 120ms ease; }
</style>`,
        output: `★★★☆☆   (crimson, 2rem — themed from outside via custom properties)
Clicking the 4th star logs: rated 4
A page-wide "button { background: blue }" rule has no effect inside it.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'A page-wide rule `button { background: blue }` does not affect buttons inside your custom element. Why?',
        options: [
          'Custom elements ignore all CSS',
          'The buttons are inside a shadow root, and outside selectors cannot cross the shadow boundary — only inherited properties and custom properties get in',
          'The rule needs `!important`',
          'Buttons in components must be styled inline',
        ],
        answer: 1,
        explain:
          'Encapsulation is the point of shadow DOM: the outside cannot reach in and the inside cannot leak out. Deliberate hooks are how you allow theming — custom properties (which inherit through), `::part()`, and `:host` selectors.',
        hint: 'What is shadow DOM for?',
      },
    },

    {
      id: 'html-p-06',
      title: 'Security: XSS, CSP and the rest',
      read: `## XSS

Cross-site scripting: attacker-controlled text is interpreted as code in your page. It runs with your user's session, so it can do anything they can.

The rule: **never build HTML from untrusted data.**

- \`textContent\` instead of \`innerHTML\`
- \`createElement\` + \`setAttribute\` instead of string templates
- Never \`eval\`, \`new Function\`, or \`setTimeout("string")\`
- Escape on **output**, per context — HTML, attribute, URL and JavaScript contexts all need different escaping
- Validate URLs before putting them in \`href\`: \`javascript:alert(1)\` is a valid URL

If you must insert HTML, sanitise it with a maintained library (DOMPurify), or use the Sanitizer API where available.

## CSP

A Content-Security-Policy header tells the browser what it is allowed to load and run. A good policy turns most XSS from a breach into a blocked console message.

Start in **report-only** mode, collect violations, then enforce. Avoid \`unsafe-inline\`; use nonces or hashes.

## The other headers

- \`Strict-Transport-Security\` — https only, from now on
- \`X-Content-Type-Options: nosniff\`
- \`Referrer-Policy: strict-origin-when-cross-origin\`
- \`Permissions-Policy\` — switch off camera, geolocation, etc.

## Third-party scripts

Every embedded script can do everything your own code can. Use \`integrity\` (SRI) with \`crossorigin\`, self-host what you can, and audit what you include.`,
      sample: {
        lang: 'js',
        caption: 'The unsafe version, the safe version, and a CSP',
        code: `// UNSAFE — comment is attacker-controlled
function renderComment(comment) {
  container.innerHTML += \`<p>\${comment.text}</p>\`;
}
// comment.text = '<img src=x onerror="fetch(\\'/evil?c=\\'+document.cookie)">'

// SAFE — the text can never become markup
function renderComment(comment) {
  const p = document.createElement("p");
  p.textContent = comment.text;
  container.append(p);
}

// URLs from users need validating: javascript: is a real URL scheme
function safeHref(raw) {
  try {
    const url = new URL(raw, location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

// Third-party scripts: pin the exact file you audited
// <script src="https://cdn.example.com/lib.js"
//         integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
//         crossorigin="anonymous"></script>

/* Response headers:

Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-r4nd0m';
  style-src 'self' 'nonce-r4nd0m';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  object-src 'none';
  report-uri /csp-report

Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
*/`,
        output: `With the unsafe version and that comment, the page silently sends
every visitor's cookies to the attacker.

With the safe version, the page displays the literal text
  <img src=x onerror="...">
and nothing runs. The CSP blocks it a second time:
  Refused to execute inline event handler because it violates
  the Content Security Policy directive: "script-src 'self' 'nonce-r4nd0m'"`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is a Content-Security-Policy valuable even if your code already avoids `innerHTML`?',
        options: [
          'It makes the page load faster',
          'It is defence in depth — one mistake by you, a dependency or a CMS field is blocked by the browser instead of executing',
          'It replaces the need for https',
          'It encrypts your JavaScript',
        ],
        answer: 1,
        explain:
          'Security assumes something will eventually get through: a colleague\'s shortcut, a compromised npm package, a rich-text field. CSP is a second, independent barrier enforced by the browser, which is why it turns many XSS bugs into a console warning rather than a breach.',
        hint: 'What happens when one line of code somewhere slips through?',
      },
    },

    {
      id: 'html-p-07',
      title: 'SEO and structured data',
      read: `Most SEO is just building a good page properly. The technical parts that genuinely matter:

## Crawlable and indexable

- Server-render or pre-render your content. A page that is an empty \`<div id="root">\` until JavaScript runs is a gamble.
- One clear \`<h1>\`, a sensible heading outline, descriptive link text
- \`robots.txt\` for crawl rules, \`sitemap.xml\` for discovery
- \`<link rel="canonical">\` on anything reachable at more than one URL
- Real \`<a href>\` for navigation — a \`div\` with a click handler is not a link
- Unique \`<title>\` and \`meta description\` per page

## Structured data

JSON-LD in a \`<script type="application/ld+json">\` describes your content in a vocabulary search engines understand, which is what produces rich results — star ratings, recipe times, FAQ dropdowns, breadcrumbs.

Validate with Google's Rich Results Test. Mark up only what is genuinely on the page; marking up things that are not is a manual-action risk.

## Performance is ranking

Core Web Vitals are a ranking signal, and more importantly a bounce-rate signal.

## International

\`hreflang\` for language variants, and \`lang\` on \`<html>\` — which also helps screen readers pronounce your content correctly.`,
      sample: {
        lang: 'html',
        caption: 'JSON-LD for an article, with breadcrumbs',
        code: `<head>
  <title>Sourdough for beginners — The Daily Loaf</title>
  <meta name="description" content="A slow, forgiving sourdough recipe. Four ingredients, eighteen hours, no special equipment.">
  <link rel="canonical" href="https://dailyloaf.example/sourdough">
  <link rel="alternate" hreflang="fr" href="https://dailyloaf.example/fr/levain">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": "Sourdough for beginners",
    "author": { "@type": "Person", "name": "Sam Ellis" },
    "datePublished": "2025-03-14",
    "description": "Four ingredients, eighteen hours, no special equipment.",
    "image": ["https://dailyloaf.example/img/loaf-1x1.jpg"],
    "prepTime": "PT30M",
    "cookTime": "PT45M",
    "totalTime": "PT18H",
    "recipeYield": "1 loaf",
    "recipeIngredient": [
      "500g strong white flour",
      "350g water",
      "10g salt",
      "100g active starter"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.7",
      "reviewCount": "218"
    }
  }
  </script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",
        "item": "https://dailyloaf.example/" },
      { "@type": "ListItem", "position": 2, "name": "Recipes",
        "item": "https://dailyloaf.example/recipes" },
      { "@type": "ListItem", "position": 3, "name": "Sourdough for beginners" }
    ]
  }
  </script>
</head>`,
        output: `Google result:

  Home › Recipes › Sourdough for beginners
  Sourdough for beginners — The Daily Loaf
  ★★★★★ 4.7  (218)  ·  18 hr  ·  1 loaf
  Four ingredients, eighteen hours, no special equipment.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the risk of adding `aggregateRating` structured data for reviews the page does not actually show?',
        options: [
          'It slows the page down',
          'It is a guidelines violation that can trigger a manual action and remove all your rich results',
          'Nothing — search engines ignore extra data',
          'It breaks the JSON parser',
        ],
        answer: 1,
        explain:
          'Structured data must describe content genuinely visible on the page. Marking up ratings, FAQs or prices that are not there is treated as spam, and the penalty is losing rich results across the whole site — a far bigger loss than the stars would have gained.',
        hint: 'What is structured data supposed to be describing?',
      },
    },

    {
      id: 'html-p-08',
      title: 'Progressive Web Apps',
      read: `A PWA is an ordinary website with two additions that let it install like a native app — exactly how the app you are reading this in works.

## 1. A manifest

\`\`\`json
{
  "name": "LearnCode",
  "short_name": "LearnCode",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0b1020",
  "theme_color": "#0b1020",
  "icons": [{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
            { "src": "/icon-maskable.png", "sizes": "512x512",
              "type": "image/png", "purpose": "maskable" }]
}
\`\`\`

\`display: standalone\` removes the browser chrome. A **maskable** icon is required for Android to avoid an ugly white square.

## 2. A service worker

A script that sits between your page and the network, able to answer requests from a cache. It is what makes a site work offline.

Strategies: **cache-first** for versioned static assets, **network-first** for HTML and API data, **stale-while-revalidate** for things that may be slightly stale.

## The rules that bite

- **https only** (\`localhost\` excepted)
- A service worker **cannot** see \`localStorage\` — use the Cache API and IndexedDB
- Always version your caches and delete old ones in \`activate\`, or users get stuck on a stale build forever. This is the single most common PWA bug.

## Installing

- **Android/Windows/ChromeOS** — the \`beforeinstallprompt\` event lets you show your own button
- **iOS** — no prompt; the user must use Share → Add to Home Screen, so tell them how`,
      sample: {
        lang: 'js',
        caption: 'A correct, versioned service worker',
        code: `// sw.js
const VERSION = "v7";                       // bump on every deploy
const STATIC = \`static-\${VERSION}\`;
const RUNTIME = \`runtime-\${VERSION}\`;
const SHELL = ["/", "/index.html", "/styles/main.css", "/js/app.js", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;     // never cache other origins

  // HTML: network-first, so users get fresh content but still work offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r ?? caches.match("/offline.html")))
    );
    return;
  }

  // Static assets: cache-first — they are versioned, so they never go stale
  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME).then((c) => c.put(request, copy));
      return response;
    }))
  );
});`,
        output: `First visit  -> shell cached, "static-v7" created
Offline      -> pages still load; unknown URLs show /offline.html
Deploy v8    -> new worker installs, activate deletes static-v7 and runtime-v7
Android      -> "Install app" prompt available
iOS Safari   -> Share → Add to Home Screen, then it launches with no browser UI`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must the `activate` handler delete caches from previous versions?',
        options: [
          'To free disk space',
          'Otherwise old cached files keep being served and users stay stuck on a previous build no matter how many times they reload',
          'Browsers require exactly one cache',
          'It makes installation faster',
        ],
        answer: 1,
        explain:
          'A cache-first service worker will happily serve last month\'s JavaScript forever. Versioning the cache name and clearing old ones on activate is what makes a deploy actually reach users — and forgetting it is the classic "my update will not show up" PWA bug.',
        hint: 'What does cache-first do when the file is already in the cache?',
      },
    },

    {
      id: 'html-p-09',
      title: 'Accessibility in depth',
      read: `The basics were the previous level. This is what separates "passes the automated check" from "actually usable" — and automated tools only catch about a third of real problems.

## Focus management

The hardest part of any interactive component.

- Opening a modal: move focus **into** it, **trap** it there, and return focus to the trigger on close
- Deleting a row: move focus somewhere sensible, not to \`<body>\`
- Client-side route change: move focus to the new \`<h1>\` and announce it — otherwise a screen-reader user has no idea anything happened

\`\`\`html
<dialog>
\`\`\`
with \`showModal()\` gives you focus trapping, Escape handling and the backdrop for free. Use it before hand-rolling one.

## Live regions

\`aria-live="polite"\` announces changes without interrupting; \`assertive\` interrupts and should be rare. The region **must exist in the DOM before** you put text in it. \`role="status"\` and \`role="alert"\` are the shorthands.

## Names, roles and values

Every interactive thing needs an accessible **name** (label, \`aria-label\`, or text content), the right **role** (use the native element), and its current **state** (\`aria-expanded\`, \`aria-checked\`, \`aria-current\`).

## Beyond screen readers

- Zoom to 400% and reflow to 320px — text must not be cut off
- Touch targets at least 24×24 CSS px, ideally 44×44
- Never rely on colour alone
- Honour \`prefers-reduced-motion\`
- Captions and transcripts for media

## Test with real tools

VoiceOver (Mac/iOS, free), NVDA (Windows, free). Twenty minutes with a screen reader teaches more than any checklist.`,
      sample: {
        lang: 'html',
        caption: 'A modal and a route change, both handling focus properly',
        code: `<button id="open">Edit profile</button>

<dialog id="editor" aria-labelledby="editor-title">
  <h2 id="editor-title">Edit profile</h2>
  <form method="dialog">
    <label for="display">Display name</label>
    <input id="display" name="display">
    <button value="cancel">Cancel</button>
    <button value="save">Save</button>
  </form>
</dialog>

<p id="announcer" role="status" aria-live="polite" class="visually-hidden"></p>

<script type="module">
  const dialog = document.querySelector("#editor");
  const opener = document.querySelector("#open");
  const announcer = document.querySelector("#announcer");

  opener.addEventListener("click", () => {
    dialog.showModal();                  // focus trap + Esc + backdrop, free
    dialog.querySelector("#display").focus();
  });

  dialog.addEventListener("close", () => {
    opener.focus();                      // always hand focus back
    if (dialog.returnValue === "save") announce("Profile saved");
  });

  function announce(message) {
    // clear first: repeating identical text is sometimes not re-announced
    announcer.textContent = "";
    requestAnimationFrame(() => { announcer.textContent = message; });
  }

  // client-side navigation: tell the user the page changed
  function navigated(title) {
    document.title = \`\${title} — My App\`;
    const heading = document.querySelector("main h1");
    heading.setAttribute("tabindex", "-1");   // focusable programmatically only
    heading.focus();
    announce(\`\${title} loaded\`);
  }
</script>

<style>
  .visually-hidden {
    position: absolute; width: 1px; height: 1px;
    margin: -1px; padding: 0; overflow: hidden;
    clip-path: inset(50%); white-space: nowrap;
  }
  dialog::backdrop { background: rgb(0 0 0 / 50%); }
</style>`,
        output: `Open the dialog  -> focus lands in the name field; Tab cycles inside only
Press Escape     -> closes, focus returns to "Edit profile"
Press Save       -> screen reader announces "Profile saved"
Navigate         -> title updates, focus moves to the new h1, change announced`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After a client-side route change, why move focus to the new page’s `<h1>`?',
        options: [
          'To scroll the page to the top',
          'Focus otherwise stays on the old link or resets to `<body>`, so a screen-reader user gets no indication that anything changed and must re-navigate from the top',
          'It is required by HTML',
          'To trigger a re-render',
        ],
        answer: 1,
        explain:
          'A full page load naturally resets focus and announces the new document. Client-side routing skips all of that, so the app has to recreate it: update `document.title`, move focus to the new heading, and announce the change in a live region.',
        hint: 'What does a normal page load do that a client-side route change does not?',
      },
    },

    {
      id: 'html-p-10',
      title: 'Build tooling and deployment',
      read: `## When you need a build step

Not before you need packages from npm, TypeScript, a component framework, or content-hashed filenames. **Vite** is the default answer: instant dev server, Rollup build, no configuration for the common cases.

What a build actually gives you:

- **Bundling** and tree-shaking — less code shipped
- **Minification** of JS, CSS and HTML
- **Content hashing** (\`app.4f3a1b.js\`) — so you can cache for a year and still deploy instantly
- **Transpiling** for older browsers, from an explicit browserslist target
- **Asset pipeline** — image conversion, inlining small files

## Caching that works

- Hashed assets: \`Cache-Control: public, max-age=31536000, immutable\`
- HTML: \`Cache-Control: no-cache\` (revalidate every time)

Get this pair right and returning visits are nearly instant while deploys are still immediate.

## Deploying

Netlify, Vercel, Cloudflare Pages and GitHub Pages all give https, a global CDN and deploy-on-push, free for a static site. Preview deployments per pull request are the single most useful feature — review the real thing, not a screenshot.

## CI

On every push: build, run Lighthouse CI against a budget, run \`axe\` for accessibility, check bundle size. Automated gates stop regressions that nobody would have noticed by hand.`,
      sample: {
        lang: 'bash',
        caption: 'From empty folder to deployed site with checks',
        code: `npm create vite@latest my-site -- --template vanilla
cd my-site && npm install
npm run dev          # instant HMR dev server

npm run build        # dist/ with hashed, minified assets
npm run preview      # serve the real build locally

# dist/
#   index.html                       1.2 kB
#   assets/index-4f3a1b2c.css       12.4 kB │ gzip: 3.1 kB
#   assets/index-9e8d7c6b.js        48.9 kB │ gzip: 17.2 kB

npx lighthouse http://localhost:4173 --output=json --output-path=./report.json
npx @axe-core/cli http://localhost:4173

# deploy
npx netlify deploy --prod --dir=dist

# _headers (Netlify) — the caching pair that matters
# /assets/*
#   Cache-Control: public, max-age=31536000, immutable
# /*.html
#   Cache-Control: public, max-age=0, must-revalidate`,
        output: `✓ built in 1.24s
Lighthouse: performance 99, accessibility 100, best-practices 100, seo 100
axe: 0 violations
Deployed to https://my-site.netlify.app`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can hashed assets be cached for a year while HTML must be revalidated every time?',
        options: [
          'HTML files are larger',
          'A hashed filename changes whenever its content changes, so the old file can never be wrong — but the HTML must be re-fetched to learn the new filenames',
          'Browsers cannot cache HTML',
          'HTML is not compressible',
        ],
        answer: 1,
        explain:
          'Content hashing makes each asset URL permanently correct for its content — a new build produces a new URL, so an aggressive cache is safe. The HTML is the index that points at those URLs, so it is the one file that must always be fresh.',
        hint: 'What happens to the filename when the file changes?',
      },
    },

    {
      id: 'html-p-11',
      title: 'Debugging and devtools',
      read: `## Elements

Live DOM and computed styles. The **Computed** tab shows the final value of every property *and* which rule won — which answers "why is this element that colour?" in seconds. Force states (\`:hover\`, \`:focus\`) with the pin icon. The layout overlays for Flexbox and Grid draw the lines and gaps for you.

## Console

\`console.table\` for arrays of objects, \`console.group\` to nest, \`console.time\`/\`timeEnd\`, \`$0\` for the selected element, \`$$("sel")\` as a shortcut for \`querySelectorAll\`. \`monitorEvents($0)\` logs everything an element receives — invaluable when a handler is not firing.

## Network

Throttle to Slow 4G. The **waterfall** shows what blocked what. Check the size *and* the priority column. "Disable cache" for a true first-visit test.

## Performance

Record an interaction. Long yellow blocks are JavaScript; purple is layout and style. Anything over 50ms is a **long task** and is what makes a page feel unresponsive. This panel tells you which function, on which line.

## Application

Service workers (unregister, "Update on reload"), Cache Storage, localStorage, IndexedDB, and the manifest with an install check.

## Lighthouse and accessibility

Run Lighthouse for a score and a list of fixes. The **Accessibility tree** in Elements shows exactly what a screen reader sees for the selected node — often revealing that a button has no accessible name at all.

## The method

Reproduce reliably. Narrow it down — binary search by deleting half. Check your assumptions with \`console.log\` or a breakpoint. **Fix the cause, not the symptom.** Then write down what it was.`,
      sample: {
        lang: 'js',
        caption: 'Console techniques that save real time',
        code: `// which elements are shifting the layout?
new PerformanceObserver((list) => {
  console.table(list.getEntries()
    .filter((e) => !e.hadRecentInput)
    .map((e) => ({ value: e.value.toFixed(4), node: e.sources[0]?.node?.tagName })));
}).observe({ type: "layout-shift", buffered: true });

// break when an attribute or subtree changes — great for "who is doing this?"
new MutationObserver((records) => {
  for (const r of records) console.log(r.type, r.target, r.attributeName);
}).observe(document.querySelector("#mystery"), {
  attributes: true, childList: true, subtree: true,
});

// time a suspicious block
console.time("render");
renderEverything();
console.timeEnd("render");

// in the console, against the selected element:
//   $0                      the element selected in Elements
//   $$(".card")             querySelectorAll, as a real array
//   monitorEvents($0, "click")   log every click it receives
//   getEventListeners($0)   what is attached to it
//   debug(myFunction)       break whenever it is called

// conditional breakpoint, without editing code:
// right-click the line number -> "Add conditional breakpoint" -> id === 42

// find what is unused: devtools -> Coverage -> record -> reload
console.log(performance.getEntriesByType("resource")
  .sort((a, b) => b.transferSize - a.transferSize)
  .slice(0, 5)
  .map((r) => \`\${(r.transferSize / 1024).toFixed(0)} KB  \${r.name.split("/").pop()}\`));`,
        output: `┌─────────┬────────┐
│ value   │ node   │
├─────────┼────────┤
│ 0.0431  │ IMG    │
└─────────┴────────┘
render: 184.2ms
["842 KB  hero.jpg", "210 KB  vendor.js", "88 KB  main.css"]`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An element is the wrong colour and you cannot find which rule is responsible. What is the fastest way to find out?',
        options: [
          'Add `!important` until it works',
          'Select it and read the Computed tab, which shows the winning value and links to the exact rule and line that set it',
          'Delete CSS files one at a time',
          'Search the stylesheet for the colour',
        ],
        answer: 1,
        explain:
          'The Computed tab resolves the whole cascade for you and links straight to the winning declaration, with the overridden ones struck through above it. Adding `!important` hides the problem and makes the next override harder.',
        hint: 'Devtools already computed the answer.',
      },
    },

    {
      id: 'html-p-12',
      title: 'Capstone: ship something real',
      read: `Everything in this track, applied to a site you actually publish.

## The checklist

**Structure**
- Semantic HTML that reads correctly with CSS disabled
- One \`<h1>\`, no skipped heading levels
- Every image has honest \`alt\` and explicit dimensions

**Styling**
- Design tokens as custom properties, in one place
- Cascade layers, flat specificity, no \`!important\`
- Responsive with container queries and \`clamp()\`; dark mode supported
- Motion honours \`prefers-reduced-motion\`

**Behaviour**
- Progressive enhancement: the core content works without JavaScript
- \`textContent\` for user data; validated URLs
- Focus managed on every route change and dialog

**Performance**
- LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 — on a mid-range phone on 4G
- Modern image formats, correct sizes, \`fetchpriority\` on the hero
- Hashed assets cached for a year, HTML revalidated

**Security**
- https, HSTS, a CSP without \`unsafe-inline\`, SRI on third-party scripts

**Shipping**
- Deployed on a CDN with preview builds per pull request
- CI runs Lighthouse and axe against a budget
- Field metrics collected from real users

> A site that is fast, accessible and secure is not a special achievement — it is what "finished" means. The difference between a hobbyist and a professional is that the professional has a checklist and actually runs it.`,
      sample: {
        lang: 'html',
        caption: 'The head of a production page, with every decision deliberate',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

  <title>Ridgeline — trail maps for the Peak District</title>
  <meta name="description" content="Printable, offline-ready trail maps for 40 walks in the Peak District. Free, no account needed.">
  <link rel="canonical" href="https://ridgeline.example/">

  <!-- resource hints: only for what is genuinely critical -->
  <link rel="preconnect" href="https://tiles.ridgeline.example" crossorigin>
  <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

  <!-- critical CSS inline, the rest deferred -->
  <style>
    @layer reset, base, components, utilities;
    @layer reset { *,*::before,*::after{box-sizing:border-box} body{margin:0} }
    @layer base {
      :root {
        color-scheme: light dark;
        --ink: oklch(25% 0.02 250); --bg: oklch(99% 0.005 250);
        --brand: oklch(55% 0.16 145); --space: clamp(1rem, 3vw, 2rem);
      }
      @media (prefers-color-scheme: dark) {
        :root { --ink: oklch(93% 0.01 250); --bg: oklch(18% 0.02 250); }
      }
      body { background: var(--bg); color: var(--ink); font-family: Inter, system-ui, sans-serif; line-height: 1.6; }
      h1 { font-size: clamp(2rem, 6vw, 3.5rem); text-wrap: balance; }
      .hero img { aspect-ratio: 16/9; width: 100%; height: auto; object-fit: cover; }
    }
  </style>
  <link rel="stylesheet" href="/assets/main.4f3a1b.css" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="/assets/main.4f3a1b.css"></noscript>

  <script type="module" src="/assets/app.9e8d7c.js"></script>

  <!-- PWA -->
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#0f766e">
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">

  <!-- social -->
  <meta property="og:title" content="Ridgeline — trail maps for the Peak District">
  <meta property="og:image" content="https://ridgeline.example/og.png">
  <meta property="og:url" content="https://ridgeline.example/">
  <meta name="twitter:card" content="summary_large_image">

  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"WebSite",
   "name":"Ridgeline","url":"https://ridgeline.example/"}
  </script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header><!-- nav --></header>

  <main id="main">
    <section class="hero">
      <h1>Forty walks. No signal required.</h1>
      <picture>
        <source srcset="/img/hero.avif" type="image/avif">
        <source srcset="/img/hero.webp" type="image/webp">
        <img src="/img/hero.jpg" alt="A path along a gritstone edge at sunrise"
             width="1600" height="900" fetchpriority="high" decoding="async">
      </picture>
    </section>
  </main>

  <footer><!-- ... --></footer>
</body>
</html>`,
        output: `Lighthouse (mobile, Slow 4G, mid-range phone):
  Performance    98      LCP 1.6s   INP  90ms   CLS 0.00
  Accessibility 100      axe: 0 violations
  Best practices 100     CSP enforced, no console errors
  SEO           100      canonical + JSON-LD + description

Works offline after first visit. Installs on iPhone and Windows.
Readable with CSS disabled, usable with the keyboard alone.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The non-critical stylesheet is loaded with `media="print" onload="this.media=\'all\'"`. What does that trick achieve?',
        options: [
          'It only styles printed pages',
          'A print stylesheet is not render-blocking, so it downloads in parallel and is switched to apply to screens once it has loaded — first paint is never delayed by it',
          'It compresses the CSS',
          'It prevents the file being cached',
        ],
        answer: 1,
        explain:
          'The browser downloads stylesheets for other media at a lower priority without blocking rendering. Flipping `media` to `all` in `onload` applies it as soon as it arrives. Combined with inlined critical CSS, the page paints immediately and then upgrades — and the `<noscript>` fallback covers users without JavaScript.',
        hint: 'Which stylesheets block the first paint?',
      },
    },
  ],
}

export default level
