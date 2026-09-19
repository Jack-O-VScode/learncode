import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Making pages do things — JavaScript for the web',
  summary:
    'Add behaviour to your pages: find and change elements, respond to events, validate forms, store data, talk to APIs, and build a real single-page app by hand.',
  outcomes: [
    'Add JavaScript to a page correctly',
    'Select, read and modify elements from script',
    'Handle events, including delegation',
    'Create and remove elements safely',
    'Enhance forms and validate input',
    'Persist data and fetch JSON from an API',
  ],
  steps: [
    {
      id: 'html-s-01',
      title: 'Adding JavaScript to a page',
      read: `HTML is structure, CSS is presentation, **JavaScript is behaviour** — the only one of the three that can make decisions.

\`\`\`html
<script src="app.js" defer></script>
\`\`\`

## Where it goes, and why it matters

A plain \`<script>\` in \`<head>\` **blocks parsing**: the browser stops building the page, downloads the file, runs it, then carries on. And at that moment the elements your script wants do not exist yet.

Three fixes, in order of preference:

1. **\`defer\`** — download in parallel, run after the HTML is parsed, in order. This is the right default.
2. **\`type="module"\`** — deferred automatically, and gives you \`import\`/\`export\`.
3. Put the \`<script>\` last, just before \`</body>\` — the old way; works, but scatters your tags.

\`async\` downloads in parallel and runs **as soon as it lands**, in unpredictable order. It suits independent things like analytics, not your app.

## The console is your workbench

\`F12\` → Console. \`console.log(x)\` prints anything, and you can type expressions live against the current page. Every debugging session starts here.

## Modern syntax in one box

\`const\` for values that never get reassigned, \`let\` when they do, never \`var\`. Template literals with backticks for building strings. Arrow functions for short callbacks.`,
      sample: {
        lang: 'html',
        caption: 'Correct loading, then the syntax you will use constantly',
        code: `<head>
  <script src="app.js" defer></script>
  <script type="module" src="main.js"></script>
</head>

<script>
  const name = "Sam";      // cannot be reassigned
  let count = 0;           // can be
  count += 1;

  const greeting = \`Hello \${name}, you have \${count} message\${count === 1 ? "" : "s"}\`;
  console.log(greeting);

  const double = (n) => n * 2;
  console.log(double(21));

  const user = { name: "Sam", age: 17 };
  const { name: userName, age } = user;
  console.log(userName, age);

  const nums = [1, 2, 3, 4, 5];
  console.log(nums.filter((n) => n % 2 === 0).map((n) => n * 10));

  console.table(nums.map((n) => ({ n, squared: n * n })));
</script>`,
        output: `Hello Sam, you have 1 message
42
Sam 17
[20, 40]
┌─────────┬───┬─────────┐
│ (index) │ n │ squared │
├─────────┼───┼─────────┤
│    0    │ 1 │    1    │
│    1    │ 2 │    4    │
└─────────┴───┴─────────┘`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is `<script src="app.js" defer>` in `<head>` better than a plain `<script>` there?',
        options: [
          'It makes the file smaller',
          'It downloads in parallel without blocking parsing, and runs only once the HTML is fully parsed — so the elements it needs exist',
          'It caches the file permanently',
          'It runs the script twice for safety',
        ],
        answer: 1,
        explain:
          'A plain script halts HTML parsing while it downloads and runs, and at that point the `<body>` does not exist, so `document.querySelector` finds nothing. `defer` solves both problems and keeps execution order across multiple files.',
        hint: 'Two problems: blocking, and elements not existing yet.',
      },
    },

    {
      id: 'html-s-02',
      title: 'Finding elements and changing them',
      read: `## Selecting

\`\`\`js
document.querySelector(".card")       // the FIRST match, or null
document.querySelectorAll(".card")    // ALL matches, as a NodeList
document.getElementById("main")       // by id, marginally faster
\`\`\`

\`querySelector\` takes **any CSS selector**, which means everything you learned about selectors transfers directly.

A \`NodeList\` supports \`forEach\` but not \`map\` or \`filter\`. Convert with \`[...nodes]\` when you need array methods.

## Reading and writing

- \`el.textContent\` — the text. **Use this by default.**
- \`el.innerHTML\` — parses the string as HTML. Powerful, and **dangerous with untrusted input**: inserting user text this way is how cross-site scripting happens.
- \`el.value\` — for form controls (not \`textContent\`)
- \`el.classList.add/remove/toggle/contains\`
- \`el.setAttribute\` / \`getAttribute\`, and \`el.dataset.foo\` for \`data-foo\`
- \`el.style.color = "red"\` — inline style. Prefer toggling a class.

## The safe rule

**\`textContent\` for text, \`classList\` for appearance, \`innerHTML\` only for HTML you wrote yourself.**`,
      sample: {
        lang: 'html',
        caption: 'Selecting, reading, writing — and the XSS trap',
        code: `<h1 id="title">Original title</h1>
<p class="status">Waiting</p>
<ul class="items"><li>One</li><li>Two</li></ul>
<input id="name" value="Sam">
<div class="box" data-level="3">Box</div>

<script>
  const title = document.querySelector("#title");
  title.textContent = "Changed by JavaScript";

  const items = document.querySelectorAll(".items li");
  console.log(items.length);
  items.forEach((li, i) => { li.textContent = \`Item \${i + 1}\`; });

  const longest = [...items]
    .map((li) => li.textContent)
    .sort((a, b) => b.length - a.length)[0];
  console.log(longest);

  const status = document.querySelector(".status");
  status.classList.add("done");
  status.classList.toggle("blinking");
  console.log(status.classList.contains("done"));

  console.log(document.querySelector("#name").value);

  const box = document.querySelector(".box");
  console.log(box.dataset.level);
  box.dataset.level = "4";

  // SAFE: treated as text no matter what it contains
  status.textContent = '<img src=x onerror="alert(1)">';

  // UNSAFE if the string came from a user
  // status.innerHTML = userSuppliedText;
</script>`,
        output: `2
Item 1
true
Sam
3
The status element now literally displays: <img src=x onerror="alert(1)">`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why use `textContent` rather than `innerHTML` when inserting text a user typed?',
        options: [
          '`innerHTML` is deprecated',
          '`textContent` inserts the string as plain text, while `innerHTML` parses it as HTML — letting injected markup and scripts run',
          '`textContent` is faster to type',
          'They are identical',
        ],
        answer: 1,
        explain:
          'That is cross-site scripting (XSS). `innerHTML` with user input lets an attacker inject markup that runs in your page with your user\'s session. `textContent` escapes everything, which is why it should be the default.',
        hint: 'What does the browser do with `<script>` inside an innerHTML string?',
      },
    },

    {
      id: 'html-s-03',
      title: 'Events',
      read: `An **event** is something that happens: a click, a keypress, a form submit, a page load.

\`\`\`js
button.addEventListener("click", (event) => {
  console.log("clicked!", event.target);
});
\`\`\`

\`addEventListener\` takes the event name and a function to run. Use it rather than \`onclick="..."\` attributes — you can attach several handlers, and your behaviour stays out of your markup.

## Events you will use

\`click\`, \`input\` (fires on every keystroke), \`change\` (fires when the value is committed), \`submit\` (on the **form**, not the button), \`keydown\`, \`focus\`/\`blur\`, \`scroll\`, \`DOMContentLoaded\`.

## preventDefault

\`event.preventDefault()\` stops the browser's built-in response — the form navigating away, the link following its href. Essential for handling a form in JavaScript.

## Bubbling and delegation

An event fires on the target, then bubbles up through every ancestor. That enables **delegation**: attach one listener to a container instead of one per child.

\`\`\`js
list.addEventListener("click", (e) => {
  const button = e.target.closest(".delete");
  if (!button) return;
  button.closest("li").remove();
});
\`\`\`

One listener handles every item, including ones added later — which is why delegation is the standard approach for dynamic lists.`,
      sample: {
        lang: 'html',
        caption: 'Direct listeners, delegation, and preventDefault',
        code: `<form id="search">
  <input name="q" placeholder="Search...">
  <button>Go</button>
</form>
<p id="live"></p>
<ul id="todo">
  <li>Buy milk <button class="delete">×</button></li>
  <li>Walk dog <button class="delete">×</button></li>
</ul>

<script>
  const form = document.querySelector("#search");
  const input = form.querySelector("input");
  const live = document.querySelector("#live");

  form.addEventListener("submit", (e) => {
    e.preventDefault();                 // stay on the page
    live.textContent = \`Searching for "\${input.value}"...\`;
  });

  input.addEventListener("input", (e) => {
    live.textContent = \`\${e.target.value.length} characters\`;
  });

  // ONE listener for every delete button, now and in the future
  document.querySelector("#todo").addEventListener("click", (e) => {
    const button = e.target.closest(".delete");
    if (!button) return;
    button.closest("li").remove();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") input.value = "";
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });
</script>`,
        output: `Typing "hi"     -> "2 characters"
Pressing Go     -> 'Searching for "hi"...'  (page does not reload)
Clicking ×      -> that row disappears
Pressing /      -> jumps focus into the search box`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the main advantage of event delegation?',
        options: [
          'It works without JavaScript',
          'One listener on a parent handles all current *and future* children, instead of adding and removing listeners as items change',
          'It prevents events from bubbling',
          'It runs handlers in parallel',
        ],
        answer: 1,
        explain:
          'Because events bubble, a listener on the container sees clicks from any descendant. Items added later are covered automatically — no re-binding — and you hold one listener instead of hundreds.',
        hint: 'What happens with a per-item listener when you add a new item?',
      },
    },

    {
      id: 'html-s-04',
      title: 'Creating and removing elements',
      read: `## Creating

\`\`\`js
const li = document.createElement("li");
li.textContent = task;
li.classList.add("item");
list.append(li);
\`\`\`

- \`append()\` / \`prepend()\` — add at the end or start; accept several nodes *and* strings
- \`before()\` / \`after()\` / \`replaceWith()\` — relative to an element
- \`remove()\` — deletes itself, no parent reference needed

## Building several at once

Adding elements one at a time in a loop makes the browser re-layout on each pass. Build a **DocumentFragment** (an off-screen container) and append it once.

## \`<template>\`

The cleanest approach for repeated markup: write the structure in HTML inside a \`<template>\` (inert, never rendered), then clone it whenever you need a copy. Your markup stays in HTML where it belongs instead of being assembled from strings in JavaScript.

\`\`\`js
const node = template.content.cloneNode(true);
node.querySelector(".title").textContent = item.title;
list.append(node);
\`\`\`

## The rule worth keeping

Build with \`createElement\`/\`template\` and set text with \`textContent\`. It is safe by construction — there is no way for user data to become markup.`,
      sample: {
        lang: 'html',
        caption: 'The template approach, and a fragment for bulk insert',
        code: `<template id="card-template">
  <li class="card">
    <h3 class="card-title"></h3>
    <p class="card-body"></p>
    <button class="remove" type="button">Remove</button>
  </li>
</template>

<ul id="cards"></ul>

<script>
  const template = document.querySelector("#card-template");
  const list = document.querySelector("#cards");

  const notes = [
    { title: "Milk", body: "Semi-skimmed" },
    { title: "Bread", body: "Sourdough <if they have it>" },
  ];

  const fragment = document.createDocumentFragment();

  for (const note of notes) {
    const node = template.content.cloneNode(true);
    node.querySelector(".card-title").textContent = note.title;
    node.querySelector(".card-body").textContent = note.body;
    fragment.append(node);
  }

  list.append(fragment);   // one insertion, one layout

  list.addEventListener("click", (e) => {
    if (e.target.matches(".remove")) e.target.closest(".card").remove();
  });

  const empty = document.createElement("p");
  empty.textContent = "Nothing yet.";
  empty.hidden = notes.length > 0;
  list.after(empty);
</script>`,
        output: `Milk
Semi-skimmed
[Remove]

Bread
Sourdough <if they have it>     <- angle brackets shown as text, not parsed
[Remove]`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why append 200 new elements to a DocumentFragment before adding it to the page?',
        options: [
          'Fragments validate the HTML first',
          'The fragment is off-screen, so the browser lays out and paints once instead of 200 times',
          'It is the only way to add multiple elements',
          'Fragments allow duplicate ids',
        ],
        answer: 1,
        explain:
          'Every insertion into the live document can trigger layout work. Assembling off-screen and inserting once collapses that into a single pass — a noticeable difference on long lists and slow devices.',
        hint: 'What does the browser have to redo after each live insertion?',
      },
    },

    {
      id: 'html-s-05',
      title: 'Classes, data attributes and state',
      read: `The cleanest way to change appearance from JavaScript is **not** to set styles — it is to toggle a class and let CSS decide what that means.

\`\`\`js
menu.classList.toggle("is-open");
\`\`\`

\`\`\`css
.menu { display: none; }
.menu.is-open { display: block; }
\`\`\`

The appearance stays entirely in CSS; JavaScript only records the state. A naming convention like \`is-\` or \`has-\` makes state classes obvious at a glance.

## Data attributes

\`data-*\` attributes store information on an element, readable as \`el.dataset.*\`:

\`\`\`html
<button data-id="42" data-action="delete">Delete</button>
\`\`\`
\`\`\`js
console.log(button.dataset.id, button.dataset.action);
\`\`\`

Kebab-case in HTML (\`data-user-id\`) becomes camelCase in JS (\`dataset.userId\`). Pair it with delegation and one listener can dispatch on \`dataset.action\` for a whole interface.

## State that accessibility needs

Visual state is not enough. A toggle button must also update \`aria-expanded\`, a modal needs \`aria-hidden\` on the background, a tab needs \`aria-selected\`. Keep the ARIA attribute and the class in the same line of code so they can never disagree.`,
      sample: {
        lang: 'html',
        caption: 'One listener dispatching on data-action, with ARIA kept in sync',
        code: `<button id="menu-toggle" aria-expanded="false" aria-controls="menu">
  Menu
</button>
<nav id="menu" class="menu" hidden>
  <ul>
    <li><button data-action="theme" data-value="light">Light</button></li>
    <li><button data-action="theme" data-value="dark">Dark</button></li>
    <li><button data-action="reset">Reset</button></li>
  </ul>
</nav>

<script>
  const toggle = document.querySelector("#menu-toggle");
  const menu = document.querySelector("#menu");

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));   // never drifts
  });

  menu.addEventListener("click", (e) => {
    const button = e.target.closest("[data-action]");
    if (!button) return;

    switch (button.dataset.action) {
      case "theme":
        document.documentElement.dataset.theme = button.dataset.value;
        break;
      case "reset":
        delete document.documentElement.dataset.theme;
        break;
    }
  });
</script>

<style>
  .menu { display: none; }
  .menu.is-open { display: block; }
  :root[data-theme="dark"] { --bg: #0b1020; --ink: #e8ecf8; }
</style>`,
        output: `Click Menu   -> nav appears, aria-expanded="true"
Click Dark   -> <html data-theme="dark">, whole page re-themes via CSS
Click Reset  -> attribute removed, back to system preference`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why toggle a class rather than setting `element.style.display` directly?',
        options: [
          'Inline styles are not supported in modern browsers',
          'It keeps all appearance decisions in CSS — including transitions, media queries and dark mode — while JavaScript only records state',
          'Classes are faster to apply',
          'Inline styles cannot be removed',
        ],
        answer: 1,
        explain:
          'Setting `style.display` hard-codes one appearance in JavaScript and wins over your stylesheet, so responsive rules and themes can no longer affect it. A class lets CSS keep doing its job and keeps the two languages in their lanes.',
        hint: 'What happens to your media queries when JS writes an inline style?',
      },
    },

    {
      id: 'html-s-06',
      title: 'Forms and validation in JavaScript',
      read: `## Reading a form

\`\`\`js
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const values = Object.fromEntries(data);
});
\`\`\`

\`FormData\` collects every named control in one object — far better than reading each field by id.

## Work with the built-in validation

The browser already validates \`required\`, \`type="email"\`, \`minlength\` and \`pattern\`. Do not replace it; extend it.

- \`input.validity\` — an object of specific failures (\`valueMissing\`, \`typeMismatch\`, \`tooShort\`…)
- \`form.checkValidity()\` — true/false without showing messages
- \`input.setCustomValidity("...")\` — supply your own message; set it back to \`""\` to clear
- \`:invalid\` / \`:valid\` CSS — but style \`:user-invalid\` instead, so a field is not red before it has been touched

## When to validate

Validating on every keystroke punishes people mid-typing. The kind pattern: validate on \`blur\` (they have finished the field) and on \`submit\`; once a field is *already* showing an error, re-check on \`input\` so it clears the instant they fix it.

## Always validate on the server

Client-side validation is for helpfulness. Anyone can bypass it entirely. The server must never trust what arrives.`,
      sample: {
        lang: 'html',
        caption: 'FormData, custom rules, accessible error messages',
        code: `<form id="signup" novalidate>
  <div class="field">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required
           aria-describedby="email-error">
    <p class="error" id="email-error" role="alert"></p>
  </div>

  <div class="field">
    <label for="pw">Password</label>
    <input type="password" id="pw" name="password" required minlength="8"
           aria-describedby="pw-error">
    <p class="error" id="pw-error" role="alert"></p>
  </div>

  <button type="submit">Create account</button>
</form>

<script>
  const form = document.querySelector("#signup");

  const messageFor = (input) => {
    const v = input.validity;
    if (v.valueMissing) return "This field is required.";
    if (v.typeMismatch) return "That does not look like an email address.";
    if (v.tooShort) return \`Use at least \${input.minLength} characters.\`;
    if (input.name === "password" && !/\\d/.test(input.value)) {
      return "Include at least one number.";
    }
    return "";
  };

  const show = (input) => {
    const message = messageFor(input);
    document.querySelector(\`#\${input.id}-error\`).textContent = message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
    return message === "";
  };

  for (const input of form.elements) {
    if (!input.name) continue;
    input.addEventListener("blur", () => show(input));
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") show(input);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const inputs = [...form.elements].filter((el) => el.name);
    const allValid = inputs.map(show).every(Boolean);
    if (!allValid) {
      inputs.find((i) => i.getAttribute("aria-invalid") === "true").focus();
      return;
    }
    const values = Object.fromEntries(new FormData(form));
    console.log("submitting", values);
  });
</script>`,
        output: `Leave email blank, tab away -> "This field is required." (announced by role="alert")
Type "abc", tab away        -> "That does not look like an email address."
Fix it mid-typing           -> the message clears as soon as it becomes valid
Submit with errors          -> focus jumps to the first bad field`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must a server validate data even when the form already validates in the browser?',
        options: [
          'Browsers validate inconsistently',
          'Client-side validation is only a convenience — requests can be sent directly, bypassing the page entirely',
          'Server validation is faster',
          'It is required by HTML5',
        ],
        answer: 1,
        explain:
          'Anyone can send a request with curl, devtools or a script and never load your page at all. Client-side checks improve the experience for honest users; the server is the only place where the rules are actually enforced.',
        hint: 'Does an attacker have to use your form?',
      },
    },

    {
      id: 'html-s-07',
      title: 'Storing data in the browser',
      read: `## localStorage

\`\`\`js
localStorage.setItem("theme", "dark");
localStorage.getItem("theme");     // "dark", or null
localStorage.removeItem("theme");
\`\`\`

- Survives closing the browser
- Roughly 5MB, per origin
- **Strings only** — use \`JSON.stringify\` / \`JSON.parse\` for objects
- **Synchronous**, so a large read blocks the page. Keep it small.

\`sessionStorage\` is identical but cleared when the tab closes.

## Always wrap it in try/catch

In private mode, with cookies blocked, or when the quota is full, these calls **throw**. A page that crashes because it could not save a preference is a bad page.

## What not to put in it

Never store passwords, tokens or personal data. Any script on your page can read localStorage, so an XSS bug turns straight into a stolen session.

## The others

- **IndexedDB** — asynchronous, large, structured. For real offline data; use a small wrapper library.
- **Cookies** — sent with every request, so they are for the server, not for app state.
- **Cache API** — for offline files, used by service workers.`,
      sample: {
        lang: 'html',
        caption: 'A safe wrapper, and the theme preference pattern',
        code: `<script>
  const store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;      // private mode, blocked storage, bad JSON
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;         // quota exceeded, or storage disabled
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    },
  };

  // theme: remember an explicit choice, otherwise follow the system
  const saved = store.get("theme");
  if (saved) document.documentElement.dataset.theme = saved;

  document.querySelector("#theme-toggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    store.set("theme", next);
  });

  // a draft that survives an accidental refresh
  const draft = document.querySelector("#draft");
  if (draft) {
    draft.value = store.get("draft", "");
    draft.addEventListener("input", () => store.set("draft", draft.value));
  }

  // react when another tab changes the same key
  window.addEventListener("storage", (e) => {
    if (e.key === "theme") document.documentElement.dataset.theme = e.newValue;
  });
</script>`,
        output: `Pick dark, close the browser, come back -> still dark.
Type half a comment, hit refresh by accident -> the text is still there.
Change the theme in one tab -> the other tab updates too.
Open the page in private mode with storage blocked -> everything still works.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why should `localStorage.setItem` be wrapped in try/catch?',
        options: [
          'It is asynchronous and may fail later',
          'It throws when storage is disabled, unavailable in private mode, or the quota is exceeded — and an unhandled throw breaks the rest of your script',
          'To convert the value to a string',
          'It is not necessary in modern browsers',
        ],
        answer: 1,
        explain:
          'Storage access genuinely throws in several ordinary situations. Since an uncaught exception stops the remaining code in that handler, one failed preference save can take the whole page with it.',
        hint: 'What happens to the lines after it when it throws?',
      },
    },

    {
      id: 'html-s-08',
      title: 'fetch and working with APIs',
      read: `\`fetch\` requests data from a server without reloading the page.

\`\`\`js
const response = await fetch("https://api.example.com/items");
if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
const data = await response.json();
\`\`\`

## The trap everyone hits

**\`fetch\` does not reject on a 404 or a 500.** It only rejects when the request could not be made at all. A 404 is a *successful* HTTP exchange as far as fetch is concerned. You must check \`response.ok\` yourself — every time.

## async / await

\`await\` pauses inside an \`async\` function until a promise settles. It is the same machinery as \`.then()\`, written so it reads top to bottom. Wrap it in \`try/catch/finally\` for errors and cleanup.

## Sending data

\`\`\`js
await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
\`\`\`

## CORS

A browser blocks reading a response from another origin unless that server opts in with \`Access-Control-Allow-Origin\`. This is a **server** decision — you cannot fix CORS from the client, and the common advice to "disable CORS" means disabling a protection for your users.

## The three states

Every request needs **loading**, **error** and **empty** handling, not just the happy path. Users spend more time in those states than you expect.`,
      sample: {
        lang: 'html',
        caption: 'All four states, with a timeout and no innerHTML',
        code: `<div id="status" role="status"></div>
<ul id="results"></ul>

<script>
  const status = document.querySelector("#status");
  const results = document.querySelector("#results");

  async function loadUsers() {
    status.textContent = "Loading…";
    results.replaceChildren();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch("https://api.example.com/users", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error(\`Server said \${response.status}\`);

      const users = await response.json();

      if (users.length === 0) {
        status.textContent = "No users yet.";
        return;
      }

      const fragment = document.createDocumentFragment();
      for (const user of users) {
        const li = document.createElement("li");
        li.textContent = \`\${user.name} — \${user.email}\`;
        fragment.append(li);
      }
      results.append(fragment);
      status.textContent = \`\${users.length} users\`;

    } catch (error) {
      status.textContent =
        error.name === "AbortError"
          ? "That took too long. Try again."
          : \`Could not load users: \${error.message}\`;
    } finally {
      clearTimeout(timeout);
    }
  }

  loadUsers();
</script>`,
        output: `Loading…
3 users
  Ada Lovelace — ada@example.com
  Alan Turing — alan@example.com
  Grace Hopper — grace@example.com

(server down)  Could not load users: Failed to fetch
(500 response) Could not load users: Server said 500
(slow network) That took too long. Try again.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'The server returns 404. What does `await fetch(url)` do?',
        options: [
          'Throws an error you can catch',
          'Resolves normally with `response.ok === false` — you must check it yourself',
          'Returns `null`',
          'Retries automatically',
        ],
        answer: 1,
        explain:
          '`fetch` rejects only when the request itself fails — no network, DNS failure, CORS block. Any HTTP response, including 404 and 500, counts as success. Forgetting `if (!response.ok)` means calling `.json()` on an error page and getting a confusing parse error instead of the real problem.',
        hint: 'Did the request reach the server and come back?',
      },
    },

    {
      id: 'html-s-09',
      title: 'Animation and SVG from script',
      read: `## The Web Animations API

\`element.animate(keyframes, options)\` gives you CSS-quality animation with JavaScript control:

\`\`\`js
const animation = card.animate(
  [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
  { duration: 300, easing: "ease-out", fill: "both" }
);
await animation.finished;
\`\`\`

You get \`pause()\`, \`reverse()\`, \`playbackRate\` and a \`finished\` promise — none of which CSS animations offer.

## SVG

SVG is markup, so it lives in your HTML and is scriptable like anything else. Vector, so it stays sharp at any size, and usually a fraction of the bytes of a PNG.

- Inline SVG can be styled with CSS (\`fill\`, \`stroke\`) and inherits \`currentColor\` — perfect for icons that follow the text colour
- Decorative SVG gets \`aria-hidden="true"\`; meaningful SVG gets \`role="img"\` and a \`<title>\`

## IntersectionObserver

For "do something when this scrolls into view" — reveal animations, lazy loading, infinite scroll. It is asynchronous and off the main thread, unlike a \`scroll\` listener that fires hundreds of times a second.

## requestAnimationFrame

For per-frame work, when you genuinely need it. It runs just before the next paint, so nothing is wasted on frames the user never sees.`,
      sample: {
        lang: 'html',
        caption: 'Scroll reveals, a scriptable icon, and an animation you can control',
        code: `<svg class="icon" width="24" height="24" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
  <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>

<button id="play">Pulse</button>
<div class="card reveal">Scrolls into view…</div>

<script>
  // reveal on scroll, honouring reduced motion
  const motionOK = window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (motionOK) {
        entry.target.animate(
          [{ opacity: 0, transform: "translateY(16px)" },
           { opacity: 1, transform: "none" }],
          { duration: 400, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" }
        );
      }
      observer.unobserve(entry.target);     // only once
    }
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

  // an animation you can pause, reverse and await
  const icon = document.querySelector(".icon");
  const pulse = icon.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
    { duration: 600, iterations: Infinity }
  );
  pulse.pause();

  document.querySelector("#play").addEventListener("click", () => {
    pulse.playState === "running" ? pulse.pause() : pulse.play();
  });
</script>

<style>
  .icon { color: #16a34a; }   /* currentColor drives the stroke */
</style>`,
        output: `The tick icon is green because it inherits currentColor.
Cards fade and slide up the first time they enter the viewport — once each.
The Pulse button starts and stops the looping scale animation.
With "reduce motion" on, cards simply appear.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why use `IntersectionObserver` instead of a `scroll` listener to detect when an element is visible?',
        options: [
          'It works in older browsers',
          'It is asynchronous and off the main thread, whereas a scroll handler fires constantly and must measure positions on every frame',
          'It can observe only one element',
          'Scroll events do not fire on mobile',
        ],
        answer: 1,
        explain:
          'A scroll handler calling `getBoundingClientRect()` forces layout hundreds of times a second and is a classic cause of janky scrolling. IntersectionObserver lets the browser do the work efficiently and calls you only when the intersection actually changes.',
        hint: 'How often does a scroll event fire, and what does measuring cost?',
      },
    },

    {
      id: 'html-s-10',
      title: 'Performance basics',
      read: `## Images are almost always the problem

They are usually 70–90% of a page's bytes.

- Serve the right size — a 4000px photo in a 400px slot wastes 99% of the download
- Use \`srcset\`/\`sizes\`, and modern formats (**AVIF**, **WebP**)
- \`loading="lazy"\` on anything below the fold — but **never** on your hero image, which should load first
- Always set \`width\` and \`height\` so the browser reserves space and the page does not jump

## Layout shift

Content jumping around as things load is measured as **CLS**, and it is infuriating. Causes: images without dimensions, ads and embeds injected at the top, and web fonts swapping. Reserve space with \`aspect-ratio\` and use \`font-display: swap\` with a well-matched fallback.

## Load order

- CSS in \`<head>\` — it blocks rendering, which is correct; keep it small
- JavaScript with \`defer\`
- \`preload\` only what is genuinely critical; preloading everything helps nothing
- Self-host fonts, subset them, and prefer \`woff2\`

## Measure, do not guess

Devtools → Lighthouse gives a score plus specific fixes. Then use the **Network** panel with throttling set to "Slow 4G" — most of the world is not on your office wifi.`,
      sample: {
        lang: 'html',
        caption: 'A head and hero tuned for first paint',
        code: `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- the one font actually needed above the fold -->
  <link rel="preload" href="/fonts/inter-var.woff2" as="font"
        type="font/woff2" crossorigin>

  <style>
    /* critical CSS inline: first paint needs no extra round trip */
    @font-face {
      font-family: "Inter";
      src: url("/fonts/inter-var.woff2") format("woff2");
      font-display: swap;
      font-weight: 100 900;
    }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; }
    .hero { min-height: 60dvh; display: grid; place-items: center; }
    .hero img { aspect-ratio: 16 / 9; width: 100%; height: auto; }
  </style>

  <link rel="stylesheet" href="/styles/main.css">
  <script src="/app.js" defer></script>
</head>

<body>
  <!-- hero: eager, high priority, NOT lazy -->
  <picture class="hero">
    <source srcset="/img/hero.avif" type="image/avif">
    <source srcset="/img/hero.webp" type="image/webp">
    <img src="/img/hero.jpg" alt="Sunrise over the moors"
         width="1600" height="900" fetchpriority="high" decoding="async">
  </picture>

  <!-- everything below the fold: lazy -->
  <img src="/img/gallery-1.jpg" alt="A stone bridge"
       width="800" height="600" loading="lazy" decoding="async">
</body>`,
        output: `Lighthouse (Slow 4G):
  First Contentful Paint   0.9 s
  Largest Contentful Paint 1.4 s
  Cumulative Layout Shift  0.00   <- because every image has width/height
  Total page weight        410 KB (was 3.2 MB before AVIF + correct sizes)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why should the hero image *not* have `loading="lazy"`?',
        options: [
          'Lazy loading does not work on large images',
          'It is visible immediately, so deferring it delays the largest paint the user is waiting for',
          '`loading="lazy"` breaks `srcset`',
          'Hero images are always small',
        ],
        answer: 1,
        explain:
          'Lazy loading postpones the request until the image is near the viewport — which for the hero means adding a round trip before the most important pixels appear. Lazy-load what is below the fold; for the hero, do the opposite with `fetchpriority="high"`.',
        hint: 'Where is the hero image when the page first paints?',
      },
    },

    {
      id: 'html-s-11',
      title: 'Organising a real front-end project',
      read: `## Modules

\`\`\`js
// storage.js
export function save(key, value) { ... }

// app.js
import { save } from "./storage.js";
\`\`\`

With \`<script type="module">\` this works natively — no build step. Modules have their own scope, so nothing leaks onto \`window\`, and they are deferred by default.

Note: modules need a real server. \`file://\` will not load them, which is one more reason to run \`python -m http.server\`.

## A structure that scales

\`\`\`
src/
  index.html
  styles/  base.css  components.css
  js/      app.js  storage.js  api.js  ui.js
  assets/  images/  fonts/
\`\`\`

Group by **feature** once a project grows past a dozen files, not by file type.

## When you need a bundler

Vite is the usual answer. You want one once you need: npm packages, TypeScript, hashed filenames for cache-busting, or minification. Below that, plain modules are genuinely fine and much easier to reason about.

## Ship it

Netlify, Vercel, Cloudflare Pages and GitHub Pages all host a static site free, with https, a CDN and deploy-on-push. There is no reason for a finished page to sit on your laptop.`,
      sample: {
        lang: 'js',
        caption: 'Native modules — three focused files, no build step',
        code: `// index.html contains just one line:
//   <script type="module" src="./js/app.js"></script>

// ---------------------------------------------------------------- storage.js
export const KEY = "notes";

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}

export function save(notes) {
  try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* full */ }
}

// --------------------------------------------------------------------- ui.js
export function render(list, notes, onDelete) {
  list.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const note of notes) {
    const li = document.createElement("li");
    li.textContent = note.text;
    const button = document.createElement("button");
    button.textContent = "×";
    button.addEventListener("click", () => onDelete(note.id));
    li.append(button);
    fragment.append(li);
  }
  list.append(fragment);
}

// -------------------------------------------------------------------- app.js
import { load, save } from "./storage.js";
import { render } from "./ui.js";

const list = document.querySelector("#notes");
let notes = load();

function update(next) {
  notes = next;
  save(notes);
  render(list, notes, remove);
}

function remove(id) {
  update(notes.filter((n) => n.id !== id));
}

document.querySelector("#add").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = e.target.elements.text;
  if (!input.value.trim()) return;
  update([...notes, { id: crypto.randomUUID(), text: input.value.trim() }]);
  input.value = "";
});

render(list, notes, remove);`,
        output: `storage.js — knows about saving, nothing about the DOM
ui.js      — knows about the DOM, nothing about storage
app.js     — wires them together and owns the state

Swap localStorage for a server API and only storage.js changes.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why can `<script type="module">` not be loaded from a `file://` page?',
        options: [
          'Modules need to be compiled first',
          'Modules are fetched with CORS rules, and `file://` has no origin to satisfy them — so a real server is required',
          'Modules only work in Chrome',
          'The `.js` extension is wrong for modules',
        ],
        answer: 1,
        explain:
          'Module imports go through the same origin-checked fetch machinery as network requests, and `file://` URLs are treated as opaque origins. `python -m http.server` (or any dev server) fixes it immediately — the same reason `fetch` and service workers also need one.',
        hint: 'What origin does a file opened from your desktop have?',
      },
    },

    {
      id: 'html-s-12',
      title: 'Project: a to-do app in one page',
      read: `A complete application: state, rendering, persistence, filtering, keyboard support and accessibility — in plain HTML, CSS and JavaScript with no framework.

The architecture is the lesson:

1. **One source of truth.** The \`todos\` array. Nothing reads state from the DOM.
2. **One render function.** Any change calls \`update()\`, which saves and re-renders. No hunting for the element to patch by hand.
3. **Delegation.** One listener on the list handles every item's toggle and delete, including items that do not exist yet.
4. **\`textContent\` only.** User text can never become markup.
5. **Accessible by construction.** Real \`<button>\`s, real \`<label>\`s, a live region announcing the count, and visible focus.

That "state → render" loop is exactly what React, Vue and Svelte automate. Writing it by hand once is the best way to understand what they are actually doing for you.`,
      sample: {
        lang: 'html',
        caption: 'The whole app — state, render, persist, delegate',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Things — a to-do list</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  :root {
    color-scheme: light dark;
    --bg: #fbfbfd; --surface: #fff; --ink: #18181b;
    --muted: #71717a; --border: #e4e4e7; --brand: #4f46e5;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #09090b; --surface: #18181b; --ink: #fafafa;
            --muted: #a1a1aa; --border: #27272a; --brand: #818cf8; }
  }
  body {
    margin: 0; padding: 2rem 1rem; background: var(--bg); color: var(--ink);
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.6;
  }
  .app { max-width: 34rem; margin-inline: auto; }
  form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  input[type="text"] {
    flex: 1; padding: 0.75rem; font-size: 1rem;
    border: 1px solid var(--border); border-radius: 10px;
    background: var(--surface); color: inherit;
  }
  button {
    font: inherit; cursor: pointer; border: 1px solid var(--border);
    background: var(--surface); color: inherit;
    padding: 0.75rem 1rem; border-radius: 10px;
  }
  button.primary { background: var(--brand); color: #fff; border-color: transparent; }
  :focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
  .filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .filters button[aria-pressed="true"] { border-color: var(--brand); color: var(--brand); }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
  li {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.75rem; background: var(--surface);
    border: 1px solid var(--border); border-radius: 10px;
  }
  li.done .text { text-decoration: line-through; color: var(--muted); }
  .text { flex: 1; overflow-wrap: anywhere; }
  .count { color: var(--muted); font-size: 0.9rem; margin-top: 1rem; }
  .empty { color: var(--muted); text-align: center; padding: 2rem 0; }
</style>
</head>
<body>
<main class="app">
  <h1>Things</h1>

  <form id="add">
    <label for="text" class="sr-only">New item</label>
    <input type="text" id="text" name="text" placeholder="What needs doing?"
           autocomplete="off" required>
    <button class="primary" type="submit">Add</button>
  </form>

  <div class="filters" role="group" aria-label="Filter items">
    <button type="button" data-filter="all" aria-pressed="true">All</button>
    <button type="button" data-filter="active" aria-pressed="false">Active</button>
    <button type="button" data-filter="done" aria-pressed="false">Done</button>
  </div>

  <ul id="list"></ul>
  <p class="count" id="count" role="status"></p>
</main>

<script type="module">
  const KEY = "things.v1";
  const list = document.querySelector("#list");
  const count = document.querySelector("#count");

  // ---- state -------------------------------------------------------------
  let todos = read();
  let filter = "all";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
    catch { return []; }
  }

  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(todos)); } catch { /* full */ }
  }

  function update(next) {
    todos = next;
    write();
    render();
  }

  // ---- render ------------------------------------------------------------
  function visible() {
    if (filter === "active") return todos.filter((t) => !t.done);
    if (filter === "done") return todos.filter((t) => t.done);
    return todos;
  }

  function render() {
    const items = visible();
    list.replaceChildren();

    if (items.length === 0) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = todos.length === 0
        ? "Nothing here yet. Add something above."
        : "Nothing matches this filter.";
      list.append(p);
    } else {
      const fragment = document.createDocumentFragment();
      for (const todo of items) {
        const li = document.createElement("li");
        li.className = todo.done ? "done" : "";
        li.dataset.id = todo.id;

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = todo.done;
        checkbox.id = \`cb-\${todo.id}\`;

        const label = document.createElement("label");
        label.className = "text";
        label.htmlFor = checkbox.id;
        label.textContent = todo.text;      // never innerHTML

        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "delete";
        remove.textContent = "×";
        remove.setAttribute("aria-label", \`Delete "\${todo.text}"\`);

        li.append(checkbox, label, remove);
        fragment.append(li);
      }
      list.append(fragment);
    }

    const left = todos.filter((t) => !t.done).length;
    count.textContent = \`\${left} of \${todos.length} left\`;
  }

  // ---- events ------------------------------------------------------------
  document.querySelector("#add").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.target.elements.text;
    const text = input.value.trim();
    if (!text) return;
    update([...todos, { id: crypto.randomUUID(), text, done: false }]);
    input.value = "";
    input.focus();
  });

  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    if (e.target.dataset.action === "delete") {
      update(todos.filter((t) => t.id !== li.dataset.id));
    }
  });

  list.addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    const id = e.target.closest("li").dataset.id;
    update(todos.map((t) => (t.id === id ? { ...t, done: e.target.checked } : t)));
  });

  document.querySelector(".filters").addEventListener("click", (e) => {
    const button = e.target.closest("[data-filter]");
    if (!button) return;
    filter = button.dataset.filter;
    for (const b of e.currentTarget.querySelectorAll("[data-filter]")) {
      b.setAttribute("aria-pressed", String(b === button));
    }
    render();
  });

  render();
</script>
</body>
</html>`,
        output: `Add "buy milk"       -> appears, "1 of 1 left"
Tick it              -> struck through, "0 of 1 left"
Filter: Active       -> "Nothing matches this filter."
Refresh the page     -> everything is still there
Type <b>hi</b>       -> shown literally, never rendered as HTML
Tab through          -> input, Add, filters, each checkbox and delete button`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Every change calls `update()`, which re-renders the whole list rather than patching the one row that changed. Why is that a good trade at this size?',
        options: [
          'Re-rendering is always faster than patching',
          'There is one code path for every change, so the screen can never disagree with the state — and for a list this size the cost is invisible',
          'The DOM cannot be patched selectively',
          'It uses less memory',
        ],
        answer: 1,
        explain:
          'Hand-patching means every action needs its own DOM-updating code, and any one of them can be forgotten — that is how interfaces drift out of sync with their data. One render path removes the whole class of bug. Frameworks let you keep that model at scale by making the re-render cheap; at this size you do not need them.',
        hint: 'What kind of bug becomes impossible when there is only one way to update the screen?',
      },
    },
  ],
}

export default level
