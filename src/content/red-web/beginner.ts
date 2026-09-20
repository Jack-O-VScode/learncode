import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Offensive web — ethics, lab and how the web works',
  summary:
    'Authorized web application testing from zero. The law, authorization and scope that make web testing legal; a safe lab of deliberately vulnerable apps you run yourself; how the web actually works (HTTP requests and responses, methods, status codes, where input goes); the intercepting proxy that is every web tester’s core tool; and how to map an application and read the OWASP Top 10. Every technique here is used only on apps you own or are authorized to test.',
  outcomes: [
    'State the legal and ethical rules that make web testing legitimate',
    'Build a lab of deliberately vulnerable web apps to practise on',
    'Explain the HTTP request/response cycle, methods and status codes',
    'Use an intercepting proxy to view and modify requests',
    'Map an application and identify where user input flows',
    'Read the OWASP Top 10 as a map of what to look for',
  ],
  steps: [
    {
      id: 'rweb-b-01',
      title: 'The rules that make this legal',
      read: `Web application testing — probing sites for injection, broken access control, and the rest — is a legitimate, valuable profession **only when it is authorized**. The exact same request is a paid engagement against one application and a criminal offence against another; **the only difference is permission.** This is the first and most important lesson, and it governs everything in this track.

## The law is not optional

Accessing a computer system or application without authorization is a crime almost everywhere: the **Computer Fraud and Abuse Act** (US), the **Computer Misuse Act** (UK), and equivalents worldwide. Web apps are internet-facing and easy to reach, which makes it dangerously easy to cross a line — but reachability is not permission. Sending an attack payload to a site you do not own or have permission to test is unauthorized access, regardless of intent, and people have been prosecuted for exactly that.

## Authorization must be explicit

Legitimate testing rests on **written authorization** before anything begins:

- **Scope** — precisely which domains, applications, and functionality you may test, and what is off-limits (a specific subdomain? the payment flow? third-party integrations?). Web scope creep is easy — one app often calls many hosts — so scope discipline matters.
- **Rules of engagement** — what is permitted (automated scanning? account creation? testing that could affect data?), the window, and who to contact.
- **Authority** — granted by someone who actually controls the application.

## Where you may practise

Because you will not have authorization for arbitrary sites while learning, this whole track uses targets that are legal by design:

- **Deliberately vulnerable apps you run** — DVWA, OWASP Juice Shop, WebGoat, bWAPP (this level sets one up).
- **Training platforms** — PortSwigger Web Security Academy (free, excellent), Hack The Box, TryHackMe — which grant permission in their terms.
- **Bug bounty programs** — real apps, but *only* strictly within their published scope and rules.

## The ethical frame

Never send a payload to an app you do not own or have written permission to test — not "just one \`' OR 1=1\`", not "just to see." The purpose is always defensive: you find flaws so owners can fix them before criminals exploit them. Keep every technique in this track inside that boundary, always.`,
      sample: {
        lang: 'text',
        caption: 'The same request, two completely different situations',
        code: `POST /login   username=admin'--   (a SQL injection attempt)

  AGAINST AN APP YOU ARE AUTHORIZED TO TEST:
    -> a finding in a report; a flaw the owner can fix.
       Legitimate, professional work.

  AGAINST AN APP YOU ARE NOT AUTHORIZED TO TEST:
    -> unauthorized access. A crime under the CFAA / Computer
       Misuse Act / local law, regardless of intent.

The request is identical. AUTHORIZATION is the entire difference.`,
        output: `Web testing is legal ONLY with explicit authorization defining
scope (which apps/functionality) and rules of engagement.
Practise only on vulnerable apps you run, training platforms, or
bug bounties within their published scope.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A web application is publicly reachable on the internet. Does that mean you may test it for vulnerabilities?',
        options: [
          'Yes — if it is publicly accessible, testing it is allowed',
          'No — reachability is not permission; sending attack payloads to an app you do not own or have written authorization to test is unauthorized access and a crime regardless of intent, so you test only apps you run, training platforms, or bug bounties within their scope',
          'Yes, as long as you only test the login page',
          'Yes, provided you report anything you find afterwards',
        ],
        answer: 1,
        explain:
          'Being able to reach an application is not the same as being allowed to attack it. Web apps are internet-facing and trivially reachable, which makes it dangerously easy to cross a legal line, but laws like the CFAA and the Computer Misuse Act criminalise unauthorized access itself — sending an attack payload to a site you do not own or have written permission to test is unauthorized, whatever your intent, and people have been prosecuted for exactly that. Legitimate work rests on explicit authorization defining the in-scope applications and functionality and the rules of engagement. While learning, you practise only on deliberately vulnerable apps you run, training platforms that grant permission, or bug bounty programs strictly within their published scope.',
        hint: 'Does the fact that you *can* reach something mean you are *allowed* to attack it?',
      },
    },

    {
      id: 'rweb-b-02',
      title: 'Building a web testing lab',
      read: `Since you will only practise on apps you own or are authorized to test, the first practical step is to set up a **lab** — deliberately vulnerable web applications you run locally, plus the tools to test them.

## The vulnerable targets

These apps are *built to be attacked* — they contain intentional vulnerabilities for learning, and are licensed for exactly this:

- **OWASP Juice Shop** — a modern JavaScript app packed with realistic vulnerabilities and a gamified challenge list. Excellent and current.
- **DVWA (Damn Vulnerable Web Application)** — a classic PHP app with adjustable difficulty, great for the fundamentals.
- **WebGoat** — OWASP's guided teaching app with lessons.
- **bWAPP** — a large collection of specific vulnerabilities to practise.

Most run trivially in **Docker** (\`docker run\`), so you can spin one up in seconds and reset it when you break it.

## The tools

- **An intercepting proxy** — **Burp Suite** (Community edition is free) or **OWASP ZAP** (fully free). This is the single most important web-testing tool; the next steps introduce it. It sits between your browser and the app so you can see and modify every request.
- **A browser** — configured to send its traffic through the proxy.
- **Command-line helpers** — \`curl\` for hand-crafting requests, and tools like \`ffuf\`/\`gobuster\` for content discovery later.

## Keep it local and isolated

Run the vulnerable apps **locally** (or in an isolated VM/Docker network). A deliberately vulnerable app is, by design, easy to compromise — so do not expose it to the internet, where a real attacker could reach it and use it as a foothold. Local-only keeps your practice safe and lawful.

## Why a lab is non-negotiable

You cannot learn web attacking by reading alone, and you cannot practise on real sites. The lab makes hands-on learning both possible and lawful: a place where every technique in this track can be tried against apps that exist to be attacked, with zero risk to anyone. Set up Juice Shop (or DVWA) and Burp/ZAP now, and treat them as the *only* place these techniques are used — until you have written authorization for something else.`,
      sample: {
        lang: 'bash',
        caption: 'Spinning up a vulnerable app locally with Docker',
        code: `# OWASP Juice Shop (modern JS app) - runs on localhost:3000
docker run --rm -p 3000:3000 bkimminich/juice-shop

# DVWA (classic PHP app) - another common choice
docker run --rm -p 8080:80 vulnerables/web-dvwa

# Then point your browser at http://localhost:3000 and route it
# through Burp/ZAP. Keep these LOCAL - never expose them.`,
        output: `Juice Shop live at http://localhost:3000 (local only).
Deliberately vulnerable apps are easy to pop by design -> never
expose them to the internet. Reset by re-running the container.
Your lab: a vulnerable app + an intercepting proxy.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should deliberately vulnerable practice apps (Juice Shop, DVWA) be run locally and never exposed to the internet?',
        options: [
          'Because they run faster on localhost',
          'Because they are intentionally easy to compromise, so exposing one to the internet would let a real attacker take it over and use it as a foothold — keeping it local (or in an isolated network) keeps your practice safe and lawful',
          'Because Burp Suite only works on local applications',
          'Because they require no internet connection to function',
        ],
        answer: 1,
        explain:
          'These training apps deliberately contain real, exploitable vulnerabilities — that is what makes them useful for learning. But it also means that anyone who can reach one can trivially compromise it. If you exposed such an app to the internet, a real attacker could take it over and potentially use it as a foothold onto your machine or network. Running it locally (or in an isolated VM/Docker network) contains that risk, keeping your practice both safe and lawful. You can reset a broken app in seconds by re-running its container. Combined with an intercepting proxy, a local vulnerable app is your complete beginner lab.',
        hint: 'What is true by design of an app built to be hacked, and what would happen if the internet could reach it?',
      },
    },

    {
      id: 'rweb-b-03',
      title: 'How the web works: HTTP',
      read: `To attack web apps you must understand how they communicate, and the web runs on **HTTP** — a simple request/response protocol. Almost every web attack is, underneath, a specially-crafted HTTP request.

## The request/response cycle

1. Your **browser** (the client) sends an **HTTP request** to a **server** — "give me this page" or "here is my login form."
2. The **server** processes it and sends back an **HTTP response** — the HTML, data, or an error.

That is the whole loop, repeated for every page, image, and API call. HTTP is **stateless**: each request stands alone, so apps track who you are with cookies/sessions (a later topic).

## Anatomy of a request

An HTTP request has:

- A **method** and **path** — e.g. \`GET /products?id=5\` or \`POST /login\`.
- **Headers** — metadata: \`Host\`, \`Cookie\`, \`User-Agent\`, \`Content-Type\`, and more.
- A **body** (for POST/PUT) — the data being sent, e.g. form fields \`username=alice&password=...\`.

## Anatomy of a response

- A **status code** — 200 (OK), 302 (redirect), 404 (not found), 500 (server error) — a quick signal of what happened.
- **Headers** — \`Set-Cookie\`, \`Content-Type\`, security headers, etc.
- A **body** — the HTML/JSON/data returned.

## Why this is the foundation of web attacking

**Everything you send in a request is attacker-controlled** — the path, the parameters, the headers, the body, the cookies. The server *must not trust any of it*, but often does. Web attacking is fundamentally about crafting requests whose inputs make the server misbehave: a parameter that becomes a database query (SQL injection), a field that becomes HTML in someone's browser (XSS), a cookie you tamper with (broken auth). Seeing the request as *raw, editable text you fully control* — which the intercepting proxy makes literal — is the mental shift that unlocks the whole field. In the lab, load a page and look at the exact request and response it produced.`,
      sample: {
        lang: 'text',
        caption: 'A raw HTTP request and response',
        code: `REQUEST (everything here is attacker-controllable):
  GET /products?id=5 HTTP/1.1
  Host: shop.example
  Cookie: session=abc123
  User-Agent: Mozilla/5.0

RESPONSE:
  HTTP/1.1 200 OK
  Content-Type: text/html
  Set-Cookie: last=5

  <html> ... product 5 ... </html>`,
        output: `HTTP = request -> response, repeated. It is STATELESS (cookies
track you). KEY INSIGHT: the path, params, headers, cookies and
body are ALL attacker-controlled. The server must not trust any of
it - but often does. Web attacks craft requests that misbehave.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the single most important insight about HTTP requests for a web attacker?',
        options: [
          'Requests are encrypted, so their contents cannot be changed',
          'Every part of a request — the path, parameters, headers, cookies and body — is attacker-controlled, so the server must not trust any of it; web attacks craft request inputs that make a server that *does* trust them misbehave',
          'Only the URL of a request can be modified by the client',
          'HTTP responses, not requests, are where attacks originate',
        ],
        answer: 1,
        explain:
          'HTTP is a request/response protocol, and the entire request is composed and sent by the client — so the path, query parameters, headers, cookies, and body are all fully attacker-controlled. The security consequence is fundamental: the server must treat every bit of that input as untrusted, yet applications frequently trust it, which is where vulnerabilities come from. SQL injection happens when a parameter is trusted into a database query; XSS when input is trusted into HTML; broken authentication when a tampered cookie is trusted. Seeing the request as raw, editable text you fully control — exactly what an intercepting proxy shows you — is the mental shift that underpins the whole field. (Encryption protects requests in transit but does not stop the client from crafting whatever it wants.)',
        hint: 'Who composes and sends the request, and therefore controls its every field?',
      },
    },

    {
      id: 'rweb-b-04',
      title: 'Methods, status codes and headers',
      read: `A little more HTTP vocabulary pays off constantly: **methods**, **status codes**, and **headers** are the signals you read and manipulate in every test.

## HTTP methods (verbs)

- **GET** — retrieve a resource; parameters go in the URL (\`?id=5\`). Should not change state (but buggy apps let it).
- **POST** — submit data (forms, logins); data goes in the body.
- **PUT / DELETE / PATCH** — update/remove/modify, common in APIs.
- **OPTIONS / HEAD** — metadata about a resource; \`OPTIONS\` can reveal which methods an endpoint allows.

Testers care because an app may enforce access control on one method but not another, or expose dangerous methods (PUT to upload a file). Trying a different method than the app expects is a classic check.

## Status codes (the response's headline)

- **2xx** (200 OK, 201 Created) — success.
- **3xx** (301/302) — redirect; often used after login.
- **4xx** — client error: **401** (unauthenticated), **403** (forbidden — authenticated but not allowed), **404** (not found).
- **5xx** — server error: **500** often means your input broke something server-side — a strong signal you may have found a bug (e.g. an injection that malformed a query).

The *difference* between codes is a leak: 403 vs 404 tells you whether something exists but is forbidden; a 500 on a crafted input hints at an injection.

## Headers worth knowing

- **Request**: \`Cookie\` (your session), \`Authorization\` (API tokens), \`Host\`, \`Referer\`, \`Content-Type\`.
- **Response**: \`Set-Cookie\`, \`Location\` (redirect target), \`Content-Type\`, and **security headers** (\`Content-Security-Policy\`, \`X-Frame-Options\`, \`Strict-Transport-Security\`) whose *absence* is itself a finding.

## Why it matters

You read status codes to know what your requests did, you manipulate methods and headers to probe behaviour, and you note missing security headers as findings. This vocabulary turns the raw request/response into signals you can act on. In the lab, send the same endpoint a GET and a POST, and watch how status codes change with valid vs malformed input.`,
      sample: {
        lang: 'text',
        caption: 'Reading the signals: methods, codes, headers',
        code: `METHODS: GET (url params) POST (body) PUT/DELETE/PATCH (APIs)
         -> try an unexpected method: access control gap? PUT upload?

STATUS CODES:
  200 OK      201 Created         (success)
  301/302     redirect            (often post-login)
  401 no auth 403 forbidden       404 not found
  500 SERVER ERROR  <- your input may have broken something = a lead!

HEADERS: Cookie/Authorization (you), Set-Cookie/Location (server)
  MISSING security headers (CSP, X-Frame-Options, HSTS) = a finding`,
        output: `Codes tell you what happened (500 on crafted input = possible
bug). Methods/headers are levers to probe with. Missing security
headers are findings in themselves. This vocabulary = the signals
you read and manipulate in every single test.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'While testing, you send a crafted value in a parameter and the server responds with HTTP 500. Why is that interesting to a tester?',
        options: [
          'It means the request succeeded normally',
          'A 500 (server error) suggests your input broke something server-side — for example an injected value that malformed a database query — so it is a strong lead that you may have found a vulnerability worth investigating',
          'It means the page was not found',
          'It means you are forbidden from accessing the resource',
        ],
        answer: 1,
        explain:
          'A 500-series status code is a server-side error, meaning something in the application failed while processing your request. When that happens specifically in response to a crafted input, it is a strong signal that your input reached code that could not handle it — classically, an injection payload that malformed a SQL query or broke a parser. That does not confirm a vulnerability by itself, but it is a valuable lead pointing you where to probe further. Contrast the other codes: 2xx is success, 404 is not-found, 401/403 are authentication/authorization responses. Reading status codes (and manipulating methods and headers, and noting missing security headers) is how you turn raw responses into actionable signals.',
        hint: 'What does a *server* error in response to your crafted input hint about where your input went?',
      },
    },

    {
      id: 'rweb-b-05',
      title: 'The browser, HTML and where input goes',
      read: `Web apps run partly in the **browser** and partly on the **server**, and knowing which is which — and where your input travels — is essential to understanding vulnerabilities.

## Client side vs server side

- **Server side** — code running on the server (in PHP, Python, Node, Java, etc.) that handles requests, talks to the database, enforces logic, and builds responses. **Server-side vulnerabilities** (SQL injection, command injection, SSRF) let you attack the server and its data.
- **Client side** — code running in the *browser*: **HTML** (structure), **CSS** (style), and **JavaScript** (behaviour). **Client-side vulnerabilities** (XSS, CSRF) attack the *users* of the app, in their browsers.

This client/server split is one of the most important frames in web security: a vulnerability's *impact* depends on which side it executes on, and who it harms (the server/data, or other users).

## Where your input goes — the data-flow question

Every input you send ends up used somewhere, and the vulnerability class depends on *where*:

- Into a **database query** → SQL injection.
- Into the **HTML page** shown to a user → cross-site scripting (XSS).
- Into a **system command** → command injection.
- Into a **file path** → path traversal.
- Into a **redirect target**, an **HTTP request the server makes**, an **XML parser** — each a different class.

So the core question for any input is: **where does this data flow, and is it trusted there?** Tracing an input from the request to where it is *used* tells you what to test.

## The critical trap: client-side checks are not security

Because JavaScript runs in *your* browser, **any client-side validation can be bypassed** — you control the browser and the request. A field that JavaScript says must be a number can be sent as anything by editing the request in your proxy. So "the form won't let me" is never a real restriction; real security must be enforced **server-side**. This single fact defeats a huge number of naive protections. In the lab, find a form with client-side validation, then bypass it entirely by editing the request in Burp/ZAP.`,
      sample: {
        lang: 'text',
        caption: 'Client vs server, and where input flows',
        code: `CLIENT SIDE (in the browser)     SERVER SIDE (on the server)
  HTML / CSS / JavaScript          PHP / Python / Node / Java + DB
  attacks harm USERS               attacks harm the SERVER/DATA
  (XSS, CSRF)                      (SQLi, command inj, SSRF)

WHERE DOES MY INPUT GO? -> the vuln class:
  -> DB query        = SQL injection
  -> the HTML page    = XSS
  -> a system command = command injection
  -> a file path      = path traversal`,
        output: `CLIENT-SIDE CHECKS ARE NOT SECURITY: JavaScript runs in YOUR
browser, so any client validation is bypassable by editing the
request. Real security is enforced SERVER-SIDE. "The form won't
let me" is never a real restriction.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An app uses JavaScript to ensure a form field contains only a number before submitting. Why is this not a security control?',
        options: [
          'Because JavaScript numbers are imprecise',
          'Because JavaScript runs in the attacker’s own browser, so client-side validation can be bypassed entirely by editing the request (e.g. in an intercepting proxy) — real security must be enforced server-side',
          'Because numbers cannot be validated in JavaScript',
          'Because the field should use a dropdown instead',
        ],
        answer: 1,
        explain:
          'Client-side code — HTML and JavaScript — executes in the user’s browser, which the attacker fully controls. Any check JavaScript performs before submitting can simply be skipped: the attacker edits the outgoing request in an intercepting proxy (or crafts it with curl) and sends whatever they like, bypassing the validation entirely. So client-side validation is a usability and convenience feature, never a security boundary. Real security must be enforced server-side, where the attacker cannot tamper with the code. This single fact — "the form won’t let me" is not a restriction — defeats a large class of naive protections and is why tracing where input actually flows, and what enforces the rules, matters so much.',
        hint: 'Whose browser runs the JavaScript, and can the attacker change what that browser sends?',
      },
    },

    {
      id: 'rweb-b-06',
      title: 'Your core tool: the intercepting proxy',
      read: `The single most important web-testing tool is the **intercepting proxy** — Burp Suite or OWASP ZAP. It sits between your browser and the app and lets you **see and modify every request**. Mastering it is mastering web testing.

## What it does

Normally your browser talks straight to the server. With a proxy configured, all traffic goes **browser → proxy → server** and back. The proxy shows you every request and response, and — crucially — lets you **pause, edit, and resend** them. That "edit the request before it goes" ability is what turns the browser from a viewer into an attack tool.

## The key features (Burp terms; ZAP has equivalents)

- **Proxy / intercept** — pause a request, edit any part (parameter, header, cookie, body), then forward it. This is how you bypass client-side checks and inject payloads.
- **HTTP history** — a log of every request the app made, so you can find endpoints and parameters you did not know existed.
- **Repeater** — resend a single request over and over with tweaks. The workhorse for manually probing one input (change the payload, see the response, repeat).
- **Intruder** (Burp) / fuzzers (ZAP) — automate sending many payloads into a parameter (for brute forcing, fuzzing, enumeration).
- **Decoder / Comparer** and extensions — encode/decode data, compare responses, and extend functionality.

## Setup

Point your browser's proxy at Burp/ZAP (usually \`127.0.0.1:8080\`) and install the proxy's CA certificate so it can read HTTPS (it acts as a trusted MITM *for your own traffic*, which is exactly the interception concept — here, on traffic you own). Then browse the target and watch requests populate the history.

## Why it is central

Every web attack in this track flows through the proxy: you find inputs in the history, probe them in Repeater, automate with Intruder, and modify requests to inject payloads and bypass client-side restrictions. If you learn one tool deeply for web testing, it is this. In the lab, configure Burp/ZAP, browse Juice Shop through it, intercept a login request, and modify a field before forwarding it.`,
      sample: {
        lang: 'text',
        caption: 'How an intercepting proxy changes the game',
        code: `WITHOUT proxy:  browser  ->  server   (you only see the page)

WITH proxy:     browser -> [PROXY] -> server
                          ^ pause, EDIT any part, resend

KEY FEATURES (Burp / ZAP equivalents):
  Intercept  pause+edit a request before it's sent
  HTTP history  every request -> find hidden endpoints/params
  Repeater   resend one request with tweaks (manual probing)
  Intruder   automate many payloads into a parameter (fuzz/brute)`,
        output: `The proxy turns the browser from a VIEWER into an ATTACK TOOL:
you see and can EDIT every request. Install its CA cert to read
your own HTTPS. Every web attack flows through it. Learn one tool
deeply - this is it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What capability makes an intercepting proxy (Burp/ZAP) the central tool for web testing?',
        options: [
          'It automatically finds and exploits all vulnerabilities',
          'It sits between the browser and the server so you can see and modify every request — pausing and editing any parameter, header, cookie or body before it is sent — turning the browser from a passive viewer into a tool that can inject payloads and bypass client-side checks',
          'It makes the target application run faster',
          'It encrypts your traffic so the server cannot read it',
        ],
        answer: 1,
        explain:
          'An intercepting proxy routes all traffic through itself (browser → proxy → server), so it shows you every request and response and — critically — lets you pause, edit, and resend any request, changing any parameter, header, cookie, or body before it reaches the server. That ability to arbitrarily modify requests is what turns the browser into an attack tool: it is how you inject payloads, bypass client-side validation, and probe inputs. Its supporting features (HTTP history to discover endpoints, Repeater for manual probing, Intruder/fuzzers for automation) build on that core. It does not auto-exploit everything, speed up the app, or hide traffic from the server — you drive it, and it is the tool every web attack in this track flows through.',
        hint: 'What can you do to a request once it passes through the proxy that you cannot do from the browser alone?',
      },
    },

    {
      id: 'rweb-b-07',
      title: 'Mapping the application',
      read: `Before attacking, you **map** the application — discover its pages, endpoints, parameters, and functionality. Like enumeration in the other tracks, thorough mapping is where web engagements are won: you cannot test what you have not found.

## What mapping means

Build a complete picture of the app's **attack surface**: every URL, every form, every parameter, every API endpoint, every piece of functionality (login, search, upload, admin panel), and every user role. Each of these is a place input flows — and therefore a place to test.

## How to map

- **Browse it thoroughly (manual)** — click through every feature as a normal user, with the proxy recording. The HTTP history then contains every request the app made — often revealing endpoints and parameters you would never see in the URL bar (API calls, background requests). Manual walking is the most important and most under-done step.
- **Spider / crawl** — the proxy can automatically follow links to discover pages. Useful, but misses anything not linked.
- **Content discovery (forced browsing)** — many valuable endpoints are *not linked* (admin panels, backups, old pages, API routes). Tools like **ffuf**, **gobuster**, or Burp's content discovery request likely paths from a wordlist (\`/admin\`, \`/backup\`, \`/api/\`, \`/.git/\`) and note which return something. This finds the hidden attack surface.
- **Analyse the client-side code** — JavaScript files often reveal API endpoints, parameters, and even comments or keys. Read them.

## Note the roles and states

Map the app as **different users**: an anonymous visitor, a normal user, an admin. What each can reach defines the access-control surface you will test later (can a normal user reach an admin endpoint?). Also note authenticated vs unauthenticated areas.

## Why thoroughness matters

The most common reason a real vulnerability is missed is that the endpoint was never found. A hidden \`/api/v1/users/{id}\` with no access control, a forgotten \`/admin-old\`, an exposed \`/.git/\` directory — these are found by mapping, not by luck. Invest here: a complete map turns the rest of testing into methodically checking each surface, rather than guessing. In the lab, map Juice Shop thoroughly — browse every feature through the proxy, run content discovery, and read the JavaScript for hidden API routes.`,
      sample: {
        lang: 'bash',
        caption: 'Content discovery finds unlinked endpoints',
        code: `# Fuzz for unlinked paths from a wordlist (lab target):
ffuf -u http://localhost:3000/FUZZ -w wordlist.txt

# gobuster does the same:
gobuster dir -u http://localhost:3000 -w wordlist.txt

# Also: browse EVERY feature through the proxy (HTTP history =
# every endpoint), and READ the app's JavaScript for API routes.`,
        output: `/admin      (302)   <- an admin area not linked anywhere
/api        (200)   <- an API root
/.git       (200)   <- exposed source repo! (a serious finding)
/backup     (200)   <- a backup file

Most missed vulns are on endpoints that were never FOUND.
Thorough mapping (manual + discovery + JS) = the attack surface.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is content discovery (forced browsing with tools like ffuf/gobuster) an essential part of mapping a web application?',
        options: [
          'It exploits vulnerabilities automatically',
          'Because many valuable endpoints — admin panels, backups, old pages, API routes, exposed .git directories — are not linked anywhere, so they only appear by requesting likely paths from a wordlist; the most common reason a real vulnerability is missed is that its endpoint was never found',
          'Because it is the only way to see the HTML of a page',
          'Because it is faster than browsing the site once',
        ],
        answer: 1,
        explain:
          'Mapping builds the app’s attack surface, and a large part of that surface is not reachable by clicking links: admin panels, backup files, deprecated pages, undocumented API routes, and accidentally-exposed directories like /.git are often unlinked. Spidering only follows links, so it misses them. Content discovery (forced browsing) requests likely paths from a wordlist and reports which exist, surfacing exactly this hidden attack surface. It matters because the single most common reason a genuine vulnerability goes undiscovered is that the endpoint hosting it was never found — you cannot test what you have not located. Combined with thorough manual browsing through the proxy and reading the client-side JavaScript for endpoints, it makes the map complete. It does not exploit anything by itself.',
        hint: 'What kind of endpoints will you never reach by clicking links, and what happens to a vuln on an endpoint you never found?',
      },
    },

    {
      id: 'rweb-b-08',
      title: 'Parameters and where data flows',
      read: `With the app mapped, focus on its **parameters** — the individual inputs you control. Every parameter is a place data enters the application, and tracing where each one *flows* is the essence of finding vulnerabilities.

## Where parameters live

Input reaches the server in several places, and all are testable:

- **URL query parameters** — \`?id=5&sort=name\` in a GET request.
- **Body parameters** — form fields or JSON in a POST/PUT (\`username=alice\`, \`{"amount": 100}\`).
- **Headers** — \`Cookie\`, \`User-Agent\`, \`Referer\`, custom headers; apps sometimes trust these unsafely.
- **Path segments** — \`/users/5/profile\` — the \`5\` is an input too.
- **File uploads** — filename and contents.

A tester enumerates *every* parameter across every endpoint. The proxy's history is your inventory.

## The data-flow question, per parameter

For each parameter, ask the question from earlier: **where does this value go, and is it trusted there?**

- \`id=5\` used to look up a record → try changing it to someone else's id (access control / IDOR), or to \`5'\` (SQL injection).
- A \`search\` term echoed back on the page → try HTML/script (XSS).
- A \`filename\` used to read a file → try \`../../etc/passwd\` (path traversal).
- A \`url\` the server fetches → try an internal address (SSRF).

The parameter's *name and behaviour* hint at where it flows, and thus what to test. This is why understanding the app (what each feature does) guides testing far better than blind payload-spraying.

## Systematic testing

The professional approach is methodical: for each parameter, form a hypothesis about where it flows, send a probe that would reveal a flaw there, and read the response. A single quote for SQL, a script tag for XSS, a traversal sequence for file reads — small, safe probes that *indicate* a vulnerability to then confirm. Coverage (testing every parameter) plus the right probe per parameter is what finds bugs.

## Why this frames everything ahead

The whole rest of this track is, in effect, "here are the specific things that go wrong when a parameter flows into a database, into HTML, into a command, into a file path, into a request." Beginner sets the frame; amateur and beyond fill in each class. In the lab, pick one parameter in your target, hypothesise where it flows, and send a safe probe to test that hypothesis.`,
      sample: {
        lang: 'text',
        caption: 'Every parameter is an input; trace where each flows',
        code: `PARAMETERS LIVE IN:
  URL query   ?id=5&sort=name
  body        username=alice  /  {"amount":100}
  headers     Cookie, User-Agent, Referer
  path        /users/5/profile   (the 5 is input!)
  uploads     filename + contents

PER PARAMETER, ASK "where does it flow?" -> what to test:
  id -> DB lookup    : try 5' (SQLi) or another id (IDOR)
  search -> the page : try <script> (XSS)
  filename -> a file : try ../../etc/passwd (path traversal)
  url -> server fetch: try an internal address (SSRF)`,
        output: `For EACH parameter: hypothesise where it flows, send a small safe
probe that would reveal a flaw there, read the response. Coverage
(every parameter) + the right probe per parameter = finds bugs.
The rest of this track fills in each vuln class.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the systematic way to decide what vulnerability to test for on a given parameter?',
        options: [
          'Spray every known payload at every parameter at random',
          'Form a hypothesis about where the parameter’s value flows (into a database query, into the HTML page, into a command, into a file path, into a server-side request) and send a small, safe probe that would reveal a flaw in that specific sink, then read the response',
          'Only test parameters that appear in the URL bar',
          'Assume no parameter is vulnerable unless a scanner flags it',
        ],
        answer: 1,
        explain:
          'Every parameter — in the URL, body, headers, path, or an upload — is a place input enters the app, and the vulnerability class depends entirely on where that input flows (its "sink"). So the systematic method is: for each parameter, hypothesise where the value goes and whether it is trusted there — into a DB query (SQL injection), reflected into HTML (XSS), into a system command (command injection), into a file path (path traversal), into a request the server makes (SSRF) — then send a small, safe probe that would indicate a flaw in that specific sink and read the response. This targeted, coverage-driven approach (test every parameter with the right probe) finds far more than blind payload-spraying, ignoring hidden parameters, or waiting for a scanner. The parameter’s name and behaviour hint at where it flows.',
        hint: 'The vuln class depends on where the value ends up — so what should you reason about before choosing a probe?',
      },
    },

    {
      id: 'rweb-b-09',
      title: 'The OWASP Top 10 as a map',
      read: `The **OWASP Top 10** is the industry-standard list of the most critical web application security risks, published by the Open Worldwide Application Security Project. For a learner it is the perfect **map** of what to look for — this track's amateur and intermediate levels essentially walk through it.

## What it is

Periodically updated from real-world data, the Top 10 names the categories of vulnerability that matter most. The exact wording shifts between editions, but the recurring themes are what you must know:

- **Broken Access Control** — users doing things they should not be allowed to (viewing others' data, reaching admin functions). Consistently the number-one risk.
- **Cryptographic Failures** — sensitive data exposed through weak or missing encryption.
- **Injection** — untrusted input interpreted as code/commands: SQL injection, command injection, and (in modern lists) XSS.
- **Insecure Design** — flaws in how the app was designed, not just coded.
- **Security Misconfiguration** — insecure defaults, verbose errors, exposed panels, missing hardening.
- **Vulnerable and Outdated Components** — using libraries/frameworks with known flaws.
- **Identification and Authentication Failures** — weak login, session, or credential handling.
- **Software and Data Integrity Failures** — including insecure deserialization and untrusted update/CI paths.
- **Security Logging and Monitoring Failures** — not detecting attacks.
- **Server-Side Request Forgery (SSRF)** — making the server issue attacker-chosen requests.

## Why it is the right frame

It connects directly to the data-flow thinking: injection is "input flows into an interpreter," access control is "the app doesn't check who you are," SSRF is "input flows into a request the server makes." The Top 10 organises the *specific things that go wrong* into a checklist you can systematically test an app against.

## How to use it

Treat it as coverage: for each category, ask "does this app have this class of flaw?" and test accordingly. It is not exhaustive (real apps have flaws outside it), but it captures the highest-impact, most common issues — exactly where a learner should start. The rest of this track teaches how to find and prove each one. In the lab, take your mapped app and, category by category, note where each Top 10 risk *could* apply given the functionality you found.`,
      sample: {
        lang: 'text',
        caption: 'The OWASP Top 10 as a testing checklist',
        code: `A01 Broken Access Control    <- #1: users doing what they shouldn't
A02 Cryptographic Failures   sensitive data poorly protected
A03 Injection                SQLi, command inj, XSS (input -> interpreter)
A04 Insecure Design          design-level flaws
A05 Security Misconfiguration insecure defaults, exposed panels
A06 Vulnerable Components     known-vuln libraries
A07 Auth Failures            weak login/session/credentials
A08 Integrity Failures        insecure deserialization, CI/CD
A09 Logging/Monitoring Fail   attacks not detected
A10 SSRF                      server makes attacker-chosen requests`,
        output: `The Top 10 = a MAP of the highest-impact, most common web risks.
It fits the data-flow frame (injection = input -> interpreter;
SSRF = input -> server's request). Use it as coverage: for each
category, "does this app have it?" Not exhaustive, but the start.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How should a learner best use the OWASP Top 10?',
        options: [
          'As a complete, exhaustive list of every possible web vulnerability',
          'As a map/checklist of the highest-impact, most common risk categories — testing an app against each one for coverage — while understanding it is not exhaustive and real apps can have flaws outside it',
          'As a ranking of which programming languages are insecure',
          'As a list of tools to install',
        ],
        answer: 1,
        explain:
          'The OWASP Top 10 is the industry-standard list of the most critical web application security risk categories, compiled from real-world data. Its value to a learner is as a map and coverage checklist: for each category — broken access control, injection, SSRF, authentication failures, misconfiguration, and so on — you ask "does this app have this class of flaw?" and test accordingly. It aligns naturally with data-flow thinking (injection is input flowing into an interpreter; SSRF is input flowing into a request the server makes). But it is deliberately not exhaustive — it captures the highest-impact, most common issues, and real applications have vulnerabilities outside it — so it is where you start, not the whole of web security. It is not a language ranking or a tool list.',
        hint: 'Is it meant to be every vulnerability ever, or the most important categories to check an app against?',
      },
    },

    {
      id: 'rweb-b-10',
      title: 'Your first vulnerability: reflected input',
      read: `Time to find your first real flaw. The simplest to understand is **reflected input**: when the app takes something from your request and puts it, unescaped, straight into the page it returns. This is the seed of **cross-site scripting (XSS)**, which amateur explores fully.

## Spotting reflection

Many pages echo your input back: a search page shows "results for **<your term>**", an error says "**<your input>** not found", a greeting shows "Welcome, **<your name>**". Whenever your input appears in the response, the app is *reflecting* it. The security question is: **is it escaped, or placed raw into the HTML?**

## Why raw reflection is dangerous

HTML is code. If the app puts your input into the page *without escaping* it, then input that *looks like HTML* becomes *part of the page's HTML*. Send \`<b>hi</b>\` as a search term; if the response shows a **bold** "hi" rather than the literal text \`<b>hi</b>\`, the app rendered your input as HTML — it did not escape it. That means you can inject HTML. And if you can inject HTML, you can inject \`<script>\`, which is JavaScript that runs in the victim's browser: that is XSS.

## A safe proof

You do not need a malicious payload to prove it. A harmless probe like \`<b>test</b>\` (does it render bold?) or \`<i>x</i>\` demonstrates the app renders your HTML. To confirm script execution in your own lab, the classic \`<script>alert(1)</script>\` pops a harmless dialog — proof that injected JavaScript runs. On a real engagement you use the least-intrusive proof that demonstrates the issue, never a harmful payload.

## The fix (the mirror)

The vulnerability is **failure to escape output**. The fix is to **escape/encode user input when placing it into HTML** (so \`<\` becomes \`&lt;\` and is shown as text, not interpreted as a tag), plus a Content Security Policy as defence in depth. "Reflected input rendered as HTML" → "output encoding is missing" is the finding.

## The pattern to carry forward

This is your first taste of the master pattern: **untrusted input reaching a place where it is interpreted, because it was not properly handled.** XSS (into HTML), SQL injection (into a query), command injection (into a shell) are all this same shape. You just found and understood it in its simplest form. In the lab, find a reflective input in DVWA/Juice Shop, prove HTML rendering with \`<b>test</b>\`, then confirm XSS with a harmless \`alert(1)\`.`,
      sample: {
        lang: 'html',
        caption: 'Reflected input: escaped (safe) vs raw (vulnerable)',
        code: `<!-- You send:  ?search=<b>test</b> -->

<!-- SAFE app (escapes output): shows the literal text -->
<p>Results for &lt;b&gt;test&lt;/b&gt;</p>

<!-- VULNERABLE app (raw output): your HTML becomes the page -->
<p>Results for <b>test</b></p>
<!-- so <script>alert(1)</script> would RUN = XSS -->`,
        output: `If <b>test</b> renders BOLD, your input became HTML -> the app
did not escape output -> you can inject <script> = XSS.
Prove with the least-intrusive payload (<b>test</b>, then a
harmless alert(1) in your lab). Fix: ESCAPE output (+ CSP).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You send `<b>test</b>` as a search term and the results page shows a bold "test" rather than the literal text. What does this prove, and what is the underlying fix?',
        options: [
          'It proves the search works correctly; no fix is needed',
          'It proves the app placed your input into the HTML without escaping it — so injected markup (including <script>) is interpreted as part of the page, which is cross-site scripting — and the fix is to escape/encode user input when outputting it into HTML (plus CSP as defence in depth)',
          'It proves the database is vulnerable to SQL injection',
          'It proves the server crashed',
        ],
        answer: 1,
        explain:
          'When your input `<b>test</b>` renders as bold rather than being shown as literal characters, the application inserted it into the page’s HTML without escaping it — the browser interpreted your markup as part of the page. That is exactly the condition for cross-site scripting: if `<b>` is interpreted, so is `<script>`, meaning you can inject JavaScript that runs in a victim’s browser (proven harmlessly in your own lab with alert(1)). The root cause is failure to escape output, and the fix is to HTML-encode user input wherever it is placed into a page (so `<` becomes `&lt;` and is displayed as text), with a Content Security Policy as defence in depth. It is the simplest instance of the master pattern — untrusted input reaching a place where it is interpreted because it was not properly handled.',
        hint: 'If your `<b>` tag is interpreted rather than shown as text, what else (like `<script>`) would also be interpreted?',
      },
    },

    {
      id: 'rweb-b-11',
      title: 'Reporting a web finding',
      read: `Finding a flaw is half the job; **communicating it** so it gets fixed is the other half. A web finding, like any pentest finding, must be accurate, clear, reproducible, and prioritised — and handled responsibly.

## What a good web finding contains

- **Title & category** — clear and specific (e.g. "Reflected XSS in the search parameter"), mapped to a class (OWASP Top 10) where useful.
- **Severity** — rated by real risk (impact × likelihood), using a consistent scheme (CVSS is common). Reflected XSS behind authentication is not the same as stored XSS hitting every user.
- **Description** — what the flaw is and *why it matters* for this app (what an attacker could actually do).
- **Reproduction steps** — exact, repeatable: the URL, the request, the payload, the observed result. A developer must be able to reproduce it from your write-up alone. Include the raw request (from your proxy) and the response evidence.
- **Impact** — the concrete consequence (account takeover? data theft? defacement?).
- **Remediation** — the specific fix (for XSS: output encoding + CSP), actionable by a developer.

## Verify before you claim

As in every track: **a finding you report is a finding you confirmed.** Web scanners produce false positives (a "reflected XSS" that is actually escaped in context, a "SQLi" that is a coincidence). Reproduce it yourself, ideally end to end, before writing it up. Over-claiming destroys trust and wastes developer time.

## Handle impact responsibly

Prove the vulnerability with the **least-intrusive** demonstration. You do not need to actually steal every user's data to prove stored XSS — a controlled proof is enough. Never exfiltrate real user data, deface a live app, or run destructive payloads to "prove" a point. If you encounter real sensitive data, handle it per scope and report the exposure rather than hoarding it.

## Prioritise

Order findings by real risk so the owner fixes the dangerous things first. A critical injection outranks a missing security header. A report that buries a critical issue among trivia has failed.

## Why this is the professional skill

Anyone can send \`<script>alert(1)</script>\`; the value is a report a developer can act on — accurate, reproducible, prioritised, with a clear fix. That is what makes an app actually safer, which is the entire point. In the lab, take the reflected XSS you found and write it up fully: title, severity, exact reproduction, impact, and remediation.`,
      sample: {
        lang: 'text',
        caption: 'A web finding a developer can act on',
        code: `TITLE   : Reflected XSS in 'search' parameter  (OWASP A03: Injection)
SEVERITY: High (unauthenticated; runs in any victim's browser)
DESC    : The 'search' value is reflected into the results page
          without output encoding, so injected HTML/JS executes.
REPRO   :
  1. GET /search?q=<script>alert(1)</script>
  2. Observe the alert fire (script executed).
  (include the raw request + response evidence from the proxy)
IMPACT  : Session theft, actions as the victim, phishing.
FIX     : HTML-encode output; add a Content-Security-Policy.`,
        output: `A finding = title/category + severity + description + EXACT
reproduction + impact + remediation. VERIFY before claiming
(scanners false-positive). Prove with the least-intrusive payload;
never exfiltrate real data. Prioritise by real risk.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What most distinguishes a professional web vulnerability report from simply demonstrating a payload works?',
        options: [
          'Using the most destructive payload possible to maximise impact',
          'A verified, clearly-categorised finding with a severity, exact reproduction steps a developer can follow, the concrete impact, and an actionable fix — proven with the least-intrusive demonstration and never by exfiltrating real user data',
          'Listing every payload you tried, whether or not it worked',
          'Keeping the reproduction steps vague for security reasons',
        ],
        answer: 1,
        explain:
          'Landing a payload is the easy part; the professional value is a report that gets the flaw fixed. That means a verified finding (reproduced yourself, because scanners and quick tests produce false positives), clearly categorised (e.g. OWASP A03) and rated by real risk, with a description of why it matters for this app, exact repeatable reproduction steps (URL, request, payload, observed result, with proxy evidence) a developer can follow, the concrete impact, and a specific, actionable remediation. Crucially, you prove it with the least-intrusive demonstration and never actually steal real user data or run destructive payloads to make the point. Vague steps, destructive proofs, or unverified claims all undermine the report’s purpose, which is to make the application genuinely safer.',
        hint: 'The goal is a fix — what must the report let a developer do, and how should you prove impact without causing harm?',
      },
    },

    {
      id: 'rweb-b-12',
      title: 'Project: map and probe a vulnerable app',
      read: `Bring the beginner skills together on a deliberately vulnerable app you run. This project is the web equivalent of the other tracks' capstones: set up the lab, map the app thoroughly, understand its inputs, find and prove a first vulnerability, and write it up responsibly. Local lab only.

## The brief

Run Juice Shop (or DVWA), route it through your proxy, map its entire attack surface, trace where inputs flow, find at least one real vulnerability (reflected input/XSS is the natural first), prove it with the least-intrusive payload, and produce a professional finding.

## Steps

1. **Set up** — run the vulnerable app locally in Docker; configure Burp/ZAP and install its CA cert; confirm traffic flows through the proxy.
2. **Map** — browse every feature through the proxy; run content discovery (ffuf/gobuster); read the client-side JavaScript for endpoints. Build a list of URLs, parameters, and roles.
3. **Analyse inputs** — for several parameters, hypothesise where each flows (DB? HTML? file? command?).
4. **Find a vulnerability** — test for reflected input/XSS on a parameter that is echoed back; confirm HTML rendering with \`<b>test</b>\`, then script execution with a harmless \`alert(1)\`.
5. **Understand it** — explain *why* it works (input placed into HTML without escaping) and what an attacker could do with it.
6. **Report** — write a complete finding: title/category, severity, exact reproduction (with the raw request), impact, and remediation.

## The standard

You pass when your work shows: a working lab with proxy interception; a thorough map (including at least one unlinked endpoint found via discovery); a correctly-identified vulnerability *proven* with a least-intrusive payload and *explained* at the input-flow level; and a professional, reproducible finding with a real fix. All in your local lab, nothing harmful.

## Where next

Amateur walks the core OWASP Top 10 in depth: XSS (all types), SQL injection (finding and extracting data), command injection, broken access control/IDOR, authentication and session flaws, CSRF, misconfiguration, and file upload — plus using Burp's Repeater and Intruder effectively. Everything there builds on the mapping, input-flow thinking, and proxy skills you just practised.`,
      sample: {
        lang: 'bash',
        caption: 'The beginner project as a sequence (local lab)',
        code: `# 1 set up
docker run --rm -p 3000:3000 bkimminich/juice-shop   # + proxy on

# 2 map
ffuf -u http://localhost:3000/FUZZ -w wordlist.txt   # discovery
#   + browse every feature through the proxy; read the JS

# 4 find & prove a reflected XSS (least-intrusive first)
#   ?q=<b>test</b>   -> renders bold? then  ?q=<script>alert(1)</script>

# 6 write the finding: title/severity/repro/impact/fix`,
        output: `Pass = working lab (proxy intercepting) + thorough map (incl. an
unlinked endpoint found via discovery) + a vuln PROVEN with a
least-intrusive payload and EXPLAINED at the input-flow level +
a professional reproducible finding with a fix. Local lab only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the beginner web project, "map and probe a vulnerable app"?',
        options: [
          'Exploiting the app with the most damaging payload available',
          'A working proxy-intercepted lab, a thorough map (including an unlinked endpoint found via content discovery), a vulnerability proven with a least-intrusive payload and explained at the input-flow level, and a professional, reproducible finding with a real fix — all in the local lab',
          'Finding as many vulnerabilities as possible without writing anything up',
          'Testing a live production website to make it realistic',
        ],
        answer: 1,
        explain:
          'The beginner capstone demonstrates the whole beginner skill set responsibly, not maximum damage. Passing means: a working local lab with your proxy intercepting traffic; a thorough map of the attack surface that includes at least one unlinked endpoint discovered through forced browsing (proving you go beyond clicking links); a correctly-identified vulnerability that you prove with the least-intrusive payload (e.g. `<b>test</b>` then a harmless alert) and explain at the input-flow level (input placed into HTML without escaping); and a professional, reproducible finding with severity, exact steps, impact, and a concrete fix. It is all done in the local lab with nothing harmful — never against a live production site, and never by hoarding vulns without the write-up that actually makes an app safer.',
        hint: 'The goal is to demonstrate the full responsible workflow — lab, map, prove, explain, report — not to cause maximum damage.',
      },
    },
  ],
}

export default level
