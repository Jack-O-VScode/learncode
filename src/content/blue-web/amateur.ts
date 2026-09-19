import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Defending against injection, XSS and broken auth',
  summary:
    'The concrete defences for the most common web flaws: parameterized queries against SQL and other injection, context-correct output encoding and CSP against XSS, real input validation, authentication and session management done properly, security headers, safe error handling and safe file uploads.',
  outcomes: [
    'Stop SQL and command injection with parameterization and safe APIs',
    'Defend every XSS context with correct output encoding',
    'Deploy a Content Security Policy and key security headers',
    'Build authentication with MFA, rate limiting and safe resets',
    'Manage sessions correctly: generation, rotation, expiry, logout',
    'Handle errors and file uploads without leaking or executing',
  ],
  steps: [
    {
      id: 'bweb-a-01',
      title: 'Stopping SQL injection properly',
      read: `You met injection as a concept; now the fix. The single robust defence against SQL injection is **parameterized queries** (also called **prepared statements**).

## Why parameterization works

With concatenation, data and code share one string, so input can become code. With a parameterized query you send the database **two separate things**:

1. The **query structure**, with placeholders (\`?\` or \`:name\`) — this you control, and it is parsed as SQL *first*.
2. The **parameter values** — sent separately, and bound *after* parsing.

Because the SQL is parsed before the values arrive, a value can **never** be interpreted as SQL syntax, no matter what characters it contains. Input \`' OR '1'='1\` is simply searched for as a literal username string. The data/code boundary is enforced by the database driver, not by your cleverness.

## What *not* to rely on

- **Escaping/quoting input by hand** — error-prone, easy to get wrong per-database, and frequently bypassed (charset tricks, numeric contexts without quotes). Use parameterization instead.
- **Blocklisting** words like \`DROP\` or \`UNION\` — trivially evaded and breaks legitimate input. Never a real defence.
- **Stored procedures** — help only if they *themselves* use parameters; a stored procedure that concatenates is just as vulnerable.

## ORMs

Most ORMs (SQLAlchemy, Hibernate, Django ORM, Prisma) parameterize by default, which is why ORM code is usually safe. But beware their **raw-query escape hatches** (\`.raw()\`, \`.execute()\`, string-built \`WHERE\` clauses) — those reintroduce the risk if you concatenate into them.

## What parameters can't cover

Placeholders bind **values**, not **identifiers** (table/column names) or SQL keywords like \`ASC\`/\`DESC\`. If you must vary those from user input (e.g. a sort column), you **cannot** parameterize them — instead map input against a strict **allow-list** of permitted column names and use only the matched literal. Never interpolate a raw identifier.

## Defence in depth

Also apply **least privilege** to the database account: the app should connect with an account that can only do what it needs (no DROP, no access to unrelated tables). Then even a missed injection does far less damage.

Parameterize every query, allow-list identifiers, and give the app a least-privileged DB user — that combination effectively ends SQL injection.`,
      sample: {
        lang: 'python',
        caption: 'Vulnerable concatenation vs. a parameterized query',
        code: `# VULNERABLE - data and code mixed into one string
name = request.args["name"]
cur.execute("SELECT * FROM users WHERE name = '" + name + "'")
# name = "' OR '1'='1"  ->  returns every user

# SAFE - structure parsed first, value bound separately
cur.execute("SELECT * FROM users WHERE name = %s", (name,))
# name = "' OR '1'='1"  ->  searched for as a literal string

# Identifiers CANNOT be parameterized - allow-list them:
SORTABLE = {"name", "created_at", "price"}
col = request.args.get("sort")
if col not in SORTABLE:
    abort(400)
cur.execute(f"SELECT * FROM products ORDER BY {col} ASC")`,
        output: `Parameterization enforces the data/code boundary in the driver:
the SQL is parsed BEFORE values are bound, so a value can never
become syntax. Allow-list identifiers (not parameterizable).
Add a least-privilege DB account for defence in depth.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does a parameterized query stop SQL injection even if the input contains quotes and SQL keywords?',
        options: [
          'It removes dangerous characters from the input',
          'The query structure is sent and parsed as SQL separately from the values, which are bound afterwards — so a parameter can never be interpreted as SQL syntax regardless of its contents',
          'It encrypts the input before use',
          'It blocks any input containing the word SELECT',
        ],
        answer: 1,
        explain:
          'Parameterization separates the two things that injection mixes. The database receives the query template (with placeholders) and parses it as SQL first; the values arrive separately and are bound into the already-parsed plan. Because parsing is finished before the value is seen, the value is only ever data — quotes and keywords in it are just characters in a string. Nothing is stripped or filtered; the data/code boundary is structurally enforced.',
        hint: 'What is parsed first, and when do the values arrive?',
      },
    },

    {
      id: 'bweb-a-02',
      title: 'Command, NoSQL and other injection',
      read: `Injection is a family. Wherever untrusted input meets an interpreter, the same shape appears — and the same principle fixes it: **keep data separate from code.**

## OS command injection

If an app builds a shell command from input, the attacker gets shell metacharacters (\`;\`, \`|\`, \`&&\`, backticks, \`$()\`) and can run their own commands as the web user.

**Defences, in order of preference:**

1. **Don't call the shell at all.** Use a language API that does the job (read a file with the file API, resize an image with a library).
2. If you must run a program, use an API that takes an **argument array** and no shell (\`subprocess.run(["convert", path])\`, not \`os.system("convert " + path)\`). Arguments are passed directly to the process, so metacharacters are inert.
3. **Allow-list** the input strictly if it must influence the command (and never pass user input as the command name).

Escaping shell input by hand is a losing game — avoid the shell instead.

## NoSQL injection

MongoDB and friends are not immune. If a JSON body is passed straight into a query, an attacker can send an **operator object** instead of a string — e.g. \`{"password": {"$ne": null}}\` means "password not equal to null", matching any user and bypassing the login check. **Defences:** validate types strictly (this field must be a *string*), reject objects/arrays where a scalar is expected, and use the driver's parameter-safe query construction.

## LDAP, XPath, template and header injection

- **LDAP / XPath injection** — same concatenation problem in a different query language; use the library's escaping/parameterized APIs.
- **Server-side template injection (SSTI)** — never build a template *from* user input (\`render_template_string("Hi " + name)\`); pass input as a **variable** into a fixed template.
- **HTTP header / log injection** — input containing newlines can forge headers or log entries; strip control characters before putting input in headers or logs.

## The unifying rule

For every interpreter, ask: **am I building a command out of a string that contains user input?** If yes, find the API that passes data separately (parameters, argument arrays, template variables). Validation and allow-listing add defence in depth, but structural separation is the real fix — the same lesson as SQL, everywhere.`,
      sample: {
        lang: 'python',
        caption: 'Command injection, and NoSQL operator injection',
        code: `# VULNERABLE - shell parses the whole string
os.system("ping -c1 " + host)
# host = "8.8.8.8; cat /etc/passwd"  ->  runs both commands

# SAFE - no shell; args passed directly to the process
subprocess.run(["ping", "-c1", host], shell=False)
# host = "8.8.8.8; cat /etc/passwd"  ->  one weird hostname, no shell

# NoSQL: the client sent JSON  {"user":"admin","password":{"$ne":null}}
db.users.find_one({"user": user, "password": password})
# -> "password not equal to null" matches -> LOGIN BYPASS
# FIX: require a string
if not isinstance(password, str): abort(400)`,
        output: `Same shape everywhere: data concatenated into a command becomes
code. Fixes: avoid the shell (or pass an argument ARRAY),
type-validate NoSQL input (reject operator objects), pass
template data as VARIABLES, strip control chars from headers/logs.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A login endpoint passes the JSON body straight into a MongoDB query. An attacker sends `{"user":"admin","password":{"$ne":null}}` and logs in. What happened, and what is the fix?',
        options: [
          'The password was cracked; use a stronger hash',
          'The attacker supplied a query operator object instead of a string, so the condition became "password not equal to null" and matched — the fix is to validate types strictly (reject non-string values where a string is expected) and build queries safely',
          'MongoDB does not support authentication',
          'The session cookie was stolen',
        ],
        answer: 1,
        explain:
          'This is NoSQL injection. The app assumed `password` would be a string, but JSON lets the client send an object, and the driver interpreted `{"$ne": null}` as the operator "not equal to null" — a condition that matches any stored password, bypassing the check entirely. Nothing was cracked. The fix is strict type validation (require a string, reject objects/arrays) plus safe query construction — the same data/code separation principle as parameterized SQL.',
        hint: 'What did the attacker send *instead of a string*, and how did the database interpret it?',
      },
    },

    {
      id: 'bweb-a-03',
      title: 'XSS in depth: the three types',
      read: `You met XSS as a concept. To defend it you need to know its three forms, because where the injection happens determines how you fix it.

## Reflected XSS

Untrusted input in the **request** is echoed into the **immediate response**. The attacker crafts a URL containing the payload and gets a victim to click it (phishing, a link in a forum). The payload isn't stored — it lives in the link.

Typical spot: a search page that prints "No results for *X*", an error message that echoes a parameter.

## Stored (persistent) XSS

The payload is **saved by the application** — in a comment, a profile field, a product review, a filename, even a log — and then served to **everyone who views that content**. Far more dangerous: no per-victim link is needed, it can hit many users, and it often reaches **privileged users** (an admin viewing a user list or a log page), which turns XSS into an admin-account takeover.

This is why any field an admin might later view — including things like a "user agent" recorded in a log viewer — must be encoded on output.

## DOM-based XSS

The vulnerability is entirely **client-side**: JavaScript in the page takes data from a source the attacker controls (\`location.hash\`, \`location.search\`, \`document.referrer\`, \`postMessage\`, \`localStorage\`) and passes it to a dangerous **sink** (\`innerHTML\`, \`document.write\`, \`eval\`, \`setTimeout\` with a string, jQuery \`.html()\`).

Crucially, the payload may **never reach the server** (anything after \`#\` isn't sent), so server-side encoding and server logs won't see it. You fix DOM XSS in the **JavaScript**: use safe sinks (\`textContent\`, \`setAttribute\`) instead of \`innerHTML\`, and never pass untrusted data to \`eval\`-like functions.

## Why the distinction matters

- Reflected and stored XSS are fixed primarily by **encoding on output, server-side** (next step).
- DOM XSS is fixed in **client-side code**, by choosing safe DOM APIs — server-side encoding cannot help.
- Stored XSS demands you treat **stored data as untrusted too** (second-order input): data that was safe to accept may be dangerous to render.

All three share the root cause — untrusted data placed into a page where it can become markup or script — but you must look in the right place for each.`,
      sample: {
        lang: 'js',
        caption: 'DOM-based XSS: the payload never reaches the server',
        code: `// Vulnerable client-side code: source -> dangerous sink
const name = location.hash.slice(1);      // SOURCE (attacker-controlled)
document.getElementById("greet").innerHTML = "Hi " + name;  // SINK

// Attacker's link:
//   https://site.example/page#<img src=x onerror=alert(1)>
// Everything after '#' is NEVER sent to the server, so server-side
// encoding and server logs see nothing.

// FIXED - safe sink treats the value as text, not markup
document.getElementById("greet").textContent = "Hi " + name;`,
        output: `Reflected: payload in the request, echoed in the response (via
a crafted link). Stored: payload saved and served to everyone
(can hit admins). DOM: source -> dangerous sink in client JS,
often never reaching the server - fix it in the JavaScript.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can server-side output encoding fail to prevent DOM-based XSS?',
        options: [
          'Server-side encoding is always broken',
          'In DOM-based XSS the untrusted data flows from a client-side source (like location.hash) into a dangerous sink (like innerHTML) entirely in the browser — the payload may never be sent to the server at all — so the fix must be in the JavaScript, using safe sinks such as textContent',
          'DOM XSS only affects old browsers',
          'Because encoding only works on POST requests',
        ],
        answer: 1,
        explain:
          'DOM XSS happens wholly in the browser: client JavaScript reads attacker-controlled data from a source such as `location.hash`, `location.search` or `postMessage` and writes it into a dangerous sink like `innerHTML` or `eval`. With a fragment (`#…`) the payload is never transmitted to the server, so the server cannot encode what it never sees. The remedy is in the client code — use `textContent`/`setAttribute` rather than `innerHTML`, and never pass untrusted data to eval-like APIs.',
        hint: 'Where does the data travel in DOM XSS, and does the server ever receive the part after `#`?',
      },
    },

    {
      id: 'bweb-a-04',
      title: 'Output encoding: the XSS fix',
      read: `The primary defence against reflected and stored XSS is **output encoding** (escaping): when untrusted data is placed into a page, convert characters that have special meaning so the browser renders them as **text** rather than parsing them as markup or script.

## HTML context

In ordinary HTML body text, encode the dangerous characters as HTML entities:

- \`<\` → \`&lt;\`  \`>\` → \`&gt;\`  \`&\` → \`&amp;\`  \`"\` → \`&quot;\`  \`'\` → \`&#x27;\`

Now \`<script>\` arrives at the browser as the visible text \`<script>\`, not a tag.

## Encoding is context-dependent — this is the crucial part

HTML encoding is correct for HTML body text, but **the right encoding depends on where the data lands**:

- **HTML body** → HTML entity encoding.
- **HTML attribute** → entity-encode *and* always **quote the attribute**. Unquoted attributes are dangerous: \`<div class=USERDATA>\` lets input add \` onmouseover=...\` with no quotes needed.
- **Inside a \`<script>\` block** → HTML encoding does **not** help; you are already in a JavaScript context. Do not put untrusted data into inline script. If unavoidable, use strict JavaScript-string encoding, or far better: put the value in a \`data-\` attribute (HTML-encoded) and read it from JS.
- **URL / \`href\` value** → URL-encode, and validate the **scheme**: a value starting \`javascript:\` in an \`href\` executes script even with everything else encoded. Allow only \`http\`/\`https\`/relative.
- **CSS context** → separate rules again; avoid untrusted data in style entirely.

Putting HTML-encoded data into a JavaScript or URL context is a classic mistake that still yields XSS — "escaping" is only safe when it matches the destination.

## Let the framework do it

Modern frameworks (React, Angular, Vue, Django, Rails templates) **auto-encode by default**, which is why they prevent most XSS. Danger returns when you deliberately bypass them:

- React: \`dangerouslySetInnerHTML\`
- Angular: \`bypassSecurityTrustHtml\`
- Vue: \`v-html\`
- Templates: "raw"/"safe" filters

Each of those turns encoding off — use them only with content you fully trust or have sanitized.

## When you must allow HTML

For rich text (a comment editor), you cannot encode everything. Use a well-maintained **sanitizer library** (**DOMPurify** client-side, or a server-side equivalent) that parses the HTML and strips dangerous tags/attributes/URLs, keeping a safe allow-list. Never write your own HTML filter with regexes — that fails.

**Encode on output, in the right context, and prefer your framework's defaults.**`,
      sample: {
        lang: 'html',
        caption: 'The same data, four contexts, four different rules',
        code: `<!-- 1. HTML body: entity-encode -->
<p>Hi &lt;script&gt;alert(1)&lt;/script&gt;</p>   <!-- shown as text -->

<!-- 2. Attribute: entity-encode AND quote it -->
<div class="USERDATA"></div>       <!-- quoted: safe -->
<div class=USERDATA></div>         <!-- UNQUOTED: input adds onmouseover= -->

<!-- 3. Inside <script>: HTML encoding does NOT help.
     Prefer a data- attribute read from JS: -->
<div id="u" data-name="USERDATA"></div>

<!-- 4. href: validate the SCHEME, or javascript: still runs -->
<a href="javascript:alert(1)">click</a>   <!-- allow only http/https/relative -->`,
        output: `Encoding must MATCH the destination context: HTML body,
attribute (always quoted), script, URL (validate the scheme),
CSS. Frameworks auto-encode - the risk is bypasses like
dangerouslySetInnerHTML / v-html. For real rich text, use a
sanitizer (DOMPurify), never hand-rolled regex filtering.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A developer HTML-encodes user data and inserts it into an `href` attribute. An attacker still achieves XSS with `javascript:alert(1)`. Why?',
        options: [
          'HTML encoding is never effective',
          'Encoding must match the context: in a URL context the browser acts on the scheme, so a `javascript:` URL executes even though the characters were HTML-encoded — the fix is to validate the scheme (allow only http/https/relative) in addition to encoding',
          'The attacker disabled JavaScript',
          'href attributes cannot be encoded',
        ],
        answer: 1,
        explain:
          'HTML entity encoding protects against breaking out of HTML markup, but inside an `href` the browser interprets the value as a URL, and a `javascript:` scheme runs script when the link is followed. No amount of entity encoding changes the scheme. The context-appropriate defence is to parse/validate the URL and allow only safe schemes (http, https, or relative paths), rejecting `javascript:`, `data:` and similar — a concrete case of "encoding must match the destination context".',
        hint: 'What part of the value does a browser act on inside an `href`, and does entity encoding change it?',
      },
    },

    {
      id: 'bweb-a-05',
      title: 'Content Security Policy',
      read: `**Content Security Policy (CSP)** is a response header that tells the browser which sources of content are allowed to load and execute. It is a powerful **second line of defence**: even if an XSS flaw slips through your encoding, a good CSP can stop the injected script from running.

## How it works

\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self'
\`\`\`

This says: load resources only from this origin, and run scripts only from this origin. An injected \`<script>alert(1)</script>\` (inline) is blocked, and \`<script src="https://evil.example/x.js">\` is blocked because that origin isn't allowed.

## The key directives

- **\`script-src\`** — where scripts may come from. The most security-relevant.
- **\`default-src\`** — fallback for other resource types.
- **\`object-src 'none'\`** — block plugins (a legacy XSS vector).
- **\`base-uri 'none'\`** — stop injected \`<base>\` tags hijacking relative URLs.
- **\`frame-ancestors 'none'\`** — who may frame you: the modern clickjacking defence (replaces X-Frame-Options).
- **\`report-uri\` / \`report-to\`** — send violation reports, so you learn what a policy *would* block.

## Inline script is the problem

Classic CSP blocks **inline** \`<script>\` — which is exactly what makes it effective against XSS, but also what breaks many existing sites. Two bad escapes and the good solution:

- **\`'unsafe-inline'\`** — permits inline script and **destroys CSP's XSS protection**. Avoid.
- **\`'unsafe-eval'\`** — permits \`eval\`. Avoid.
- **Nonces or hashes** — the right way: give each legitimate inline script a random per-response **nonce** (\`<script nonce="r4nd0m">\`) and list it in the policy (\`script-src 'nonce-r4nd0m'\`). Injected script has no valid nonce, so it is blocked. (A **strict-dynamic** + nonce policy is the modern recommendation.)

## Deploy it safely

Use **\`Content-Security-Policy-Report-Only\`** first: the browser reports violations without blocking anything. Review the reports, fix legitimate breakage, then switch to enforcing — the same audit-then-enforce discipline as application control and ASR rules.

## CSP is defence in depth, not a substitute

A CSP does not fix the XSS bug; it limits the damage when one exists. You still encode output correctly. But because XSS is so common, a strict, nonce-based CSP is one of the highest-value headers you can deploy — it turns many would-be XSS exploits into a blocked console error.`,
      sample: {
        lang: 'text',
        caption: 'A weak CSP vs. a strict nonce-based one',
        code: `WEAK (common, and nearly useless against XSS):
  Content-Security-Policy: script-src 'self' 'unsafe-inline'
  -> injected inline <script> is ALLOWED. No XSS protection.

STRICT (modern recommendation):
  Content-Security-Policy:
    default-src 'self';
    script-src 'nonce-r4nd0m2024' 'strict-dynamic';
    object-src 'none'; base-uri 'none'; frame-ancestors 'none'

  <script nonce="r4nd0m2024">...</script>   legitimate -> RUNS
  <script>alert(document.cookie)</script>   injected, no nonce -> BLOCKED

Roll out with Content-Security-Policy-Report-Only first.`,
        output: `CSP is a second line of defence: even if XSS gets through your
encoding, the injected script is blocked. 'unsafe-inline'
destroys that protection - use per-response NONCES instead.
Deploy in Report-Only mode first, then enforce.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          "Why does adding `'unsafe-inline'` to a Content Security Policy's `script-src` largely defeat CSP's value against XSS?",
        options: [
          'It makes the page load more slowly',
          "It permits inline scripts to execute, which is exactly what injected XSS payloads are — so the policy no longer blocks them; the correct approach is per-response nonces (or hashes) so only legitimate inline scripts run",
          'It blocks the site’s own scripts',
          'It only affects images and stylesheets',
        ],
        answer: 1,
        explain:
          "CSP's main anti-XSS power is refusing to execute inline script, because an injected payload is inline script. Adding `'unsafe-inline'` tells the browser to run any inline script, so an XSS payload executes exactly as it would with no CSP. Sites often add it to avoid refactoring, losing the protection. The proper fix is to mark legitimate inline scripts with a random per-response nonce listed in the policy (ideally with `strict-dynamic`), so injected script — which cannot know the nonce — is blocked.",
        hint: 'What form does an injected XSS payload usually take, and what does that directive permit?',
      },
    },

    {
      id: 'bweb-a-06',
      title: 'Input validation done right',
      read: `Validation is the first layer of the "never trust input" principle. Done well it eliminates whole classes of bad data; done badly it gives false confidence.

## Allow-list, not deny-list

- **Allow-listing** (positive validation): define exactly what is acceptable and reject everything else. "An integer 1–100." "One of: \`pending\`, \`shipped\`, \`cancelled\`." "Matches this date format." This is robust because anything unanticipated is rejected by default.
- **Deny-listing** (blocking known-bad — \`<script>\`, \`DROP\`, \`../\`) always loses: attackers find encodings, case variations and alternatives you didn't list (\`<ScRiPt>\`, \`<img onerror>\`, \`%2e%2e%2f\`, double encoding). Never rely on it.

## Validate the right things

For each input: **type** (integer, string, boolean — reject an object where a string is expected, as in the NoSQL case), **length** (bounds), **format** (regex/parse for dates, emails, IDs), **range** (quantity ≥ 1; price not negative), and **set membership** (one of the permitted values).

## Canonicalize before validating

Decode and normalize input to a single canonical form **before** checking it, or your check can be bypassed. \`%2e%2e%2f\` becomes \`../\` after URL-decoding; Unicode forms can normalize into characters you meant to block. Validate *after* canonicalization — and beware **double decoding** (decoding twice can reintroduce a payload).

## Validation is not output safety

Critically: **validation does not replace context-correct handling.** A comment field legitimately contains apostrophes and angle brackets, so you cannot validate XSS away — you must still encode on output, and still parameterize queries. Validation reduces the attack surface; parameterization and encoding are what make data safe at the point of use. Rely on both, in that order of responsibility.

## Server-side, and fail closed

All validation that matters happens **server-side** (client-side is UX only). Reject invalid input with a clear, generic error rather than trying to "clean" it — silently fixing input leads to surprises. When a validation rule can't decide, **fail closed** (reject).

## Type-safe parsing

The cleanest pattern in modern code is parsing into strict types/schemas (Zod, Pydantic, strongly-typed DTOs): define the shape once, reject anything that doesn't fit, and work with validated types downstream — validation and type-safety in one step.`,
      sample: {
        lang: 'python',
        caption: 'Deny-list fails; allow-list and canonicalization hold',
        code: `# BAD deny-list: bypassed by encoding, case, alternatives
if "../" in path: abort(400)        # %2e%2e%2f still gets through
if "<script>" in s: abort(400)      # <ScRiPt> / <img onerror=> do too

# GOOD: canonicalize FIRST, then allow-list
name = os.path.basename(urllib.parse.unquote(user_path))
if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}\\.pdf", name):
    abort(400)                      # only known-good shapes accepted

# Type + range + set membership
qty = request.json.get("qty")
if not isinstance(qty, int) or not (1 <= qty <= 100): abort(400)
if request.json.get("status") not in {"pending", "shipped"}: abort(400)`,
        output: `Allow-list (accept only known-good) beats deny-list (always
evadable). Validate type, length, format, range, set membership -
AFTER canonicalizing. Server-side, fail closed. And remember:
validation does NOT replace parameterization and output encoding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why must input be canonicalized (decoded/normalized) *before* it is validated?',
        options: [
          'Canonicalization makes validation faster',
          'Otherwise a check can be bypassed by an encoded form of the payload — e.g. `%2e%2e%2f` passes a check for `../` but becomes `../` once decoded later — so validation must run on the final, normalized form of the data',
          'Canonicalization replaces the need for validation',
          'Because encoded input is always safe',
        ],
        answer: 1,
        explain:
          'If you validate the raw input but the application decodes it afterwards, an attacker simply encodes the payload to slip past the check: `%2e%2e%2f` does not literally contain `../`, yet becomes `../` after URL decoding. The same applies to Unicode normalization and double encoding. Canonicalizing first — decoding and normalizing to one definitive form — and then applying an allow-list ensures you are checking the value the application will actually use.',
        hint: 'What does `%2e%2e%2f` become after decoding, and when does your check run relative to that?',
      },
    },

    {
      id: 'bweb-a-07',
      title: 'Authentication done properly',
      read: `Authentication is where an app proves who a user is. **Identification and authentication failures** are a standing OWASP Top 10 category because so many details must be right.

## Passwords

- Store them **salted and slow-hashed** (bcrypt/scrypt/Argon2) — the beginner-level rule.
- Enforce a sensible **minimum length** (12+ characters) and allow long passphrases and all characters. Modern guidance (NIST) favours **length over forced complexity** and discourages mandatory periodic rotation (which drives weak, predictable changes) — rotate on evidence of compromise instead.
- **Check against breached-password lists** (e.g. Have I Been Pwned's k-anonymity API) and reject known-compromised passwords — far more effective than composition rules, because credential stuffing uses exactly those passwords.

## Multi-factor authentication

**MFA is the single highest-value authentication control.** It means a stolen or cracked password alone is not enough. Prefer **phishing-resistant** factors — WebAuthn/passkeys/FIDO2 security keys — over TOTP apps, and avoid SMS where possible (SIM swapping, interception). Offer MFA everywhere; require it for administrators.

## Defending the login endpoint

- **Rate limiting and throttling** — slow down guessing, per account *and* per IP. Note **credential stuffing** (many accounts, one password each) evades per-account lockout, so you also need per-IP/global anomaly controls and bot defences.
- **Account lockout** — blunts brute force but can be abused for denial of service (locking out real users); prefer progressive delays, CAPTCHAs and risk-based challenges.
- **Generic error messages** — say "invalid username or password", never "no such user". Differing messages (or timings) let an attacker **enumerate valid accounts**. The same applies to registration and password reset: don't reveal whether an address exists.
- **Log authentication events** — successes, failures, lockouts — and alert on bursts (the detection you built in the host tracks).

## Password reset

Reset flows are a frequent weak point. A safe design: generate a **long random, single-use token**, store only its **hash**, give it a **short expiry**, send it to the registered address, **invalidate it on use**, and **invalidate existing sessions** after a reset. Never email the password, never use guessable tokens (sequential IDs, timestamps), and never expose whether the account exists.

Get these details right — hashed passwords, MFA, rate limiting, generic messages, sound resets — and you close the most commonly exploited path into web applications.`,
      sample: {
        lang: 'text',
        caption: 'Login responses that leak, and a safe reset token',
        code: `LEAKY (allows account enumeration):
  POST /login  user=alice  -> "Password incorrect"     (alice EXISTS)
  POST /login  user=bob    -> "No such user"           (bob does not)
  -> attacker builds a list of valid accounts, then stuffs credentials.

SAFE:
  both -> "Invalid username or password"  (and constant-ish timing)

SAFE RESET TOKEN:
  token = 32 bytes of CSPRNG randomness   (unguessable)
  store  = SHA-256(token)                 (only the hash at rest)
  expiry = 15 minutes, single use, invalidated on use
  after reset: invalidate all existing sessions`,
        output: `Authentication details decide the outcome: slow-hashed
passwords, breached-password checks, MFA (phishing-resistant
preferred), rate limiting (per account AND per IP for credential
stuffing), generic errors to prevent enumeration, and reset
tokens that are random, hashed, short-lived and single-use.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should a login form return the same generic message ("invalid username or password") whether or not the account exists?',
        options: [
          'To make the code simpler',
          'Different messages (or response timings) let an attacker enumerate which accounts exist, producing a validated list of targets for credential stuffing, password spraying or phishing — a generic response denies them that information',
          'Because specific messages are slower to render',
          'Users prefer vague errors',
        ],
        answer: 1,
        explain:
          'If the app distinguishes "no such user" from "wrong password", an attacker can test addresses and learn exactly which accounts are real — valuable reconnaissance that makes credential stuffing, password spraying and targeted phishing far more efficient. Returning one generic message (and keeping timing broadly consistent) prevents enumeration. The same reasoning applies to registration and password-reset flows, which must not reveal whether an address is registered.',
        hint: 'What does an attacker learn from "no such user", and what do they do with a list of valid accounts?',
      },
    },

    {
      id: 'bweb-a-08',
      title: 'Session management',
      read: `Once a user authenticates, the **session** carries their identity — so session handling is as security-critical as the login itself. The session ID is a credential equal to the password.

## Generating session IDs

- Use the framework's session mechanism, backed by a **cryptographically secure random generator** with enough entropy (128 bits+). Never derive a session ID from the username, a counter, a timestamp, or a hash of predictable data — any of those can be guessed or forged.

## Rotate on privilege change (session fixation)

**Session fixation**: an attacker gets a victim to use a session ID the attacker already knows (planting it via a link or a cookie-setting flaw), then the victim logs in with it and the attacker's known ID becomes an authenticated session.

The defence is simple and essential: **issue a brand-new session ID at login** (and at any privilege escalation), discarding the pre-authentication one. Then whatever the attacker planted is worthless.

## Expiry and logout

- **Idle timeout** — end sessions after a period of inactivity (shorter for sensitive apps).
- **Absolute timeout** — cap total session lifetime, so a stolen token can't be used forever.
- **Logout must destroy the session server-side** — not merely delete the cookie in the browser. If the server keeps accepting the old ID, a stolen token still works after "logout". Also invalidate sessions on password change/reset.

## Cookie flags (the essentials again)

- **\`HttpOnly\`** — JavaScript cannot read it, so XSS cannot steal it via \`document.cookie\`.
- **\`Secure\`** — sent only over HTTPS.
- **\`SameSite=Lax\`** (or \`Strict\`) — limits cross-site sending, a strong CSRF mitigation.
- Scope with sensible \`Path\`/\`Domain\` — don't share the cookie more widely than necessary.

## Where to keep session state

Prefer **server-side sessions** (a random ID in the cookie, the state on the server): you can revoke them instantly, and the client sees nothing meaningful. If you use **stateless tokens (JWTs)** as sessions, understand the trade-off: they are hard to revoke before expiry, must be validated strictly (verify the signature and algorithm — never accept \`alg: none\` or let the token choose), and must not be stored where XSS can read them. Keep their lifetime short with refresh tokens. (Token attacks are a pro-level topic.)

Random IDs, rotation at login, real expiry, server-side logout, and protective cookie flags — that is a session you can trust.`,
      sample: {
        lang: 'text',
        caption: 'Session fixation, and the rotation that prevents it',
        code: `ATTACK (session fixation):
  1. attacker obtains/plants session ID  S1  in the victim's browser
     (e.g. https://site.example/?sid=S1 or a cookie-setting flaw)
  2. victim logs in - app KEEPS S1 and marks it authenticated
  3. attacker uses S1  ->  they are now logged in as the victim

DEFENCE - rotate at authentication:
  on successful login:
      destroy the pre-auth session
      issue a NEW random session ID  S2   (128+ bits, CSPRNG)
      Set-Cookie: session=S2; HttpOnly; Secure; SameSite=Lax
  -> S1 is worthless; the attacker never learns S2.`,
        output: `Session ID = a credential. Generate with a CSPRNG, ROTATE at
login (defeats fixation), enforce idle + absolute timeouts,
destroy server-side on logout/password change, and set
HttpOnly + Secure + SameSite. Prefer revocable server-side
sessions over long-lived stateless tokens.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the essential defence against session fixation attacks?',
        options: [
          'Using a longer password policy',
          'Issuing a brand-new, randomly generated session ID at login (and on privilege changes), discarding the pre-authentication one — so any session ID the attacker planted beforehand never becomes an authenticated session',
          'Storing the session ID in localStorage instead of a cookie',
          'Making the session cookie permanent',
        ],
        answer: 1,
        explain:
          'Session fixation works when the application keeps the same session identifier across the authentication boundary: the attacker plants an ID they know, the victim logs in, and that known ID becomes authenticated. Rotating the session ID at login — destroying the pre-auth session and issuing a fresh, high-entropy one — breaks the attack completely, because the attacker has no way to learn the new ID. (Storing tokens in localStorage would be worse, as XSS could read them.)',
        hint: 'The attacker knows the ID *before* login. What must change at the moment of login?',
      },
    },

    {
      id: 'bweb-a-09',
      title: 'Security headers',
      read: `A handful of response headers instruct the browser to enforce protections on your behalf. They are cheap to add and close real attack classes — a standard part of any web hardening baseline.

## The important ones

- **\`Strict-Transport-Security\` (HSTS)** — "only ever reach this site over HTTPS", for a stated duration. Defeats protocol-downgrade and SSL-stripping attacks and stops accidental plaintext requests. Example: \`max-age=31536000; includeSubDomains\`. Apply once HTTPS is solid everywhere (it is sticky in browsers).

- **\`Content-Security-Policy\`** — the XSS/defence-in-depth policy from earlier, and also the home of \`frame-ancestors\`.

- **\`X-Content-Type-Options: nosniff\`** — stops the browser from "MIME sniffing" a response into a different type than declared. Without it, a file you serve as text or an image could be sniffed and executed as script — a real XSS vector on upload/download endpoints. Always set it.

- **\`X-Frame-Options: DENY\`** / **\`frame-ancestors 'none'\`** — the **clickjacking** defence. Clickjacking loads your site invisibly in an iframe over attacker content, so a victim who thinks they are clicking the attacker's page actually clicks a button in *your* app (e.g. "confirm transfer"). Telling the browser your pages may not be framed (or only by your own origin) prevents it. \`frame-ancestors\` in CSP is the modern form; \`X-Frame-Options\` remains for older browsers.

- **\`Referrer-Policy\`** — controls how much of the current URL is sent in the \`Referer\` header to other sites. Set something like \`strict-origin-when-cross-origin\` so sensitive paths, tokens or IDs in URLs don't leak to third parties.

- **\`Permissions-Policy\`** — disable browser features the site doesn't need (camera, microphone, geolocation), reducing what an XSS or malicious embed could reach.

- **\`Cache-Control: no-store\`** on sensitive pages/responses — keeps private data out of browser and proxy caches (a real leak on shared machines).

## Also: don't advertise

Remove or minimise headers that disclose stack details (\`Server\`, \`X-Powered-By\`, framework version banners). It isn't a strong control on its own, but there's no reason to hand attackers your exact versions for targeted exploitation.

## How to adopt

Set them centrally (a middleware, reverse proxy or CDN) so every response gets them, and verify with a scanner (e.g. securityheaders.com or OWASP ZAP). Roll out CSP in report-only mode and HSTS after confirming full HTTPS coverage. These headers don't fix vulnerabilities, but they remove entire classes of browser-side attack and limit the blast radius of the bugs you haven't found yet.`,
      sample: {
        lang: 'text',
        caption: 'A baseline security-header set',
        code: `Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self';
    script-src 'nonce-r4nd0m' 'strict-dynamic';
    object-src 'none'; base-uri 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cache-Control: no-store        (on sensitive responses)

# and remove:  Server: nginx/1.18.0   X-Powered-By: PHP/7.4`,
        output: `Headers make the BROWSER enforce protections: HSTS (no
downgrade), CSP (XSS defence in depth), nosniff (no MIME
sniffing into script), frame-ancestors/X-Frame-Options
(clickjacking), Referrer-Policy (no URL leakage),
Permissions-Policy, no-store. Set them centrally; verify.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What attack does `X-Frame-Options: DENY` (or CSP `frame-ancestors \'none\'`) prevent, and how?',
        options: [
          'SQL injection, by filtering queries',
          'Clickjacking — it tells the browser your pages may not be loaded inside a frame, so an attacker cannot overlay your site invisibly on their own page and trick a victim into clicking buttons in your application',
          'Cross-site scripting, by encoding output',
          'Brute-force login attempts',
        ],
        answer: 1,
        explain:
          'Clickjacking works by embedding the target site in an invisible iframe positioned over attacker-controlled content, so the victim believes they are clicking the attacker’s page while actually clicking a real, authenticated control in the framed application (for example a confirm or transfer button). Instructing the browser that your pages must not be framed — via `frame-ancestors` in CSP (modern) or `X-Frame-Options` (legacy) — makes the overlay impossible. It does not address injection or brute force, which need their own defences.',
        hint: 'What does an attacker need to do with your page in order to trick a user into clicking it unknowingly?',
      },
    },

    {
      id: 'bweb-a-10',
      title: 'Errors, logging and information disclosure',
      read: `How an application behaves when things go wrong tells attackers a great deal. **Information disclosure** through errors and misconfiguration is a quiet but genuinely useful gift to an attacker.

## Don't leak internals in errors

A stack trace shown to the user can reveal the framework and version, file paths, SQL queries, table and column names, internal hostnames and IPs, even credentials in a connection string. All of that helps an attacker target exploits and craft injection payloads.

The rule: **detailed errors go to the log; a generic message goes to the user.** Give the user a friendly error plus a reference/correlation ID, and keep the full detail server-side where support can look it up. Never run production with debug mode enabled — a debug page (Flask's debugger, Rails/Django error pages) can expose configuration and sometimes offer code execution.

## Other common disclosure

- **Directory listing** enabled on the web server, exposing files not meant to be browsed.
- **Backup and temp files** left in the web root (\`config.php.bak\`, \`.env\`, \`db.sql\`, editor swap files) — these are scanned for constantly.
- **Version banners** in headers (previous step).
- **Verbose API errors** that disclose internal field names, logic or the existence of records.
- **Source-map or \`.git\` directory** exposure, handing over source code.

Keep secrets and backups out of the web root entirely, disable directory listing, and ensure the deploy process never ships \`.env\`, \`.git\` or dumps.

## Logging: enough, but not too much

The other side of the same coin. **Log the security-relevant events** — authentication successes and failures, lockouts, access-control denials, administrative actions, significant input-validation failures, and anything unusual — with enough context (who, what, when, from where) to investigate. **Insufficient logging and monitoring** is itself an OWASP Top 10 item, because without it a breach goes unnoticed (the dwell-time lesson).

But **never log secrets**: passwords, session IDs, full tokens, card numbers, or full personal data. Logs are widely readable, shipped to third parties, and retained for years — a password in a log is a breach waiting to happen. Mask or omit sensitive fields.

Also beware **log injection**: untrusted input containing newlines can forge log entries and mislead an investigation — strip or encode control characters before logging, and prefer structured (JSON) logging, which is both safer and easier to query.

## Ship the logs somewhere

Finally, send logs off the host to a central store (the centralized-logging lesson) so they survive compromise and can be correlated and alerted on. Good logs turn a web app from opaque into observable — a prerequisite for detecting the attacks the earlier steps defend against.`,
      sample: {
        lang: 'text',
        caption: 'A leaking error page vs. safe handling',
        code: `LEAKS (shown to the user):
  Traceback (most recent call last):
    File "/srv/app/orders.py", line 88, in get_order
      cur.execute("SELECT * FROM orders WHERE id = " + oid)
  psycopg2.ProgrammingError: syntax error at or near "'"
  DB: postgres://appuser:Pa55w0rd@10.0.2.15:5432/shopdb
  -> framework, path, query shape, table name, DB host AND password.

SAFE:
  to the user:  "Something went wrong. Reference: 7f3c9a21"
  to the log:   full trace + context, secrets masked, reference id
  and: debug mode OFF, no directory listing, no .env/.git/.bak in web root`,
        output: `Detailed errors to the LOG, generic message (+ reference id) to
the USER. Debug off in production; no backups/.env/.git in the
web root. Log security events richly - but never log passwords,
session IDs or tokens - and strip control characters (log
injection). Ship logs off-host.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is displaying a detailed stack trace to users in production a security problem?',
        options: [
          'It makes pages load slowly',
          'It discloses internal details — framework and versions, file paths, SQL queries, table names, internal hosts, sometimes credentials — that help an attacker target exploits and craft injection payloads; detail belongs in the server-side log, with only a generic message and reference ID shown to the user',
          'Stack traces are always inaccurate',
          'It violates HTTP specifications',
        ],
        answer: 1,
        explain:
          'A stack trace is a map of your application’s internals. It can reveal the exact framework and version to look up known exploits, filesystem paths for traversal or upload attacks, the shape of SQL queries and table/column names for injection, internal addresses for further targeting, and occasionally credentials in a connection string. The correct pattern is to log the full detail server-side and return the user a generic message with a correlation ID — plus keeping debug mode off and backups, `.env` and `.git` out of the web root.',
        hint: 'What does the trace tell an attacker about your stack, your queries and your infrastructure?',
      },
    },

    {
      id: 'bweb-a-11',
      title: 'Handling file uploads safely',
      read: `File upload is one of the highest-risk features in a web application: it lets an untrusted party put a file of their choosing onto your server. Done badly, it leads directly to **remote code execution**.

## The worst outcome: an executable web shell

If an attacker can upload a file that the server will **execute** (a \`.php\`, \`.jsp\`, \`.aspx\` file, or anything the web server hands to an interpreter) into a web-accessible directory, they can then request it and run commands as the web user — a full compromise. This is the classic web shell.

## The defences, layered

1. **Never execute uploaded files.** This is the key control. Store uploads **outside the web root** and serve them through a handler that reads and returns the bytes. If they must live under a served path, configure the server so that directory cannot run scripts (disable handlers/CGI/PHP there). Getting this right makes most upload attacks moot.

2. **Don't trust the filename.** Generate your own name (a random ID) and store the original only as metadata. This defeats **path traversal** (\`../../etc/cron.d/x\`), null-byte and double-extension tricks (\`shell.php.jpg\`, \`shell.jpg.php\`), and overwriting existing files. Strip directory components always.

3. **Validate the type properly.** The client-supplied \`Content-Type\` and the extension are attacker-controlled. Check the actual **content** (magic bytes / a library that parses the format), and **allow-list** acceptable types. For images, re-encoding the image through a library both validates it and strips any embedded payload.

4. **Enforce limits** — maximum file size and count, to prevent storage exhaustion and denial of service. Beware decompression bombs for archives.

5. **Scan and isolate** — antivirus/malware scanning for files that will be shared with others; store in a separate location (or object storage/a different domain) so even a served file can't run in your app's origin.

6. **Get serving right** — return uploads with \`X-Content-Type-Options: nosniff\` and a safe \`Content-Type\` (and \`Content-Disposition: attachment\` where appropriate) so the browser doesn't sniff a file into HTML/script, which would be stored XSS on your origin.

7. **Authorize downloads** — check that the requesting user is allowed this file; don't rely on an unguessable path alone, and beware sequential IDs (an access-control issue, next level).

Uploads combine several risks — execution, traversal, XSS, DoS, malware — so treat the feature as security-critical: **store outside the web root, never execute, rename, validate by content, limit size, and serve safely.**`,
      sample: {
        lang: 'python',
        caption: 'A safe upload path: rename, validate by content, store outside web root',
        code: `ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png"}
MAX = 5 * 1024 * 1024          # size limit

data = f.read(MAX + 1)
if len(data) > MAX: abort(413)

kind = magic.from_buffer(data, mime=True)   # real content, not the header
if kind not in ALLOWED: abort(400)

name = secrets.token_hex(16) + ALLOWED[kind]   # OUR name, not theirs
path = os.path.join("/var/app/uploads", name)  # OUTSIDE the web root
open(path, "wb").write(data)

# served later by a handler that authorizes the user and sends:
#   Content-Type: image/png   X-Content-Type-Options: nosniff`,
        output: `Uploads are high risk: a file the server EXECUTES = remote code
execution (web shell). Defences: store outside the web root and
never execute, generate your own filename (kills traversal and
double-extension tricks), validate by CONTENT not extension or
Content-Type, limit size, scan, serve with nosniff, authorize.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the single most important control when accepting file uploads, and why?',
        options: [
          'Checking the file extension in JavaScript before upload',
          'Ensuring uploaded files are never executed by the server — storing them outside the web root (or in a directory with script execution disabled) — because a file the server will execute gives an attacker remote code execution via a web shell',
          'Renaming the file to its original name',
          'Trusting the Content-Type header sent by the browser',
        ],
        answer: 1,
        explain:
          'The catastrophic upload outcome is an attacker placing a script the server will run (a web shell) somewhere web-accessible, then requesting it to execute commands as the web user. Preventing execution — storing uploads outside the web root and serving them through a handler, or disabling script handlers in the upload directory — removes that entire class of attack regardless of extension tricks. Client-side checks and the browser-supplied Content-Type are attacker-controlled and provide no security; renaming, content-based validation, size limits and safe serving are important additional layers.',
        hint: 'What is the worst thing that can happen to an uploaded file on the server, and which control prevents it outright?',
      },
    },

    {
      id: 'bweb-a-12',
      title: 'Project: secure a vulnerable application',
      read: `Bring the level together the way a web defender is measured: take a deliberately vulnerable app and **find, fix and verify** its flaws — a hands-on secure code review and remediation.

## The exercise

Working on your lab app (Juice Shop, DVWA, or a small app you write on purpose to be flawed), proxy it through Burp/ZAP and work the list:

1. **Find injection** — try inputs with quotes and metacharacters on every parameter; look for errors or changed behaviour. **Fix:** convert every query to parameterized statements; allow-list any identifier used in ORDER BY/column positions; add a least-privilege DB account. Re-test.

2. **Find XSS** — reflected (does input appear in the response?), stored (does saved content render for other users?), and DOM (does client JS write input into \`innerHTML\`?). **Fix:** encode on output in the correct context, switch dangerous sinks to \`textContent\`, use the framework's auto-encoding (and sanitize with DOMPurify where real HTML is needed). Add a nonce-based **CSP**. Re-test.

3. **Check authentication** — are passwords slow-hashed and salted? Is there rate limiting? Do errors enable enumeration? Is MFA available? Is the reset token random, hashed, short-lived, single-use?

4. **Check sessions** — is the ID high-entropy? Does it **rotate at login**? Are \`HttpOnly\`, \`Secure\` and \`SameSite\` set? Does logout invalidate server-side? Are timeouts enforced?

5. **Check headers** — HSTS, CSP, \`nosniff\`, \`frame-ancestors\`, \`Referrer-Policy\`. Add the baseline centrally.

6. **Check errors, logging and uploads** — debug off, generic errors with a reference ID, no \`.env\`/\`.git\`/backups exposed, security events logged without secrets, uploads renamed, content-validated, stored outside the web root and never executed.

## Verify, don't assume

For every fix, **re-run the attack that worked** and confirm it now fails — and confirm the feature still works for legitimate use. That prove-it discipline (the same as testing detections both ways) is what separates a real fix from a hopeful one.

## The measure of success

You can take an unfamiliar web app, map its attack surface, find the classic flaws, apply the *correct structural* fix for each (parameterization, context-correct encoding, secure session handling, headers), and **demonstrate** the vulnerability is gone.

> The level distilled: **injection is fixed by separating data from code (parameterize, argument arrays, template variables); XSS is fixed by encoding output in the right context, with CSP as the safety net; authentication and sessions are fixed by details done right (slow hashes, MFA, rate limits, generic errors, rotation, timeouts, cookie flags); and headers, safe errors, careful logging and hardened uploads close the rest.** Validation supports all of it but replaces none of it. Fix structurally, then verify — that is defensive web engineering.`,
      sample: {
        lang: 'text',
        caption: 'A remediation checklist with verification',
        code: `Finding                       Fix applied                    Verified
-----------------------------------------------------------------------------
SQLi in /search?q=            parameterized query            payload now literal
SQLi in ORDER BY column       allow-list of column names     rejected (400)
Reflected XSS in /search      context-correct HTML encoding  rendered as text
Stored XSS in comments        encode on output + DOMPurify   script inert
DOM XSS (innerHTML)           switched to textContent        no execution
No CSP                        nonce-based strict CSP         inline script blocked
Session kept across login     rotate session ID at login     fixation fails
Cookie missing flags          HttpOnly; Secure; SameSite=Lax JS cannot read it
Stack traces shown            generic error + reference id   no internals leaked
Upload executed as PHP        stored outside web root        shell.php 404s`,
        output: `For every fix, re-run the attack that worked and confirm it now
fails - and that the feature still works. Structural fixes
(parameterization, context encoding, session rotation, no
execution of uploads) plus verification. That is the job.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After fixing a vulnerability, why is it essential to re-run the exact attack that previously worked?',
        options: [
          'To confirm the application still compiles',
          'To verify the fix actually closes the vulnerability rather than merely appearing to — and to confirm legitimate functionality still works; an unverified fix is a hope, and partial fixes (such as filtering one payload) often leave the underlying flaw exploitable by a variant',
          'Because attacks always stop working over time anyway',
          'To generate more entries in the log file',
        ],
        answer: 1,
        explain:
          'Plenty of "fixes" are incomplete — blocking one payload string while the underlying concatenation remains, encoding for the wrong context, or rotating a session in one code path but not another. Re-running the original attack proves the specific exploitation now fails, and trying variants proves you addressed the root cause rather than a symptom. You also confirm you have not broken legitimate use. It is the same prove-it-both-ways discipline used when validating detections: demonstrate it blocks the bad and permits the good.',
        hint: 'How do you tell a structural fix from one that merely blocks the single payload you happened to test?',
      },
    },
  ],
}

export default level
