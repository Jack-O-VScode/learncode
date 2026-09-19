import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Your first web pages',
  summary:
    'From a blank file to a real page you can open in a browser. Tags, the page skeleton, headings, text, links, images and lists — everything you need to publish something today.',
  outcomes: [
    'Create an HTML file and open it in a browser',
    'Write correct tags, elements and attributes',
    'Build the standard page skeleton from memory',
    'Structure text with headings, paragraphs and lists',
    'Add links to other pages and images to your own',
    'Spot and fix the mistakes beginners make most',
  ],
  steps: [
    {
      id: 'html-b-01',
      title: 'What HTML is and how a browser reads it',
      read: `**HTML** stands for HyperText Markup Language. Notice the middle word: it is not a programming language. It has no maths, no decisions, no loops. It is a way of **marking up** text to say what each part *is* — this bit is a heading, that bit is a paragraph, this is a link.

A browser reads your marked-up text and decides how to show it. Headings come out big and bold, paragraphs get space around them, links become clickable and blue. You describe the **meaning**; the browser supplies a default appearance. (Later, CSS lets you take control of that appearance.)

## The best part

You already have everything you need. Any text editor writes HTML, and the browser already on your computer displays it. No installing, no compiling, no waiting.

## How to try this now

1. Open Notepad (Windows) or TextEdit (Mac, in *plain text* mode) — or better, VS Code.
2. Type the sample below.
3. Save it as \`index.html\` — the \`.html\` part is what matters.
4. Double-click the file. It opens in your browser.

Change a word, save, refresh the browser. That loop — edit, save, refresh — is the whole job.`,
      sample: {
        lang: 'html',
        caption: 'A complete, valid web page',
        code: `<h1>My First Web Page</h1>
<p>Hello! I made this.</p>
<p>This is a second paragraph.</p>`,
        output: `My First Web Page   <- large and bold
Hello! I made this.
This is a second paragraph.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is HTML described as a *markup* language rather than a programming language?',
        options: [
          'Because it is easier to learn',
          'Because it describes what content *is*, rather than telling the computer to calculate or decide anything',
          'Because it only runs in browsers',
          'Because it was invented before programming languages',
        ],
        answer: 1,
        explain:
          'HTML labels content with meaning — heading, paragraph, list, link. It has no variables, conditions or loops, so it cannot compute anything. The browser reads those labels and renders them.',
        hint: 'What can HTML not do that Python can?',
      },
    },

    {
      id: 'html-b-02',
      title: 'Tags, elements and attributes',
      read: `HTML is built from **tags**, written inside angle brackets.

\`\`\`html
<p>Some text</p>
\`\`\`

- \`<p>\` is the **opening tag**
- \`</p>\` is the **closing tag** — note the slash
- Everything from the opening tag to the closing tag is an **element**

## Tags that do not close

A few elements have no content, so they have no closing tag. These are **void elements**: \`<img>\`, \`<br>\`, \`<hr>\`, \`<input>\`, \`<meta>\`, \`<link>\`. Writing \`</img>\` is an error.

## Attributes

Extra information goes in the opening tag as \`name="value"\` pairs:

\`\`\`html
<a href="https://example.com">Visit</a>
<img src="cat.jpg" alt="A sleeping cat">
\`\`\`

- Always use **lower case** tag and attribute names
- Always wrap attribute values in **double quotes**
- Separate multiple attributes with a space

## Whitespace

HTML collapses runs of spaces, tabs and newlines into a single space. Pressing Enter twenty times in your source changes nothing on screen — you need \`<br>\` or a new \`<p>\`. Which means you are free to indent your source however is clearest.`,
      sample: {
        lang: 'html',
        caption: 'Anatomy of elements with and without content',
        code: `<h2>About me</h2>

<p>I am learning        HTML.
All this extra    whitespace collapses.</p>

<p>First line<br>Second line</p>

<hr>

<a href="https://developer.mozilla.org" title="The best reference">MDN docs</a>

<img src="photo.jpg" alt="Me at the beach" width="300">`,
        output: `About me
I am learning HTML. All this extra whitespace collapses.
First line
Second line
─────────────────────────
MDN docs  (a clickable link)
[a 300px-wide photo]`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which line is written correctly?',
        options: [
          '<IMG SRC=cat.jpg></IMG>',
          '<img src="cat.jpg" alt="A cat">',
          '<img src="cat.jpg" alt=A cat>',
          '<img "cat.jpg">',
        ],
        answer: 1,
        explain:
          'Lower-case tag name, attribute values in double quotes, and no closing tag because `<img>` is a void element. Unquoted values break as soon as they contain a space, which is why `alt=A cat` fails.',
        hint: 'Check three things: case, quotes, and whether this element should close.',
      },
    },

    {
      id: 'html-b-03',
      title: 'The page skeleton',
      read: `A real page is not just loose tags — it has a required structure. Learn this by heart; you will type it hundreds of times.

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page title</title>
  </head>
  <body>
    <!-- everything you can see goes here -->
  </body>
</html>
\`\`\`

Line by line:

- \`<!DOCTYPE html>\` — "this is modern HTML". Without it browsers slip into a 1990s compatibility mode where things break oddly.
- \`<html lang="en">\` — wraps everything. \`lang\` helps screen readers pronounce your page and browsers offer translation.
- \`<head>\` — information **about** the page. Nothing here is displayed in the page itself.
- \`<meta charset="UTF-8">\` — the character set. Without it, accents and emoji turn into rubbish.
- \`<meta name="viewport" ...>\` — makes the page size itself correctly on phones. Leave it out and mobile users get a tiny zoomed-out desktop page.
- \`<title>\` — the browser tab text, the bookmark name, and what Google shows as the headline.
- \`<body>\` — everything the visitor actually sees.

> VS Code shortcut: in an empty \`.html\` file type \`!\` and press Tab. The whole skeleton appears.`,
      sample: {
        lang: 'html',
        caption: 'The full template — start every page with this',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sam's Homepage</title>
  </head>
  <body>
    <h1>Sam's Homepage</h1>
    <p>Welcome to my corner of the internet.</p>
  </body>
</html>`,
        output: `[Browser tab reads: Sam's Homepage]

Sam's Homepage
Welcome to my corner of the internet.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which element does the text in `<title>` appear in?',
        options: [
          'At the top of the page, above the first heading',
          'In the browser tab, bookmarks and search results — not in the page itself',
          'Only in the page source',
          'As a tooltip when hovering the page',
        ],
        answer: 1,
        explain:
          '`<title>` lives in `<head>`, and nothing in `<head>` is drawn inside the page. To put a visible title on the page you also need an `<h1>` in the `<body>` — which is why most pages have both, usually with the same words.',
        hint: 'Where does `<title>` live — `head` or `body`?',
      },
    },

    {
      id: 'html-b-04',
      title: 'Headings and paragraphs',
      read: `## Headings

Six levels, \`<h1>\` down to \`<h6>\`. They are not font sizes — they are an **outline** of your document, like chapter and section headings in a book.

The rules that matter:

1. **One \`<h1>\` per page**, describing what the whole page is about.
2. **Do not skip levels.** \`<h1>\` then \`<h3>\` leaves a hole in the outline.
3. **Never choose a heading level for its size.** If \`<h2>\` looks too big, change it with CSS — do not reach for \`<h4>\`.

Why so strict? Screen-reader users navigate by jumping between headings, and search engines read the outline to understand your page. A tidy outline is genuinely useful to real people.

## Paragraphs

\`<p>\` wraps a paragraph. The browser adds space above and below automatically — never use empty paragraphs to make gaps, that is CSS's job.

A \`<p>\` cannot contain another \`<p>\`, or any heading. If you forget the closing tag, the browser closes it for you when the next block element starts, which usually looks fine and then bites you later.`,
      sample: {
        lang: 'html',
        caption: 'A properly nested outline',
        code: `<h1>Making Bread</h1>
<p>Bread needs four things: flour, water, salt and yeast.</p>

<h2>Ingredients</h2>
<p>Use strong white flour if you can get it.</p>

<h3>For the dough</h3>
<p>500g flour, 350g water, 10g salt, 7g yeast.</p>

<h3>For the topping</h3>
<p>A handful of oats.</p>

<h2>Method</h2>
<p>Mix, knead, rise, shape, rise again, bake.</p>`,
        output: `Making Bread                        (biggest)
Bread needs four things: flour, water, salt and yeast.

Ingredients                         (smaller)
Use strong white flour if you can get it.

For the dough                       (smaller still)
500g flour, 350g water, 10g salt, 7g yeast.

For the topping
A handful of oats.

Method
Mix, knead, rise, shape, rise again, bake.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your `<h2>` looks too large, and `<h4>` happens to be the size you want. What should you do?',
        options: [
          'Use `<h4>` — it looks right',
          'Keep `<h2>` for correct structure and change its size with CSS',
          'Use `<p>` and make it bold',
          'Use `<h2>` but put it inside a `<div>`',
        ],
        answer: 1,
        explain:
          'Heading levels describe document structure, not appearance. Screen readers and search engines read that structure. Size is presentation, and presentation belongs to CSS — a one-line rule you will write in the next level.',
        hint: 'Which one is about meaning and which is about looks?',
      },
    },

    {
      id: 'html-b-05',
      title: 'Marking up text inside a paragraph',
      read: `Inside a paragraph you often need to emphasise or annotate words. These are **inline** elements — they sit inside a line rather than starting a new block.

## Meaning, not looks

- \`<strong>\` — strong importance. Renders bold.
- \`<em>\` — emphasis, the stress you would put on a word when speaking. Renders italic.
- \`<b>\` and \`<i>\` — bold and italic with **no meaning attached**. Use them only when you want the visual effect for reasons the reader can already see (a ship name, a keyword in a list).

Prefer \`<strong>\` and \`<em>\`: a screen reader changes its tone for them, and it says nothing for \`<b>\`.

## Useful others

- \`<br>\` — a line break. Right for addresses and poetry, **wrong** for making gaps between paragraphs.
- \`<hr>\` — a thematic break between sections.
- \`<code>\` — a fragment of code. \`<pre>\` preserves whitespace exactly.
- \`<mark>\` — highlighted. \`<small>\` — fine print. \`<del>\` / \`<ins>\` — deleted / inserted text.
- \`<a>\` — links, which are so important they get their own step next.

## Entities

Some characters have meaning in HTML, so you write them as entities: \`&lt;\` for \`<\`, \`&gt;\` for \`>\`, \`&amp;\` for \`&\`, \`&nbsp;\` for a space that never breaks a line.`,
      sample: {
        lang: 'html',
        caption: 'Inline elements inside ordinary paragraphs',
        code: `<p>This is <strong>really important</strong> and this is
  <em>emphasised</em>.</p>

<p>Contact:<br>
  12 High Street<br>
  Leeds<br>
  LS1 1AA</p>

<p>Press <code>Ctrl + S</code> to save.</p>

<p>Old price: <del>£40</del> New price: <ins>£30</ins></p>

<p>Use <code>&lt;p&gt;</code> for paragraphs. Fish &amp; chips.</p>

<pre>
line one
   indented line
</pre>`,
        output: `This is really important and this is emphasised.

Contact:
12 High Street
Leeds
LS1 1AA

Press Ctrl + S to save.

Old price: £40  New price: £30

Use <p> for paragraphs. Fish & chips.

line one
   indented line`,
      },
      question: {
        kind: 'fill',
        prompt:
          'You want the literal text `<h1>` to appear on the page instead of creating a heading. What do you write in the HTML?',
        placeholder: 'The HTML you would type',
        accept: ['&lt;h1&gt;', '&lt;h1&gt'],
        caseSensitive: false,
        explain:
          'Angle brackets have to be escaped as entities: `&lt;` for less-than and `&gt;` for greater-than. Otherwise the browser reads them as a real tag and you get a heading instead of text.',
        hint: 'You need two entities, one for each bracket.',
      },
    },

    {
      id: 'html-b-06',
      title: 'Links — the "hypertext" in HTML',
      read: `Links are what make the web a web. The element is \`<a>\` (for *anchor*), and the destination goes in the \`href\` attribute.

\`\`\`html
<a href="https://example.com">Visit Example</a>
\`\`\`

The text between the tags is what the user sees and clicks.

## Four kinds of href

1. **Absolute** — a full address: \`https://example.com/page\`. For other websites.
2. **Relative** — a path relative to the current file: \`about.html\`, \`pages/contact.html\`, \`../index.html\` (\`..\` means "up one folder"). For your own pages.
3. **Fragment** — \`#section-2\` jumps to the element with \`id="section-2"\` on this page.
4. **Special** — \`mailto:you@example.com\`, \`tel:+441234567890\`.

## Opening in a new tab

\`target="_blank"\` opens a new tab. Always pair it with \`rel="noopener noreferrer"\` — without it the new page gets a handle on yours, which is a real security hole. Use it sparingly: taking control of the back button annoys people.

## Write link text that means something

"Click here" tells a screen-reader user nothing when they list all links on a page. Write **"Read the installation guide"** instead.`,
      sample: {
        lang: 'html',
        caption: 'Every kind of link, with honest link text',
        code: `<p>Read the <a href="guide.html">installation guide</a>.</p>

<p>Back to <a href="../index.html">the homepage</a>.</p>

<p>Skip to <a href="#contact">the contact section</a>.</p>

<p>
  Full docs at
  <a href="https://developer.mozilla.org"
     target="_blank"
     rel="noopener noreferrer">MDN (opens in a new tab)</a>.
</p>

<p>Email us at <a href="mailto:hi@example.com">hi@example.com</a>.</p>

<h2 id="contact">Contact</h2>
<p>You found it.</p>`,
        output: `Read the installation guide.
Back to the homepage.
Skip to the contact section.
Full docs at MDN (opens in a new tab).
Email us at hi@example.com.

Contact
You found it.`,
      },
      question: {
        kind: 'code',
        lang: 'html',
        prompt:
          'Write a link that goes to `https://example.com`, shows the words `Read the docs`, and opens in a new tab safely.',
        starter: '<a ',
        mustInclude: [
          'href\\s*=\\s*"https://example\\.com"',
          'target\\s*=\\s*"_blank"',
          'rel\\s*=\\s*"noopener',
          'Read the docs',
          '</a>',
        ],
        solution:
          '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Read the docs</a>',
        explain:
          'Three attributes and the visible text between the tags. `rel="noopener noreferrer"` stops the opened page from being able to manipulate yours through `window.opener`.',
        hint: 'Three attributes in the opening tag, then the text, then `</a>`.',
      },
    },

    {
      id: 'html-b-07',
      title: 'Images',
      read: `\`\`\`html
<img src="cat.jpg" alt="A ginger cat asleep on a keyboard">
\`\`\`

\`<img>\` is a void element — no closing tag. Two attributes matter most:

## src — where the file is

Same rules as links: relative (\`images/cat.jpg\`) for your own files, absolute (\`https://...\`) for someone else's. Relative paths are case-sensitive on real web servers even though Windows lets you get away with it locally — \`Cat.JPG\` and \`cat.jpg\` are different files.

## alt — what the image says

\`alt\` is read aloud to blind users, shown when the image fails to load, and read by search engines. It is **not optional**.

- Describe the *content and purpose*: \`alt="Bar chart showing sales doubling in 2024"\`
- Do not start with "Image of" — the screen reader already says that
- If the image is purely decorative, use \`alt=""\` (empty, but present) so it is skipped cleanly

## width and height

Always set them, matching the real pixel dimensions. The browser can then reserve the right space before the image loads, so your page does not jump around as it loads.

## Formats

**JPG** for photographs, **PNG** for graphics with sharp edges or transparency, **SVG** for logos and icons (scales to any size, tiny), **WebP** for smaller files that all modern browsers support.`,
      sample: {
        lang: 'html',
        caption: 'Informative, decorative, linked and captioned images',
        code: `<img src="images/cat.jpg"
     alt="A ginger cat asleep on a laptop keyboard"
     width="600" height="400">

<img src="images/swirl.svg" alt="" width="40" height="40">

<a href="full-size.jpg">
  <img src="thumb.jpg" alt="Sunset over the harbour" width="200" height="150">
</a>

<figure>
  <img src="chart.png" alt="Sales doubled between 2023 and 2024"
       width="500" height="300">
  <figcaption>Figure 1: Annual sales, 2020–2024.</figcaption>
</figure>`,
        output: `[600x400 photo of a cat]
[small decorative swirl]
[clickable 200x150 thumbnail]
[500x300 chart]
Figure 1: Annual sales, 2020–2024.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the correct `alt` for a purely decorative swirl graphic?',
        options: [
          'Leave the `alt` attribute out entirely',
          '`alt=""`',
          '`alt="decorative swirl"`',
          '`alt="image"`',
        ],
        answer: 1,
        explain:
          'An empty but present `alt` tells assistive technology "skip this, it carries no information". Omitting `alt` altogether makes some screen readers read out the filename instead, and describing a meaningless decoration just adds noise.',
        hint: 'You want the screen reader to say nothing at all.',
      },
    },

    {
      id: 'html-b-08',
      title: 'Lists',
      read: `Three kinds, and picking the right one is part of describing meaning correctly.

## Unordered — \`<ul>\`

Order does not matter. Shopping list, features, tags. Renders with bullets.

## Ordered — \`<ol>\`

Order **does** matter. Steps in a recipe, rankings, instructions. Renders with numbers, and the browser numbers them for you — never type the numbers yourself.

Useful attributes: \`start="5"\`, \`reversed\`, \`type="a"\`.

## Description — \`<dl>\`

Term-and-definition pairs: a glossary, metadata, FAQ. \`<dt>\` is the term, \`<dd>\` its description.

## The rules

- Only \`<li>\` may be a direct child of \`<ul>\` or \`<ol>\`. No stray \`<p>\` or \`<div>\` in between.
- An \`<li>\` can contain anything, including another whole list — that is how you nest.
- A nested list goes **inside** an \`<li>\`, not between them. Getting this wrong is the most common list mistake there is.`,
      sample: {
        lang: 'html',
        caption: 'All three kinds, with correct nesting',
        code: `<h2>Shopping</h2>
<ul>
  <li>Bread</li>
  <li>Milk</li>
  <li>Fruit
    <ul>
      <li>Apples</li>
      <li>Bananas</li>
    </ul>
  </li>
</ul>

<h2>Method</h2>
<ol>
  <li>Preheat the oven to 200°C.</li>
  <li>Mix the dry ingredients.</li>
  <li>Bake for 25 minutes.</li>
</ol>

<h2>Glossary</h2>
<dl>
  <dt>HTML</dt>
  <dd>The markup language that structures a page.</dd>
  <dt>CSS</dt>
  <dd>The language that styles it.</dd>
</dl>`,
        output: `Shopping
 • Bread
 • Milk
 • Fruit
     • Apples
     • Bananas

Method
 1. Preheat the oven to 200°C.
 2. Mix the dry ingredients.
 3. Bake for 25 minutes.

Glossary
HTML
    The markup language that structures a page.
CSS
    The language that styles it.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Where does a nested `<ul>` belong?',
        options: [
          'Between two `<li>` elements',
          'Inside the `<li>` it belongs to, before its closing `</li>`',
          'Directly inside the parent `<ul>`, after all the `<li>`s',
          'Inside a `<p>` inside the `<li>`',
        ],
        answer: 1,
        explain:
          'A sub-list is part of its parent item, so it goes inside that `<li>`. A `<ul>` placed directly inside another `<ul>` between items is invalid HTML — browsers usually render something, but the structure is wrong and screen readers report it oddly.',
        hint: 'Which list item do the sub-items belong to?',
      },
    },

    {
      id: 'html-b-09',
      title: 'Nesting, indentation and comments',
      read: `## Nesting

Elements go **inside** other elements, and they must close in the reverse order they opened — like nesting boxes.

\`\`\`html
<p>This is <strong>correct <em>nesting</em></strong>.</p>
<p>This is <strong>wrong <em>nesting</strong></em>.</p>
\`\`\`

The second one overlaps rather than nests. Browsers silently repair it, in ways that differ, and then your CSS behaves inexplicably. Close in reverse order, always.

## Block vs inline

- **Block** elements (\`<p>\`, \`<h1>\`, \`<div>\`, \`<ul>\`) start on a new line and fill the available width.
- **Inline** elements (\`<a>\`, \`<strong>\`, \`<span>\`, \`<img>\`) sit within a line.

An inline element may not contain a block element: \`<a><h1>...</h1></a>\` is wrong the old way round — though modern HTML does allow \`<a>\` to wrap block content as a special case.

## Indentation

Indent children two spaces past their parent. The browser does not care, but you will when a page is 300 lines long and a tag is missing.

## Comments

\`\`\`html
<!-- This is a comment -->
\`\`\`

Invisible on the page, but **visible to anyone who views the source** — never put anything private in one.`,
      sample: {
        lang: 'html',
        caption: 'Correct nesting, consistent indentation, useful comments',
        code: `<!-- Main navigation -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<article>
  <h2>A <em>well nested</em> heading</h2>
  <p>
    Here is <strong>bold text with <em>italics</em> inside</strong>,
    closed in the right order.
  </p>
  <!-- TODO: add the author byline here -->
</article>`,
        output: `Home  About

A well nested heading
Here is bold text with italics inside, closed in the right order.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Which line is nested correctly?',
        options: [
          '`<p><strong>text</p></strong>`',
          '`<strong><p>text</strong></p>`',
          '`<p><strong>text</strong></p>`',
          '`<p><strong>text<p></strong>`',
        ],
        answer: 2,
        explain:
          'Opened `<p>` then `<strong>`, so close `</strong>` then `</p>` — reverse order, like closing nested boxes. The others all overlap or leave a tag unclosed.',
        hint: 'Last opened, first closed.',
      },
    },

    {
      id: 'html-b-10',
      title: 'id, class, div and span',
      read: `Four things that carry no meaning of their own but hold everything else together.

## id — a unique name

\`\`\`html
<h2 id="contact">Contact</h2>
\`\`\`

- **Unique on the page** — one element, one id
- Used as a link target (\`href="#contact"\`), by CSS, and by JavaScript
- No spaces; stick to lower-case with hyphens

## class — a reusable label

\`\`\`html
<p class="warning">Careful!</p>
<p class="warning highlighted">Very careful!</p>
\`\`\`

- Any number of elements can share a class
- An element can carry several classes, separated by spaces
- This is what you will use for styling ~95% of the time

## div and span

- \`<div>\` — a generic **block** container
- \`<span>\` — a generic **inline** container

They mean nothing. Use them when you need a box to group or style things and no meaningful element fits. If a meaningful one *does* fit — \`<nav>\`, \`<header>\`, \`<article>\`, \`<section>\`, \`<footer>\` — use that instead. You will meet those properly in the next level.`,
      sample: {
        lang: 'html',
        caption: 'ids for targets, classes for styling, div/span when nothing else fits',
        code: `<a href="#pricing">Jump to pricing</a>

<div class="card featured">
  <h3 class="card-title">Starter</h3>
  <p class="price"><span class="currency">£</span>9<span class="per">/mo</span></p>
  <ul class="features">
    <li>One project</li>
    <li>Email support</li>
  </ul>
</div>

<h2 id="pricing">Pricing</h2>
<p>Every plan includes a 30-day trial.</p>`,
        output: `Jump to pricing

Starter
£9/mo
 • One project
 • Email support

Pricing
Every plan includes a 30-day trial.`,
      },
      question: {
        kind: 'mcq',
        prompt: 'You want to style twelve product boxes identically. `id` or `class`?',
        options: [
          '`id`, with the same id on all twelve',
          '`class`, because many elements may share one',
          'Either works equally well',
          'Neither — use inline styles',
        ],
        answer: 1,
        explain:
          'An `id` must be unique on the page. Repeating one is invalid, breaks `#` links, and makes JavaScript find only the first. Classes exist exactly for "these things are all the same kind".',
        hint: 'How many elements may share a given id?',
      },
    },

    {
      id: 'html-b-11',
      title: 'The mistakes everyone makes (and how to catch them)',
      read: `HTML never shows you an error. It just renders *something*, which makes mistakes hard to spot. Here are the ones that catch everybody.

1. **Unclosed tag.** Forget \`</div>\` and half the page ends up inside it. Symptom: styling applies to far more than you expected.
2. **Wrong file extension.** \`page.html.txt\` shows raw code. Windows hides extensions by default — turn that off.
3. **Broken path.** \`src="images/cat.jpg"\` when the folder is \`Images\`. Local double-click may work; a real server will not. Keep all filenames lower case, no spaces.
4. **Missing quotes.** \`alt=A cat\` silently becomes \`alt="A"\`.
5. **Missing \`<!DOCTYPE html>\`.** Puts the browser in quirks mode; layouts subtly break.
6. **Missing viewport meta.** Page looks fine on your laptop, tiny on a phone.
7. **Typos in tag names.** \`<strogn>\` is not an error — the browser ignores unknown tags, so the text appears unstyled and you stare at your CSS for an hour.

## Your two tools

- **Developer tools** — press \`F12\` (or Cmd+Option+I). The Elements panel shows the structure the browser *actually* built, which is where a missing closing tag becomes obvious instantly.
- **The validator** — paste your page into *validator.w3.org*. It lists every problem with line numbers. Run it before you publish anything.`,
      sample: {
        lang: 'html',
        caption: 'Find all four mistakes before reading the fix below',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>My page</title>
  </head>
  <body>
    <div class="wrapper">
      <h1>Welcome<h1>
      <p>Here is a <a href=about.html>link</a>.
      <img src="Photo.JPG" alt=My photo>
  </body>
</html>`,
        output: `Validator output:
  line 4:  missing <meta charset="UTF-8">
  line 8:  <h1> not closed — second <h1> opens a new heading
  line 9:  unquoted attribute value "about.html"
  line 10: unquoted alt value; "Photo.JPG" will 404 on a case-sensitive server
  line 11: <div class="wrapper"> never closed`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your image shows fine when you double-click the file locally, but is broken once uploaded to a web server. What is the most likely cause?',
        options: [
          'The server does not support images',
          'The filename case does not match — local file systems often ignore case, real servers do not',
          'You need an absolute URL on a server',
          'The image is too large',
        ],
        answer: 1,
        explain:
          '`src="images/cat.jpg"` will not find `images/Cat.JPG` on a Linux server, even though Windows and macOS usually find it locally. Keeping every filename lower case with hyphens instead of spaces avoids the whole class of problem.',
        hint: 'What is different about how Windows and Linux treat filenames?',
      },
    },

    {
      id: 'html-b-12',
      title: 'Project: your "about me" page',
      read: `Everything from this level in one real page you could actually publish.

The structure:

1. The full skeleton, with a proper \`<title>\`.
2. One \`<h1>\` naming the page.
3. A short intro paragraph with some \`<strong>\` and \`<em>\`.
4. A photo with genuine \`alt\` text and explicit dimensions.
5. An \`<h2>\` section with an unordered list of interests.
6. Another \`<h2>\` with an ordered list of goals.
7. A links section, including one external link opened safely.
8. Fragment links at the top jumping to each section by \`id\`.

Build it yourself before reading the sample. Then run it through *validator.w3.org* — a clean report on your first real page is a genuinely good feeling.`,
      sample: {
        lang: 'html',
        caption: 'A complete, valid, accessible page',
        code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Sam — developer in training</title>
  </head>
  <body>
    <h1>About Sam</h1>

    <p>
      Jump to <a href="#interests">interests</a>,
      <a href="#goals">goals</a> or
      <a href="#links">links</a>.
    </p>

    <p>
      Hello! I am <strong>Sam</strong> and I am learning to build things
      for the web. I started <em>three weeks ago</em> and this is my
      first real page.
    </p>

    <img src="images/sam.jpg"
         alt="Sam sitting at a desk with a laptop"
         width="400" height="300">

    <h2 id="interests">Things I like</h2>
    <ul>
      <li>Building small websites</li>
      <li>Cycling
        <ul>
          <li>Mostly hills</li>
          <li>Occasionally mud</li>
        </ul>
      </li>
      <li>Very strong coffee</li>
    </ul>

    <h2 id="goals">What I am working towards</h2>
    <ol>
      <li>Finish the HTML beginner level</li>
      <li>Learn CSS and make this page look good</li>
      <li>Publish it somewhere real</li>
    </ol>

    <h2 id="links">Find me</h2>
    <ul>
      <li><a href="mailto:sam@example.com">Email me</a></li>
      <li>
        <a href="https://developer.mozilla.org"
           target="_blank" rel="noopener noreferrer">MDN — where I look things up</a>
      </li>
    </ul>

    <hr>
    <p><small>Made by hand, with no help from a website builder.</small></p>
  </body>
</html>`,
        output: `[Tab: About Sam — developer in training]

About Sam
Jump to interests, goals or links.
Hello! I am Sam and I am learning to build things for the web...
[400x300 photo]

Things I like
 • Building small websites
 • Cycling
     • Mostly hills
     • Occasionally mud
 • Very strong coffee

What I am working towards
 1. Finish the HTML beginner level
 2. Learn CSS and make this page look good
 3. Publish it somewhere real

Find me
 • Email me
 • MDN — where I look things up
─────────────────────────────
Made by hand, with no help from a website builder.`,
      },
      question: {
        kind: 'code',
        lang: 'html',
        prompt:
          'Add a section to the page: an `<h2>` with the text `Skills` that can be jumped to with `href="#skills"`, followed by a list of two skills.',
        starter: '<h2 ',
        mustInclude: ['<h2\\s+id\\s*=\\s*"skills"\\s*>\\s*Skills\\s*</h2>', '<ul>', '<li>', '</ul>'],
        solution: `<h2 id="skills">Skills</h2>
<ul>
  <li>HTML</li>
  <li>Patience</li>
</ul>`,
        explain:
          'The `id` on the heading is what `href="#skills"` targets — the browser scrolls to whatever element carries that id. Unordered list because the order of skills carries no meaning.',
        hint: 'The heading needs an `id` attribute matching the fragment, without the `#`.',
      },
    },
  ],
}

export default level
