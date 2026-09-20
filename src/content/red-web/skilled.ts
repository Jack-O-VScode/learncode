import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Modern web app attacks and chaining',
  summary:
    'The cutting edge of web exploitation: server-side template injection, advanced SSRF and deserialization to remote code execution, race conditions, HTTP request smuggling, web cache poisoning, OAuth/SAML attacks, client-side attacks (prototype pollution, postMessage, DOM clobbering), the pitfalls of modern frameworks, and WAF evasion — culminating in a full web-application penetration test. Each technique is paired with the defence that closes it, practised only on deliberately vulnerable apps you run or targets you are authorized to test.',
  outcomes: [
    'Exploit server-side template injection to reach code execution',
    'Chain advanced SSRF and deserialization into RCE',
    'Find and exploit race conditions and HTTP request smuggling',
    'Attack OAuth/SSO/SAML flows and web caches',
    'Exploit modern client-side flaws (prototype pollution, postMessage)',
    'Evade WAFs, understand their limits, and run a full web pentest',
  ],
  steps: [
    {
      id: 'rweb-s-01',
      title: 'Server-side template injection',
      read: `**SSTI** (server-side template injection) occurs when user input is embedded into a **server-side template** in a way that lets you inject *template syntax* — which the engine then executes on the server. It frequently leads to remote code execution.

## Where it comes from

Apps use template engines (Jinja2/Python, Twig/PHP, Freemarker/Velocity/Java, Handlebars/Node, ERB/Ruby) to build pages by mixing static markup with dynamic values. The *safe* way passes user data as a **variable** into a fixed template. The *dangerous* way concatenates user input **into the template string itself** — so your input is parsed as template code, not data. Classic cause: \`render("Hello " + name)\` instead of \`render("Hello {{name}}", name=name)\`.

## Detecting SSTI

Send a template expression and see if it's **evaluated**:

- \`{{7*7}}\` — if the response shows \`49\`, the engine evaluated your expression: SSTI. (\`\${7*7}\`, \`<%= 7*7 %>\`, \`#{7*7}\` for other engines.)
- Then **fingerprint the engine** — different engines evaluate different probes (\`{{7*'7'}}\` gives \`7777777\` in Jinja2 but \`49\` in Twig), telling you which engine and thus which exploitation path.

## From evaluation to RCE

Once you can evaluate template code, you climb from the template's objects to language features that run commands. In Jinja2, for example, you traverse Python's object model (via an evaluated object's class hierarchy) to reach modules that execute OS commands. Each engine has known escalation paths from "expression evaluation" to "arbitrary code". The details differ per engine, but the pattern is: prove evaluation → fingerprint → use the engine-specific chain to RCE.

## Why it's high severity

SSTI is server-side code execution — among the most severe outcomes. It's also easy to introduce (any time input touches template construction) and appears in unexpected places: email templates, generated documents, and any "customisable" text feature.

## The fix (the mirror)

- **Never concatenate user input into templates.** Pass user data only as *variables/context*, never as part of the template string. This is the definitive fix and mirrors the whole injection family (separate code from data).
- Use a **sandboxed** template engine/config where available, and avoid letting users supply templates at all; if unavoidable, use a logic-less engine with strict sandboxing.

In the lab, confirm SSTI with \`{{7*7}}\`, fingerprint the engine, and (on a purpose-built target) follow the engine's chain to command execution.`,
      sample: {
        lang: 'text',
        caption: 'Detecting and fingerprinting SSTI',
        code: `SAFE:      render("Hello {{name}}", name=userInput)   # input = data
VULNERABLE: render("Hello " + userInput)              # input = template!

DETECT (does the engine evaluate your expression?):
  {{7*7}}   -> 49    = evaluated  (Jinja2/Twig)
  \${7*7}   -> 49    (Freemarker/Velocity/JSP-EL)
  <%= 7*7 %> -> 49   (ERB)

FINGERPRINT (same probe, engine-specific result):
  {{7*'7'}} -> 7777777 (Jinja2)   vs   49 (Twig)
  -> then use the engine's known chain: eval -> RCE`,
        output: `SSTI = user input parsed as TEMPLATE CODE on the server (from
concatenating input into the template) -> expression evaluation
-> engine-specific chain -> RCE (very high severity). Fix: pass
user data ONLY as variables, never into the template string;
sandbox; don't let users supply templates.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You submit `{{7*7}}` in an input and the response contains `49`. What have you found, and what is the root cause?',
        options: [
          'A calculator feature working as intended; no issue',
          'Server-side template injection: your input was embedded into a server-side template and evaluated as template code (because user input was concatenated into the template string rather than passed as a variable), which typically escalates to remote code execution',
          'Cross-site scripting, because the math ran in the browser',
          'A SQL injection, because a query computed 49',
        ],
        answer: 1,
        explain:
          'When `{{7*7}}` returns `49`, the server’s template engine evaluated your input as a template expression — the signature of server-side template injection. The root cause is that user input was concatenated into the template string itself (e.g. render("Hello " + name)) instead of being passed as a variable/context value (render("Hello {{name}}", name=name)), so your input is parsed as template code rather than data. From confirmed evaluation you fingerprint the engine (e.g. `{{7*\'7\'}}` → 7777777 in Jinja2 vs 49 in Twig) and follow that engine’s known escalation path to arbitrary command execution, making SSTI a high-severity, server-side RCE class. The evaluation happens on the server (not the browser, so not XSS) and involves the template engine, not a database. The definitive fix is to never concatenate user input into templates — pass it only as variables — plus sandboxing and not letting users supply templates.',
        hint: 'The expression was evaluated on the server by a template engine — what does that make it, and what code/data mistake caused it?',
      },
    },

    {
      id: 'rweb-s-02',
      title: 'Advanced SSRF to RCE',
      read: `Intermediate SSRF reached internal resources. Skilled SSRF is about **defeating defences** and **chaining to critical impact** — often full remote code execution or cloud takeover.

## Bypassing SSRF filters

Apps try to block internal addresses; testers bypass naive filters:

- **Alternate IP representations** — \`127.0.0.1\` as \`127.1\`, \`0177.0.0.1\` (octal), \`2130706433\` (decimal), \`0x7f000001\` (hex), or IPv6 \`[::1]\`/\`[::ffff:127.0.0.1]\`.
- **DNS tricks** — a domain you control that resolves to an internal IP; **DNS rebinding** (the name resolves to an allowed IP during the check, then to an internal IP when actually fetched — defeating time-of-check/time-of-use validation).
- **Redirects** — the app validates your URL, which returns a redirect to an internal address the fetcher follows (validate *after* redirects, not just before).
- **Encoding & parsing quirks** — \`@\`, \`#\`, and URL-parser confusion where the validator and the fetcher disagree on the host (parser differentials).
- **Allowed-domain abuse** — an open redirect on an allowlisted domain, or a permitted domain with an SSRF of its own.

## Chaining SSRF to serious impact

- **Cloud metadata → credentials → cloud takeover** — the canonical chain (\`169.254.169.254\` → IAM creds → the account). Enforce IMDSv2 to blunt it.
- **SSRF → internal service → RCE** — reach an internal service with a known exploit or an admin API, or an internal app vulnerable to something else, turning "read internal" into "run code".
- **Protocol smuggling via gopher** — \`gopher://\` lets you send *arbitrary bytes* to a TCP service, so SSRF can craft raw requests to internal Redis, databases, or SMTP — sometimes achieving RCE (e.g. writing a cron/webshell via Redis).
- **Internal port scanning** and pivoting deeper.

## The pattern

Advanced SSRF thinking is: (1) confirm and get past filters, (2) enumerate what the server can reach, (3) find the internal target whose compromise is critical, (4) chain to it. The server becomes your foothold inside the perimeter.

## The fix (the mirror)

- **Allowlist** destinations (scheme + host), validate **after** redirect resolution, resolve DNS and pin the IP to defeat rebinding, and **block internal ranges and the metadata IP** at the network layer too (defence in depth).
- **Disable unused URL schemes** (no \`gopher\`/\`file\`), harden the metadata service (IMDSv2), and segment so the app server can't freely reach internal admin services.

In the lab, bypass a naive SSRF filter with an alternate IP encoding, and chain SSRF to reach an internal-only service.`,
      sample: {
        lang: 'text',
        caption: 'SSRF filter bypasses and RCE chains',
        code: `BYPASS a naive "block 127.0.0.1 / 169.254.x" filter:
  127.1   0177.0.0.1   2130706433   0x7f000001   [::1]
  attacker-domain -> resolves to internal IP (DNS rebinding)
  allowed-url -> 302 redirect -> internal (validate AFTER redirects)
  http://allowed@169.254.169.254/   (parser confusion)

CHAIN to critical:
  -> 169.254.169.254 -> IAM creds -> cloud account
  -> gopher://internal-redis -> write webshell/cron -> RCE
  -> internal admin API / vulnerable service -> RCE`,
        output: `Advanced SSRF = defeat filters (IP encodings, DNS rebinding,
redirects, parser confusion) + CHAIN (metadata->creds->cloud;
gopher->redis->RCE; internal service->RCE). The server = your
foothold inside the perimeter. Fix: allowlist, validate AFTER
redirects, pin DNS, block internal+metadata at network layer,
disable gopher/file, IMDSv2, segment.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An SSRF filter blocks the string "127.0.0.1", but you reach localhost anyway using "2130706433". Why does this work, and what defence is more robust than string blocklisting?',
        options: [
          'It works by encrypting the address; the fix is TLS',
          '2130706433 is the decimal form of 127.0.0.1 — one of many equivalent representations (octal, hex, IPv6-mapped, DNS-based) that a string blocklist misses but the network stack still resolves to localhost — so robust defence uses an allowlist of permitted destinations, resolves and pins the IP (defeating rebinding), validates after redirects, and blocks internal ranges at the network layer',
          'It works only against IPv6-only servers',
          'It works because the filter is case-sensitive',
        ],
        answer: 1,
        explain:
          'IP addresses have many equivalent textual forms: 127.0.0.1 can be written as 127.1, in octal (0177.0.0.1), in hexadecimal (0x7f000001), as the single decimal integer 2130706433, or via IPv6 forms like [::1] and [::ffff:127.0.0.1]. A blocklist matching the literal string "127.0.0.1" fails to catch these, yet the network stack still resolves them all to loopback — so the SSRF succeeds. This is why blocklisting strings is fragile (also defeated by DNS rebinding, redirects to internal hosts, and URL-parser confusion). Robust defence flips to allowlisting permitted schemes and hosts, resolving the destination and pinning the IP to defeat time-of-check/time-of-use DNS rebinding, re-validating after any redirects, and additionally blocking internal ranges and the metadata IP at the network layer (defence in depth), plus disabling risky schemes and hardening the metadata service. It has nothing to do with encryption or case.',
        hint: 'What number system is 2130706433, and does the OS still treat it as 127.0.0.1? What kind of list avoids playing whack-a-mole with encodings?',
      },
    },

    {
      id: 'rweb-s-03',
      title: 'Deserialization and gadget chains',
      read: `Intermediate introduced insecure deserialization; skilled goes to the mechanism that makes it RCE — **gadget chains** — and the craft of exploiting it in real applications.

## The gadget-chain idea

Deserialization can instantiate objects and trigger their methods. A **gadget** is a class already present in the app or its libraries whose methods do something useful to an attacker when invoked during deserialization (a "magic method" that runs on unserialize, a method that reads a file, executes a command, or makes a call). A **gadget chain** strings gadgets together: the deserialization triggers gadget A, which invokes gadget B, ... ending in a **sink** that executes code. You don't inject your own code — you *repurpose the code already there*.

## Building or reusing chains

- **Known chains** — for popular libraries, public chains exist. **ysoserial** (Java) and **phpggc** (PHP) generate payloads for dozens of library "gadget" combinations (e.g. Commons-Collections in Java). If the app uses a vulnerable library version, a ready-made chain often works.
- **Custom chains** — when no public chain fits, researchers analyse the app's own classes to build a bespoke chain — deep work, but how new chains are found.
- **The dependency angle** — the vulnerable gadgets often live in *dependencies*, not the app's own code, which is why patching libraries matters and why a scan of dependencies (SCA) is part of defence.

## Language-specific notes

- **Java** — \`ObjectInputStream.readObject\` on untrusted data; ysoserial; look for serialized blobs (base64 \`rO0AB\`).
- **PHP** — \`unserialize()\`; magic methods \`__wakeup\`/\`__destruct\`; phpggc; \`O:\` format. Also **POP chains** (property-oriented programming).
- **Python** — \`pickle\` (essentially arbitrary code by design — never unpickle untrusted data), YAML \`load\` (unsafe), etc.
- **.NET** — \`BinaryFormatter\` and friends; ysoserial.net.

## Exploitation reality

You find a serialized blob under your control (cookie, parameter, cache, message queue), confirm the app deserializes it unsafely, then deliver a gadget-chain payload for the app's stack. Success is typically **RCE** — critical. It's subtle to find (recognise the formats, test tampering) but devastating when present.

## The fix (the mirror)

- **Don't deserialize untrusted data.** Prefer data-only formats (JSON) with strict schemas; if native serialization is unavoidable, use **integrity signing** so tampered blobs are rejected, **allowlist** deserializable classes, and **patch dependencies** (where gadgets live).

In the lab, use ysoserial/phpggc against a purpose-built target to see a gadget chain reach RCE, and inspect how a class allowlist would block it.`,
      sample: {
        lang: 'text',
        caption: 'Gadget chains: repurposing existing code to RCE',
        code: `attacker-controlled serialized blob (cookie/param/cache)
        |
   app deserializes it unsafely
        |
   triggers gadget A (magic method on unserialize)
        -> invokes gadget B -> ... -> SINK (exec/file/call)
        = REMOTE CODE EXECUTION, using code ALREADY in the app/libs

TOOLS: ysoserial (Java), phpggc (PHP), ysoserial.net (.NET)
       - ready-made chains for vulnerable LIBRARY versions.`,
        output: `A gadget chain strings together classes already present (often in
DEPENDENCIES) so deserialization reaches a code-exec sink - you
repurpose existing code, not inject your own. Result: RCE. Fix:
don't deserialize untrusted data; JSON+schema; SIGN blobs; class
ALLOWLIST; PATCH libraries (where gadgets live).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a deserialization exploit, what is a "gadget chain"?',
        options: [
          'A sequence of the attacker’s own uploaded scripts',
          'A sequence of classes/methods already present in the application or its libraries that, when triggered during deserialization, invoke one another and end in a code-execution sink — so the attacker repurposes existing code (often in dependencies) rather than injecting new code',
          'A hardware device chained to the server',
          'A list of passwords tried in sequence',
        ],
        answer: 1,
        explain:
          'A gadget chain is the mechanism that turns insecure deserialization into remote code execution. A "gadget" is a class already available in the app or (more often) its libraries whose methods do something useful to an attacker when invoked during object reconstruction — for example a magic method that runs on unserialize, or a method that executes a command or reads a file. The chain links such gadgets so that deserialization triggers gadget A, which invokes gadget B, and so on, ending at a sink that executes code. Crucially, the attacker does not upload their own code; they craft a serialized payload that repurposes code that is already present. Tools like ysoserial (Java) and phpggc (PHP) generate these chains for known-vulnerable library versions — which is why the gadgets typically live in dependencies and why patching libraries, signing serialized data, allowlisting deserializable classes, and above all not deserializing untrusted data are the defences.',
        hint: 'Where does the code that runs come from — the attacker’s upload, or classes already in the app and its libraries?',
      },
    },

    {
      id: 'rweb-s-04',
      title: 'Race conditions',
      read: `**Race conditions** exploit the tiny window between an app **checking** a condition and **acting** on it. Send many requests simultaneously, and the app may process them as if each were the only one — breaking limits and invariants. They're a distinct, powerful, often-overlooked class.

## The core idea (TOCTOU)

Many operations assume "check, then act" happens atomically: check the balance, then deduct; check the coupon is unused, then redeem; check the limit, then increment. If checking and acting aren't a single atomic step, two requests arriving *at the same time* can both pass the check *before* either acts — so both act. This is a **time-of-check to time-of-use (TOCTOU)** flaw.

## Classic exploits

- **Redeeming once, spending twice** — submit a gift-card/voucher/coupon redemption many times concurrently; several succeed before the "used" flag is set. Same for one-time discount codes.
- **Overdrawing a balance** — withdraw/transfer the same funds in parallel so total withdrawals exceed the balance (each request saw the pre-deduction balance).
- **Bypassing limits** — "one per customer", rate limits, or stock counts exceeded by concurrent requests.
- **Account/state confusion** — concurrent requests creating duplicate accounts, or racing an approval step.

## Exploiting them

The technique is **concurrency**: fire many identical requests as close to simultaneously as possible. Modern tooling makes this precise — Burp's Repeater can send a **group of requests in parallel** (and the "single-packet attack" technique aligns them to nullify network jitter, making races that need microsecond timing reliably exploitable). You send N requests, then check whether more succeeded than should be possible.

## Why they're missed

Functional testing sends one request at a time, so the app "works." The flaw only appears under **concurrency**, which normal testing and scanners don't exercise. Like business logic flaws, races require thinking about the app's assumptions — here, the assumption that operations are serialized.

## The fix (the mirror)

- **Make check-and-act atomic** — use database transactions with proper isolation, atomic operations (\`UPDATE ... WHERE balance >= amount\`), row locking, or unique constraints so concurrent operations can't both succeed.
- Enforce idempotency for one-time actions (a used token constraint the DB enforces atomically), and design assuming concurrent access.

In the lab, exploit a race condition (e.g. redeem a single-use code multiple times) using Burp's parallel request group, and note the atomic fix.`,
      sample: {
        lang: 'text',
        caption: 'A race condition: both requests pass the check before either acts',
        code: `INTENDED (atomic):        RACE (check and act not atomic):
  check code unused          req A: check unused -> OK
  mark used                  req B: check unused -> OK  (before A marks!)
  apply discount             req A: mark used, apply
                             req B: mark used, apply  <- applied TWICE

EXPLOIT: fire N identical requests SIMULTANEOUSLY
  (Burp parallel request group / single-packet attack)
  -> more succeed than should be possible.`,
        output: `Race condition (TOCTOU) = the gap between CHECK and ACT; concurrent
requests all pass the check before any acts -> redeem-once-spend-
twice, overdraw, bypass limits. Missed because normal testing is
one-at-a-time. Fix: make check+act ATOMIC (transactions/isolation,
UPDATE...WHERE, locks, unique constraints); design for concurrency.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can sending many identical requests simultaneously let an attacker redeem a single-use coupon multiple times, and what is the fix?',
        options: [
          'Because the coupon code is guessable; fix with longer codes',
          'Because there is a window between checking the coupon is unused and marking it used (TOCTOU) — concurrent requests all pass the "unused" check before any marks it used, so several redeem — and the fix is to make check-and-act atomic (transactions with proper isolation, atomic UPDATE...WHERE, locking, or a DB-enforced unique constraint)',
          'Because the requests overload the server into failing open',
          'Because HTTPS allows request duplication',
        ],
        answer: 1,
        explain:
          'This is a race condition, specifically a time-of-check to time-of-use (TOCTOU) flaw. The redemption logic assumes "check the coupon is unused, then mark it used" happens as one indivisible step, but if those are separate operations, several requests arriving at nearly the same instant can all read the coupon as still unused before any of them writes the "used" flag — so each proceeds to apply the discount, redeeming a single-use code multiple times. It is exploited by firing many identical requests concurrently (Burp’s parallel request group / single-packet attack aligns them precisely). Normal one-at-a-time testing never reveals it. The fix is to eliminate the window by making check-and-act atomic: database transactions with appropriate isolation, atomic conditional updates (UPDATE ... WHERE unused), row locking, or a unique constraint the database enforces — so two concurrent redemptions cannot both succeed. It is unrelated to code length, server overload, or HTTPS.',
        hint: 'What two steps have a gap between them, and what makes several requests all pass the first step before any completes the second?',
      },
    },

    {
      id: 'rweb-s-05',
      title: 'HTTP request smuggling',
      read: `**HTTP request smuggling** exploits disagreements between two servers (a front-end proxy/load-balancer and a back-end server) about **where one request ends and the next begins**. It's an advanced, high-impact class that can poison other users' requests.

## The setup

Modern sites chain servers: a **front-end** (CDN, load balancer, reverse proxy) forwards requests to a **back-end** over reused connections. Both must agree on each request's length. HTTP offers two ways to state it: the **Content-Length** header and **Transfer-Encoding: chunked**. If the front-end and back-end **parse these differently** (one honours Content-Length, the other Transfer-Encoding, or they handle malformed/duplicated headers differently), you can craft a request they disagree about.

## The attack

You send a request where the front-end sees one request but the back-end sees *one and a bit* — the "bit" being the **start of a smuggled request** that gets **prepended to the next user's request** on the reused connection. Classic variants are named by which header each server trusts: **CL.TE**, **TE.CL**, **TE.TE**. The smuggled prefix then affects whoever's request comes next.

## Impact

- **Poisoning other users' requests** — prepend a path or headers to the next visitor's request, redirecting them, capturing their request (and credentials/session), or serving them a malicious response.
- **Bypassing front-end security controls** — smuggle a request past the front-end's access controls or WAF straight to the back-end (reach a blocked \`/admin\`).
- **Cache poisoning and credential capture** — combine with caching to persist an attack, or capture other users' sensitive requests.

Because it affects *other users* and *bypasses perimeter controls*, smuggling is high severity.

## Detecting it

Carefully craft requests with conflicting/duplicated length indicators and observe **timing** and **response differences** (a delay from the back-end waiting for bytes that never come is a classic CL.TE/TE.CL signal). Burp's request-smuggling tooling automates detection and exploitation — but understand the CL/TE disagreement to interpret it.

## The fix (the mirror)

- **Make front-end and back-end parse identically** — ideally use **HTTP/2 end-to-end** (its framing removes the CL/TE ambiguity), or normalise/reject ambiguous requests at the front-end (reject messages with both CL and TE, or with malformed values).
- Don't reuse back-end connections across users where avoidable; keep servers patched (smuggling bugs are found in specific implementations).

In the lab, use Burp's smuggling scanner against a purpose-built target (e.g. PortSwigger's labs) to confirm a CL.TE desync and understand the desync mechanism.`,
      sample: {
        lang: 'text',
        caption: 'Request smuggling: front-end and back-end disagree on length',
        code: `front-end trusts Content-Length; back-end trusts Transfer-Encoding
(a CL.TE desync). You send ONE request that the back-end reads as
one-and-a-bit:

  POST / HTTP/1.1
  Content-Length: 6
  Transfer-Encoding: chunked

  0

  GPREFIX...        <- back-end treats this as the START of the
                       NEXT request -> prepended to the next USER's
                       request on the reused connection.`,
        output: `Request smuggling = front-end/back-end disagree on where a request
ends (CL vs TE parsing). Variants: CL.TE / TE.CL / TE.TE. Impact:
poison OTHER users' requests (steal sessions), bypass front-end
WAF/access controls, cache poisoning. Detect via timing/response
diffs. Fix: identical parsing / HTTP-2 e2e / reject ambiguous
(both CL+TE) requests; patch.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the fundamental cause of HTTP request smuggling, and why is its impact considered high severity?',
        options: [
          'A weak TLS cipher between client and server; it only affects the attacker',
          'The front-end and back-end servers disagree on where one request ends and the next begins (parsing Content-Length vs Transfer-Encoding differently), letting an attacker smuggle a prefix onto the next user’s request on a reused connection — high severity because it poisons OTHER users’ requests and can bypass front-end security controls',
          'The server runs out of memory processing large requests',
          'Cookies are missing the Secure flag',
        ],
        answer: 1,
        explain:
          'Request smuggling arises when a chain of servers (a front-end proxy/CDN and a back-end) parse the boundaries of HTTP requests differently — typically because one honours the Content-Length header and the other Transfer-Encoding: chunked (or they handle duplicated/malformed length indicators differently). By crafting a request they disagree about, the attacker makes the back-end interpret part of it as the beginning of the next request on a reused, shared connection. That smuggled prefix then attaches to whoever’s request comes next, which is why it is high severity: it can redirect or capture other users’ requests (stealing their sessions/credentials), serve them malicious responses, poison caches, and bypass front-end access controls or WAFs to reach otherwise-blocked back-end paths. The named variants (CL.TE, TE.CL, TE.TE) describe which server trusts which header. The fixes make parsing consistent — ideally HTTP/2 end-to-end, or rejecting/normalising ambiguous requests at the front-end — and patching. It is not a TLS, memory, or cookie-flag issue.',
        hint: 'Two servers, one connection reused across users — what must they agree on, and who gets hurt when they do not?',
      },
    },

    {
      id: 'rweb-s-06',
      title: 'Web cache poisoning',
      read: `**Web cache poisoning** turns a performance feature — caching — into an attack that serves *your* malicious content to *other users*. It's subtle, high-impact, and a favourite of advanced testers.

## How caching works (and the flaw)

To reduce load, caches (CDNs, reverse proxies) store a response and serve it to *everyone* who requests the same resource. The cache decides "same resource" using a **cache key** — typically the URL (path + some query params) and maybe a few headers. Anything *not* in the cache key is ignored when matching but may still *affect the response*. That gap is the vulnerability: an **unkeyed input** that changes the response, cached under a key many users will hit.

## The attack

1. **Find an unkeyed input that influences the response** — e.g. a header like \`X-Forwarded-Host\` that the app reflects into a link or script src, or an \`X-Forwarded-Scheme\`, or a parameter excluded from the key. These are attacker-controllable but ignored by the cache key.
2. **Craft a malicious response** — send a request with that unkeyed input set to inject content (e.g. \`X-Forwarded-Host: evil.com\` that gets reflected into a \`<script src>\`, giving XSS; or a redirect to your site).
3. **Get it cached** — the cache stores your poisoned response under the normal key.
4. **Everyone is served the poison** — subsequent users requesting that URL get your malicious response, with no interaction. One request → mass impact.

## Cache deception (the sibling)

**Web cache deception** is the inverse: trick the cache into storing a *sensitive, personalised* page (someone's account page) under a key that looks like a static, cacheable resource (\`/account/foo.css\`), so the *attacker* can then retrieve another user's cached private data. It relies on the cache caching by extension/path while the app serves dynamic content.

## Why it's high impact

Cache poisoning weaponises the cache's fan-out: a single crafted request affects *every* user of a popular cached page, turning even a reflected issue into a mass, persistent attack. It bypasses the "victim must click a link" limitation of reflected XSS.

## Detecting it

Look for unkeyed inputs that reflect into responses (test headers like \`X-Forwarded-Host\`), observe cache behaviour (\`Cache-Control\`, \`Age\`, \`X-Cache: hit/miss\` headers), and confirm a poisoned response is served back on a clean request. Do this carefully in a lab — poisoning a shared cache affects real users, so on live targets it requires authorization and great care (use cache-busting so you don't harm real users).

## The fix (the mirror)

- **Include all response-affecting inputs in the cache key** (or don't let unkeyed inputs affect responses); don't reflect untrusted headers.
- **Cache deliberately** — don't cache personalised/sensitive responses; base caching on content type/route, not just extension; set correct \`Cache-Control\`/\`Vary\`.

In the lab (PortSwigger's cache labs are ideal), poison a cache via an unkeyed header reflected into the page, using cache-busters to avoid affecting others.`,
      sample: {
        lang: 'text',
        caption: 'Cache poisoning: an unkeyed input, cached for everyone',
        code: `Cache key = URL (path + some params).  UNKEYED = ignored for
matching but may still affect the response.

1. find unkeyed input that reflects:  X-Forwarded-Host: evil.com
     -> app builds <script src="//evil.com/x.js"> from it
2. cache stores this response under the normal key (/home)
3. EVERY user requesting /home now gets <script src=//evil.com..>
     = mass XSS, no click needed.

Check: X-Cache: hit/miss, Age header. Use cache-BUSTERS on live.`,
        output: `Cache poisoning weaponises the cache's fan-out: an UNKEYED input
that changes the response gets cached and served to EVERY user of
that URL - turning reflected issues into mass, persistent attacks.
Cache DECEPTION = trick the cache into storing others' private
pages. Fix: key ALL response-affecting inputs; cache deliberately
(not by extension); don't reflect untrusted headers; Vary.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes web cache poisoning possible, and why is its impact often larger than a plain reflected vulnerability?',
        options: [
          'The cache stores passwords in plaintext',
          'An "unkeyed" input (one not part of the cache key, e.g. a reflected header like X-Forwarded-Host) still affects the response, so an attacker’s malicious response gets cached under a normal key and then served to every user who requests that URL — giving mass, no-interaction impact rather than needing each victim to click a crafted link',
          'It requires each victim to install a malicious certificate',
          'It only affects the attacker’s own browser cache',
        ],
        answer: 1,
        explain:
          'Caches serve a stored response to everyone requesting the "same" resource, deciding sameness via a cache key (usually the URL and a few headers). The flaw is an unkeyed input: something the attacker can control that is not part of the cache key — so it is ignored when matching — but that still influences the generated response (a classic example is a reflected header like X-Forwarded-Host used to build a script src or link). The attacker sends a request with that input set to inject malicious content; the cache stores the poisoned response under the normal key; then every subsequent user requesting that URL is served the attacker’s content with no interaction at all. That fan-out is why it dwarfs a plain reflected XSS, which requires tricking each victim into clicking a crafted link. (Its sibling, cache deception, tricks the cache into storing victims’ private pages for the attacker to fetch.) Fixes include keying all response-affecting inputs, not reflecting untrusted headers, using Vary, and caching deliberately rather than by extension. It is not about plaintext storage, certificates, or the attacker’s own cache.',
        hint: 'What is an "unkeyed" input, and once a poisoned response is cached under a popular URL, who receives it?',
      },
    },

    {
      id: 'rweb-s-07',
      title: 'Attacking OAuth, SSO and SAML',
      read: `Modern apps delegate login to **OAuth**, **OpenID Connect**, and **SAML** ("Sign in with..."). These flows are powerful but subtle, and misimplementations lead to account takeover. Understanding the flow is the key to attacking it (on authorized targets).

## OAuth / OIDC in brief

OAuth is an *authorization* framework (OIDC adds *authentication* on top). Simplified flow: the app (client) redirects you to the provider (Google, etc.); you authenticate there; the provider redirects back to the app's **redirect_uri** with an **authorization code**; the app exchanges the code for tokens. Trust hinges on several parameters being validated correctly.

## Common OAuth attacks

- **redirect_uri manipulation** — if the provider/app doesn't strictly validate the redirect_uri, an attacker registers or supplies a redirect_uri they control, so the **authorization code (or token) is sent to the attacker** → account takeover. Weak matching (prefix/substring/open-redirect on an allowed host) is the usual cause.
- **Missing/!checked \`state\`** — \`state\` is the OAuth **CSRF token** for the flow; if the app doesn't generate and verify it, an attacker can perform a login CSRF (force-linking the victim's session to the attacker's account, or vice versa).
- **Stealing the code via open redirect / referer / XSS** — chain an open redirect or referrer leak in the flow to capture the code.
- **Implicit flow token leakage** — tokens in the URL fragment leaking via referer/history.
- **Reusing/replaying codes or tokens**, or a code not bound to the client.

## SAML attacks

SAML (XML-based SSO, common in enterprises) has its own class:

- **Signature issues** — SAML assertions are XML-signed; if the app doesn't verify the signature, or verifies it improperly, you can forge/alter an assertion (change the username to an admin). **XML Signature Wrapping (XSW)** hides a malicious assertion so the app validates a legit signature but *uses* the attacker's assertion — a classic devastating bug.
- **Unsigned/partially-signed assertions accepted**, or comment-injection tricks in the NameID.

## The pattern

These are all failures to **validate the right thing**: the redirect_uri, the \`state\`, the signature, the token binding. Attacking them means understanding each parameter's security role and testing whether it's actually enforced. The reward is often full account takeover, since these flows *are* authentication.

## The fix (the mirror)

- **Strictly validate redirect_uri** (exact allowlist), **always use and verify \`state\`**, bind codes to the client, use the authorization-code flow (with PKCE) not implicit, and short token lifetimes.
- **SAML**: rigorously verify assertion signatures (the whole assertion, resistant to XSW), reject unsigned assertions, and use a vetted library configured securely.

In the lab (PortSwigger's OAuth labs), exploit a weak redirect_uri or missing \`state\` to take over an account, and study an XSW example.`,
      sample: {
        lang: 'text',
        caption: 'OAuth/SAML: attack whatever isn’t properly validated',
        code: `OAUTH FLOW: app -> provider (you log in) -> redirect_uri?code=...
                                                    -> app swaps code for token

ATTACKS (validation failures):
  redirect_uri not strict -> code sent to ATTACKER = account takeover
  no/!verified 'state'    -> login CSRF (link victim to attacker acct)
  open redirect / referer -> steal the code
SAML:
  signature not verified / XML Signature Wrapping (XSW)
    -> forge/alter assertion -> log in as admin`,
        output: `OAuth/SAML security = validating the right things: redirect_uri
(exact allowlist), 'state' (the flow's CSRF token), the SAML
signature (whole assertion, XSW-resistant), token/code binding.
Break any -> account takeover (these flows ARE auth). Fix: strict
redirect_uri, always verify state, code+PKCE flow, verify SAML sig.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In OAuth, why is strict validation of the redirect_uri so critical, and what is the role of the "state" parameter?',
        options: [
          'redirect_uri sets the page theme; state stores the user’s language',
          'The authorization code (or token) is delivered to the redirect_uri, so weak validation lets an attacker have it sent to a URL they control — capturing the code and taking over the account — while "state" is the flow’s CSRF token that, when generated and verified, prevents login-CSRF attacks',
          'redirect_uri encrypts the token; state is the encryption key',
          'Both are optional cosmetic parameters with no security role',
        ],
        answer: 1,
        explain:
          'In the OAuth authorization-code flow, after the user authenticates at the provider, the provider redirects back to the application’s redirect_uri carrying the authorization code (or, in implicit flow, a token). If the redirect_uri is not strictly validated against an exact allowlist — for example it allows prefix/substring matches or an open redirect on an allowed host — an attacker can cause the code/token to be delivered to a URL they control, capturing it and taking over the victim’s account. The state parameter is the flow’s CSRF protection: the app generates an unpredictable value, includes it in the request, and verifies it on return, which prevents an attacker from stitching the victim’s session to the attacker’s account (login CSRF). Both therefore have essential security roles; the defences are strict exact-match redirect_uri validation, always using and verifying state, binding codes to the client, and preferring the code flow with PKCE. They are neither cosmetic nor encryption keys.',
        hint: 'Where does the authorization code get delivered, and what does "state" protect the flow against?',
      },
    },

    {
      id: 'rweb-s-08',
      title: 'Modern client-side attacks',
      read: `Client-side security is more than reflected XSS. Modern JavaScript-heavy apps introduce their own advanced flaws — **prototype pollution**, **postMessage** issues, **DOM clobbering**, and **CORS** misconfigurations — that skilled testers must know. (Authorized targets only.)

## Prototype pollution

JavaScript objects inherit from \`Object.prototype\`. **Prototype pollution** is injecting properties into \`Object.prototype\` itself (via crafted keys like \`__proto__\`, \`constructor.prototype\`), so *every* object suddenly has attacker-controlled properties. If code later reads a property expecting it to be absent, it now finds the attacker's value. Impact ranges from **client-side** (polluting a property that becomes a DOM sink → DOM XSS) to **server-side** (in Node.js, polluting a property used in a security check or a command → auth bypass or RCE). It arises from unsafe recursive merges/clones of attacker-controlled JSON. Test by sending \`__proto__\` keys and checking whether a base object gains the property.

## postMessage vulnerabilities

\`window.postMessage\` enables cross-origin communication between frames/windows. Two classic bugs:

- **Missing origin check on receive** — a handler that processes messages without verifying \`event.origin\` will act on messages from *any* site, so an attacker's page can send messages that trigger sensitive actions or feed a DOM sink (XSS).
- **Overly broad target origin on send** — sending sensitive data with \`postMessage(data, "*")\` leaks it to any window that can receive.

## DOM clobbering

HTML elements with \`id\`/\`name\` attributes become accessible as global/DOM properties. **DOM clobbering** injects HTML (where full script is blocked, e.g. by a filter that allows some markup) whose element names *clobber* variables the app's JavaScript relies on, altering its behaviour — a way to influence JS without \`<script>\`, useful against sanitizers and some CSPs.

## CORS misconfiguration

**CORS** relaxes the same-origin policy for specified origins. Misconfigurations — reflecting the \`Origin\` header into \`Access-Control-Allow-Origin\` (trusting any origin), allowing \`null\`, or combining a wildcard with \`Allow-Credentials\` — let a malicious site make **credentialed** cross-origin requests and *read* the responses, stealing data from the authenticated victim.

## Why these matter

Modern apps push logic to the client, so these client-side classes are increasingly where account takeover and data theft originate — and they're often missed by testers focused on server-side bugs. The pattern echoes the whole track: trusting attacker-controllable data (a key, a message origin, an element name, a request origin) without validation.

## The fix (the mirror)

- **Prototype pollution**: reject/ignore \`__proto__\`/\`constructor\` keys, use safe merge functions, \`Object.create(null)\`/\`Map\` for untrusted data, freeze prototypes.
- **postMessage**: always verify \`event.origin\` on receive; specify an exact target origin on send.
- **DOM clobbering**: robust sanitization; don't rely on globals that HTML can clobber.
- **CORS**: allowlist exact origins; never reflect arbitrary origins; don't combine wildcard with credentials.

In the lab, exploit a prototype-pollution → DOM XSS chain and a missing-origin-check postMessage handler.`,
      sample: {
        lang: 'js',
        caption: 'Modern client-side flaws: pollution, postMessage, CORS',
        code: `// PROTOTYPE POLLUTION: crafted key pollutes every object
JSON.parse('{"__proto__":{"isAdmin":true}}')  // via unsafe merge
// now ({}).isAdmin === true  -> auth bypass / DOM XSS / (Node) RCE

// postMessage: handler that DOESN'T check origin (vulnerable)
window.addEventListener('message', e => {
  // MISSING: if (e.origin !== 'https://trusted') return
  document.getElementById('out').innerHTML = e.data  // any site -> XSS
})

// CORS misconfig: reflecting Origin + credentials
// Access-Control-Allow-Origin: <reflected>  + Allow-Credentials: true
//   -> a malicious site reads the victim's authenticated responses`,
        output: `Modern client-side: PROTOTYPE POLLUTION (__proto__ -> every object;
DOM XSS or Node RCE), postMessage (verify event.origin on receive!),
DOM clobbering (element names clobber JS vars), CORS (reflected
Origin + credentials = data theft). Pattern: trusting attacker
data (key/origin/name) unvalidated. Fixes: safe merges/Map, check
origin, exact CORS allowlist (never wildcard+credentials).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A postMessage handler processes incoming messages without checking event.origin. Why is that dangerous, and what is the fix?',
        options: [
          'It is not dangerous; postMessage is always same-origin only',
          'Without an origin check, the handler acts on messages from any website — so an attacker’s page can send messages that trigger sensitive actions or feed a DOM sink (leading to XSS or data theft) — and the fix is to verify event.origin against an allowlist on receive (and specify an exact target origin when sending)',
          'It exposes the server’s source code; the fix is to minify the JS',
          'It only affects users on mobile devices',
        ],
        answer: 1,
        explain:
          'window.postMessage enables cross-origin communication, and the receiving handler is responsible for deciding whom to trust. If it processes messages without checking event.origin, it will act on messages sent by any website — so an attacker who gets the victim to open a malicious page (or frames the app) can post messages that trigger sensitive functionality or flow into a DOM sink like innerHTML, causing DOM-based XSS or leaking data. The fix is to always verify event.origin against a strict allowlist before handling a message, and, when sending, to specify an exact target origin rather than "*" so sensitive data is not broadcast to any window. It is a client-side trust-validation failure, in the same family as CORS misconfiguration and prototype pollution — trusting attacker-controllable input (here, the message source) without validation. It does not expose server source or depend on device type.',
        hint: 'If the handler never checks who sent the message, whose messages will it act on — and what can an attacker’s page then do?',
      },
    },

    {
      id: 'rweb-s-09',
      title: 'Modern frameworks and their pitfalls',
      read: `Today's apps are built on frameworks — **React/Angular/Vue** on the client, **Node/Express, Django, Rails, Spring, Laravel** on the server. Frameworks change *where* vulnerabilities appear: they prevent many classic bugs by default but introduce their own pitfalls. A skilled tester knows the framework to know where to look.

## Frameworks prevent — then reintroduce — classic bugs

- **Auto-escaping (client)** — React/Angular/Vue escape output by default, largely killing "accidental" XSS. But it creeps back via **explicit unsafe APIs**: React's \`dangerouslySetInnerHTML\`, Angular's \`bypassSecurityTrust*\`, Vue's \`v-html\`, or rendering an \`href\` from user input (\`javascript:\`). So client XSS testing shifts to *finding those specific unsafe sinks*.
- **ORMs (server)** — parameterise queries by default, reducing SQLi — until developers drop to raw queries or build query fragments from input. Look for raw-query escapes and ORM methods that interpolate input.
- **CSRF protection** — many frameworks include it by default; the bug is when it's disabled, misconfigured, or an endpoint opts out.

## Framework-specific pitfalls

- **Server-side rendering (SSR) / hydration** — SSR frameworks (Next.js, Nuxt) can leak server data to the client, or mishandle input across the server/client boundary; misconfig can expose internals.
- **Mass assignment** — Rails/Laravel/Spring binding request params to models (strong-params/guarded attributes exist precisely to stop it) — check they're used.
- **Template engines** — server-side templating brings SSTI risk (earlier step).
- **Prototype pollution** — Node/JS ecosystem, via vulnerable dependencies.
- **Dependency vulnerabilities** — frameworks pull huge dependency trees; **known-vuln components** (OWASP A06) are rampant. Check versions (npm/pip audit equivalents).
- **Insecure defaults / debug mode** — debug mode left on (Django/Rails/Flask) leaks stack traces, secrets, even RCE consoles (Werkzeug); default secret keys; verbose errors.
- **API/GraphQL** — SPA frameworks pair with APIs, inheriting all API risks (BOLA, excessive data).

## The tester's approach

**Identify the stack first** (headers, cookies, JS bundles, error pages, \`/\_next/\`, framework fingerprints), then test the *framework's specific weak spots*: its unsafe sink APIs, its mass-assignment surface, its debug/defaults, its templating, and its dependencies. Framework knowledge turns generic testing into targeted testing.

## The fix (the mirror)

- **Use the framework's safe defaults** and avoid the unsafe-escape-hatch APIs; when you must use them, sanitise rigorously.
- **Keep dependencies patched** (SCA in CI), **disable debug in production**, set strong secrets, use strong-params/guarded models, and configure SSR/CORS/CSP correctly.

In the lab, fingerprint a target's framework, find an unsafe sink (e.g. \`v-html\`/\`dangerouslySetInnerHTML\`) leading to XSS, and check for debug-mode/dependency issues.`,
      sample: {
        lang: 'text',
        caption: 'Frameworks prevent classic bugs — then reintroduce them',
        code: `PREVENTED BY DEFAULT        REINTRODUCED VIA
auto-escaping (React/Vue)   dangerouslySetInnerHTML / v-html / href
parameterised ORM queries   raw queries / string-built fragments
built-in CSRF protection    disabled or opted-out endpoints

FRAMEWORK PITFALLS:
  debug mode ON (Django/Flask/Rails) -> stack traces, secrets, RCE
  mass assignment (Rails/Laravel/Spring) if strong-params not used
  SSR/hydration data leaks ; SSTI ; prototype pollution (Node)
  known-vuln DEPENDENCIES (A06) - check versions

Identify the STACK first, then test its specific weak spots.`,
        output: `Frameworks move vulns, not eliminate them: safe defaults + unsafe
escape-hatch APIs, ORMs + raw queries, built-in CSRF + opt-outs,
debug-mode/default-secret leaks, mass assignment, SSTI, and huge
DEPENDENCY trees (A06). Fingerprint the stack, target ITS weak
spots. Fix: safe defaults, patch deps, no debug in prod, strong-params.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Client-side frameworks like React auto-escape output, largely preventing accidental XSS. So where does XSS testing focus in such apps?',
        options: [
          'XSS is impossible in React apps, so there is nothing to test',
          'On the explicit unsafe "escape-hatch" APIs the framework provides — React’s dangerouslySetInnerHTML, Angular’s bypassSecurityTrust*, Vue’s v-html, or rendering a user-controlled href/javascript: URL — since developers reintroduce XSS by using those to bypass the default escaping',
          'Only on the server-side database queries',
          'On the CSS files, which frameworks do not escape',
        ],
        answer: 1,
        explain:
          'Modern client-side frameworks escape interpolated output by default, which eliminates most "accidental" XSS from ordinary data binding. But every such framework provides deliberate escape hatches for cases where developers want to render raw HTML — React’s dangerouslySetInnerHTML, Angular’s bypassSecurityTrust* methods, Vue’s v-html — and also does not protect against rendering a user-controlled URL into an href (allowing javascript: URLs). XSS reappears precisely when developers use these APIs on untrusted input, so testing shifts to hunting those specific unsafe sinks rather than generic reflection. This reflects the broader theme that frameworks move vulnerabilities rather than abolishing them: safe defaults plus unsafe opt-outs. XSS is a client-side/DOM issue, not about CSS or (directly) database queries, and it is certainly not impossible in React apps. The fix is to avoid the escape-hatch APIs or sanitise rigorously when they are unavoidable.',
        hint: 'The default is safe — so what deliberately-unsafe APIs would a developer have to reach for to reintroduce XSS?',
      },
    },

    {
      id: 'rweb-s-10',
      title: 'WAF evasion and its limits',
      read: `A **Web Application Firewall (WAF)** inspects HTTP traffic and blocks requests matching attack patterns. Skilled testers must understand WAF evasion — to test whether a client's WAF actually protects them, and to reach the *real* vulnerability behind it — while being honest that a WAF is a mitigation, not a fix.

## What a WAF does

A WAF sits in front of the app and applies rules (signatures, and sometimes anomaly scoring) to block requests that look like SQLi, XSS, path traversal, etc. It's defence in depth: valuable for blocking mass automated attacks and buying time to patch, but it does **not fix the underlying vulnerability** — it tries to hide it.

## Evasion techniques (concepts)

WAFs largely match patterns, and patterns have gaps:

- **Encoding & obfuscation** — URL/double-URL encoding, unicode, HTML entities, mixed case, comments inside payloads (\`/**/\` in SQL), splitting keywords, alternative syntax that's equivalent to the app but not matched by the rule.
- **Alternative payloads** — a WAF blocking \`<script>\` may miss \`<svg onload>\`; one blocking \`UNION SELECT\` may miss an equivalent construct; use the many-ways-to-say-the-same-thing property of these languages.
- **HTTP-level tricks** — parameter pollution (\`?id=1&id=2\` where WAF and app pick different values), unusual content-types or methods, chunked encoding, or (advanced) request smuggling to bypass the WAF entirely by reaching the back-end directly.
- **Reaching the origin** — if the origin server's IP is discoverable (DNS history, misconfig), connecting directly bypasses a cloud WAF that only sits on the CDN path.
- **Rate/behaviour** — slowing down to avoid anomaly thresholds.

## The honest framing (why this is defensive)

The point of WAF-evasion testing is to answer the client's question: *is our WAF actually stopping this, or just slowing me down?* If you bypass it and exploit the underlying bug, the finding is twofold: **the real vulnerability** (which must be fixed in code) and **the WAF gap** (tune the rules). If you can't bypass a well-tuned WAF, that's useful too — but you always report the underlying issue, because **a WAF is a band-aid over a vulnerability, not a cure.** Relying on a WAF instead of fixing the code is itself a finding.

## The fix (the mirror)

- **Fix the vulnerability in code** (parameterise, encode, validate) — the WAF is defence in depth, never the primary control.
- **Tune the WAF** (positive/allowlist models, anomaly scoring, virtual patching for known issues), **protect the origin** (only allow traffic via the WAF), and keep rules updated — while treating it as one layer.

In the lab, put a WAF (e.g. ModSecurity with core rules) in front of a vulnerable app, then practise evading it to reach the bug — and note both the bypass and the real fix.`,
      sample: {
        lang: 'text',
        caption: 'WAF evasion concepts — and why you still report the real bug',
        code: `WAF = pattern-matcher in front of the app (defence in depth, NOT a fix).

EVADE (patterns have gaps):
  encoding: %55NION, UNI/**/ON SELECT, double-encoding, unicode
  alt payloads: <script> blocked -> <svg onload=...>
  HTTP tricks: param pollution ?id=1&id=2, odd content-types
  smuggling -> reach back-end past the WAF
  find origin IP -> connect directly, bypassing a cloud WAF

REPORT BOTH: the real vuln (fix in CODE) + the WAF gap (tune rules).`,
        output: `A WAF hides a vuln; it doesn't fix it. Evasion testing answers "is
the WAF actually protecting us?" - patterns have gaps (encoding,
alt payloads, param pollution, smuggling, direct-to-origin). ALWAYS
report the underlying bug (fix in code); relying on a WAF instead
of fixing is itself a finding. Fix code first; tune+protect WAF as
a layer.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your payload is blocked by a WAF. After evading it and exploiting the underlying bug, what should your report say?',
        options: [
          'Only that the WAF was bypassed; the code bug is now irrelevant',
          'Both the underlying vulnerability — which must be fixed in code, since a WAF only hides it — and the WAF gap that allowed the bypass (to be tuned), noting that relying on the WAF instead of fixing the code is itself a finding',
          'That the app is secure because it has a WAF',
          'Nothing, since blocked payloads mean there is no vulnerability',
        ],
        answer: 1,
        explain:
          'A WAF is defence in depth — a pattern-matching filter in front of the app that blocks many attacks and buys time, but it does not fix the underlying flaw; it tries to hide it. WAFs match patterns, and patterns have gaps (encoding/obfuscation, equivalent alternative payloads, HTTP tricks like parameter pollution or request smuggling, or reaching the origin directly), which is why evasion is often possible. So after bypassing the WAF and confirming the real bug, a professional report covers both: the actual vulnerability, which must be remediated in code (parameterise, encode, validate), and the WAF gap that permitted the bypass, so the rules can be tuned. It should also note that depending on a WAF in place of fixing the code is itself a weakness. A blocked payload does not mean the app is secure or bug-free — it may just mean the specific pattern was caught.',
        hint: 'Does a WAF fix the code, or hide it? So what must the report always include besides the bypass?',
      },
    },

    {
      id: 'rweb-s-11',
      title: 'Running a full web pentest',
      read: `Skilled testing culminates in running a **complete web application penetration test** professionally, from scoping to a report that measurably improves the app — turning all the techniques into a coherent engagement.

## The engagement phases

1. **Scoping & authorization** — define exactly what's in scope (domains, apps, roles, functionality), the rules of engagement (can you test destructive actions? production or staging? account creation? automated scanning limits?), and get written authorization. Web scope is easy to overrun — nail it.
2. **Reconnaissance & mapping** — enumerate the full attack surface: content/parameter/subdomain discovery, the API/GraphQL, the tech stack, roles and states (as practised). You cannot test what you don't find.
3. **Testing** — systematically work the surface: for each input/endpoint/feature, test the relevant classes (injection, access control, auth/session, business logic, client-side, and the advanced classes), as the OWASP methodology guides. Use manual testing (Repeater) with tool assistance (Intruder, scanners *as leads*).
4. **Exploitation & chaining** — confirm findings by safe exploitation, and chain where it demonstrates real impact.
5. **Reporting** — the deliverable.

## Methodology and coverage

Follow a structured methodology (the **OWASP Web Security Testing Guide** is the standard) so coverage is complete and repeatable — you test every category against every relevant part of the app, not just what catches your eye. Track what you've tested (a checklist per endpoint/role) so nothing is missed. **Test as each role** and across trust boundaries for access control.

## The report

A web pentest report includes: an **executive summary** (business-level risk), **methodology & scope**, and per finding: **title/category (OWASP), severity (CVSS), description, reproduction steps (with requests), impact, and remediation** — verified, prioritised by risk. Include **chains** as combined-impact narratives. The report must serve two audiences: executives (the risk) and developers (exact, actionable fixes).

## Professionalism throughout

- **Stay in scope**, follow rules of engagement, and **avoid harm** — least-intrusive proofs, no real data exfiltration, careful with destructive actions, and immediate communication if you find something critical or affect availability.
- **Verify before claiming**; handle any sensitive data responsibly; keep clear records.

## Why it matters

The engagement — not any single bug — is the product. A methodical, well-scoped, well-reported pentest gives the organisation a prioritised, actionable path to a more secure app. That is the whole purpose of everything you've learned. In the lab, run a mini end-to-end pentest of a vulnerable app: scope it, map it, test methodically with a coverage checklist, exploit and chain, and produce a structured report.`,
      sample: {
        lang: 'text',
        caption: 'A web pentest, end to end',
        code: `1 SCOPE + AUTH   domains/apps/roles, rules of engagement, in writing
2 RECON/MAP      content/param/subdomain discovery, API, stack, roles
3 TEST           per input/endpoint x each class (OWASP WSTG);
                 manual (Repeater) + tools AS LEADS; coverage checklist
4 EXPLOIT/CHAIN  confirm safely; chain for real impact
5 REPORT         exec summary + per-finding (OWASP/CVSS/repro/impact/fix)
                 + chains; verified, prioritised; two audiences.

Throughout: in scope, least-intrusive, no real data taken, verify.`,
        output: `The ENGAGEMENT is the product, not any single bug. Structured
methodology (OWASP WSTG) + coverage tracking = complete, repeatable
testing. Report serves executives (risk) AND developers (exact
fixes). Professionalism: scope, rules of engagement, avoid harm,
verify, handle data responsibly. Outcome: a prioritised path to safety.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is following a structured methodology (like the OWASP Web Security Testing Guide) and tracking coverage important in a full web pentest?',
        options: [
          'It is not important; testing whatever catches your eye is sufficient',
          'Because systematically testing every relevant vulnerability class against every part of the app, with a coverage checklist per endpoint/role, makes the assessment complete and repeatable — so findings are not missed simply because a tester overlooked an area — which, with a report serving both executives and developers, is what makes the engagement (not any single bug) the deliverable',
          'Because methodologies automatically exploit vulnerabilities',
          'Because it lets you skip getting authorization',
        ],
        answer: 1,
        explain:
          'A professional web pentest aims for complete, repeatable coverage, not a lucky collection of interesting bugs. A structured methodology like the OWASP Web Security Testing Guide ensures you test each relevant vulnerability class against each part of the application — every input, endpoint, feature, and each user role and trust boundary — and tracking coverage (a checklist per endpoint/role) means nothing is skipped simply because it did not catch your eye. That rigour, combined with staying in scope under written authorization, verifying findings, avoiding harm, and delivering a report that serves both executives (business risk) and developers (exact, prioritised, actionable fixes), is what makes the engagement itself the product and gives the organisation a real path to a more secure app. Methodologies do not auto-exploit anything, and they never replace obtaining authorization.',
        hint: 'What does a coverage checklist across classes/endpoints/roles prevent, and what is the actual deliverable of an engagement?',
      },
    },

    {
      id: 'rweb-s-12',
      title: 'Project: a full web app pentest',
      read: `Your skilled capstone is a **complete, professional web application penetration test** of a vulnerable app you run — scoped, methodical, covering modern/advanced classes, with chaining, delivered as a real report. Local lab / authorized only.

## The brief

Treat a target (OWASP Juice Shop is ideal for breadth; or a broad PortSwigger lab set / a purpose-built app) as a client engagement. Define your own scope and rules of engagement, then run the full methodology and produce a professional report.

## The engagement

1. **Scope & rules** — write a short scope (in-scope app/roles/functionality) and rules of engagement, even though it's your own lab (practise the discipline).
2. **Recon & mapping** — thorough content/parameter/subdomain/API discovery; fingerprint the stack; enumerate roles and states; build the attack surface.
3. **Methodical testing** — with a coverage checklist, test each part against the relevant classes: injection (incl. SSTI/SSRF/deserialization where present), access control (BOLA/IDOR/mass assignment/priv-esc), auth/session/JWT, business logic, and client-side (XSS, prototype pollution, postMessage, CORS). Include at least one *advanced skilled-level* class (SSTI, advanced SSRF, deserialization, race condition, smuggling, cache poisoning, OAuth/SAML, or a modern client-side flaw).
4. **Exploit & chain** — confirm findings with least-intrusive proofs; build at least one chain demonstrating critical impact (e.g. RCE or account takeover).
5. **Report** — a structured deliverable: executive summary, scope/methodology, per-finding write-ups (category/severity/repro-with-requests/impact/remediation), the chain narrative, and prioritised recommendations.

## The standard

You pass when your engagement demonstrates: a defined scope and methodical, coverage-tracked testing; a range of findings across multiple classes including at least one advanced skilled-level vulnerability; at least one chain to critical impact; and a professional report serving both executives and developers, with verified, prioritised, actionable findings. All in the local lab, least-intrusive proofs, no real data exfiltrated, nothing destructive beyond scope.

## Where next

Pro is the deep end: browser-security-model and HTTP internals, protocol-level attacks, injection theory (parser differentials), building web tooling and Burp extensions, source-code review, novel vulnerability research, and bug bounty as a discipline — plus a research-grade assessment. Everything there explains the *why* beneath the techniques you've now mastered, and points toward finding the *next* class of bug.`,
      sample: {
        lang: 'text',
        caption: 'The skilled capstone: a full engagement (lab only)',
        code: `1 scope + rules of engagement (write them, even for your lab)
2 recon/map: content/param/subdomain/API discovery + stack + roles
3 methodical test w/ COVERAGE checklist across ALL classes,
    incl. >=1 ADVANCED (SSTI/SSRF/deser/race/smuggle/cache/OAuth/
    client-side)
4 exploit (least-intrusive) + >=1 CHAIN to critical impact (RCE/ATO)
5 REPORT: exec summary + methodology + per-finding + chain +
    prioritised recommendations (two audiences)`,
        output: `Pass = defined scope + methodical coverage-tracked testing +
findings across MULTIPLE classes (incl. >=1 advanced) + >=1 chain
to critical impact + a professional report for executives AND
developers (verified, prioritised, actionable). Local lab,
least-intrusive, no real data, nothing destructive beyond scope.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the skilled web capstone (a full web app pentest)?',
        options: [
          'Finding a single remote code execution as fast as possible',
          'A defined scope with methodical, coverage-tracked testing across multiple vulnerability classes (including at least one advanced skilled-level class), at least one chain to critical impact, and a professional report serving both executives and developers with verified, prioritised, actionable findings — all in the local lab with least-intrusive proofs',
          'The largest number of automated scanner findings pasted into a document',
          'Testing a live production application without scoping it first',
        ],
        answer: 1,
        explain:
          'The skilled capstone simulates a professional engagement, so the bar is a professional engagement — not a single flashy bug. Passing requires a defined scope and rules of engagement; methodical, coverage-tracked testing across the vulnerability classes (injection, access control, auth/session/JWT, business logic, client-side), including at least one advanced skilled-level class such as SSTI, advanced SSRF, deserialization, a race condition, request smuggling, cache poisoning, OAuth/SAML, or a modern client-side flaw; at least one chain demonstrating critical impact like RCE or account takeover; and a structured report that serves both executives (business risk) and developers (exact, prioritised, actionable fixes), with every finding verified. It is done in the local lab with least-intrusive proofs, no real data exfiltrated, and nothing destructive beyond scope. Racing to one RCE, pasting raw scanner output, or testing an unscoped production site all fail the standard.',
        hint: 'The deliverable is a professional engagement — scope, coverage, an advanced class, a chain, and a two-audience report — not one bug or raw scanner output.',
      },
    },
  ],
}

export default level
