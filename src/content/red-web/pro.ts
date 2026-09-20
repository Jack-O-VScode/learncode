import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'Web internals, research and bug bounty',
  summary:
    'The deep end of web hacking: how the browser security model and HTTP actually work (so you understand why every web attack behaves as it does), the theory that unifies all injection (parser differentials and context), building your own tooling and Burp extensions, white-box source review, the research methodology that finds novel vulnerability classes, bug bounty as a discipline, and responsible disclosure. The depth serves defence — turning "the payload worked" into a precise, mechanism-level, fixable explanation. Everything is practised only on apps you own, deliberately vulnerable targets, or programs that authorize you.',
  outcomes: [
    'Explain the browser security model (SOP, CORS, cookies, CSP) as designs',
    'Understand HTTP internals and why protocol-level attacks work',
    'Reason about injection as parser differentials and context confusion',
    'Build custom web tooling and Burp extensions',
    'Review source code to find web vulnerabilities (white-box)',
    'Research novel vulnerabilities and disclose responsibly',
  ],
  steps: [
    {
      id: 'rweb-p-01',
      title: 'The deep end — and the same rule',
      read: `You have reached the deepest offensive web level. Skilled took you through SSTI, advanced SSRF and deserialization, race conditions, smuggling, cache poisoning, OAuth/SAML, and modern client-side attacks. **Pro is about *why* all of it works** — the browser and HTTP internals, the parser theory, the design decisions — and about building your own tools, reviewing source, and finding your own bugs. The rule that opened this whole track has not changed and never will: **everything here is for apps you own, deliberately vulnerable targets you run, or programs (bug bounties, engagements) that authorize you, in writing or by published scope.**

## What "pro" means here

- **Read the platform, don't just run the tools.** Burp, sqlmap and the rest are front-ends for browser and HTTP behaviour. When you understand the same-origin policy, the cookie model, and HTTP parsing, you can reason about a target no tool has a button for, and explain a finding at the mechanism level.
- **Understand the security model as a design.** SOP, CORS, CSP, cookies, HTTP framing — each is a design with a threat model and a boundary. Attacks live at the boundaries; knowing the design is how you find them.
- **Build and review.** Pros write their own tooling (Burp extensions, custom scanners) and read source code white-box to find what black-box testing misses.
- **Research.** The deepest testers find *new* vulnerability classes and run bug bounty as a discipline. The final steps look at how.

## Why the depth is defensive

This is the culmination of the offensive-defensive unity theme. A tester who can explain *why* the SOP allowed that request, *which* parser disagreement enabled the smuggle, *why* the CSP failed, and *what* the fix is, hands the defender something precise and actionable. Depth turns "I got XSS" into "here is the exact mechanism and exactly what closes it." Keep that as the purpose of everything below, and keep the boundary — owned or authorized targets — as the fixed point around which it all turns.`,
      sample: {
        lang: 'text',
        caption: 'How the levels of this track build',
        code: `beginner      : ethics, lab, HTTP, the proxy, mapping, Top 10
amateur       : XSS, SQLi, cmd inj, access control, auth, CSRF, upload
intermediate  : blind SQLi, SSRF, XXE, deser, APIs, JWT, chaining
skilled       : SSTI, RCE chains, races, smuggling, cache, OAuth, client
pro (here)    : browser/HTTP internals, injection theory, tooling,
                source review, and vulnerability research

At every level the boundary is identical:
  own/vulnerable-by-design apps or authorized programs. Nothing else.`,
        output: `Pro is not "more tools". It is understanding the platform well
enough to reason from the security model, defeat or explain a
control because you understand its design, build your own tooling,
and hand defenders a mechanism-level, fixable finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes "pro"-level offensive web work from the levels before it?',
        options: [
          'Access to more powerful automated web scanners',
          'Understanding the browser and HTTP internals, the security model as a design, and injection theory well enough to reason without a tool, build your own tooling, review source, and research new bugs — hand defenders a mechanism-level finding — all still confined to owned or authorized targets',
          'Permission to test any website once you are skilled enough',
          'Focusing only on offence and ignoring defence',
        ],
        answer: 1,
        explain:
          'Pro is depth, not more buttons. It means reading the browser security model (same-origin policy, CORS, cookies, CSP) and HTTP as designs so you understand why every web attack behaves as it does, reasoning about injection as parser/context theory, building your own tooling and Burp extensions, reviewing source code white-box, and researching novel vulnerability classes. That depth serves defence — it turns a compromise into a precise, mechanism-level, fixable finding. And the authorization boundary is unchanged: apps you own, deliberately vulnerable targets, or programs that authorize you (by contract or published bug-bounty scope), always. Skill never becomes blanket permission to test any site.',
        hint: 'Skill did not become permission, and pro is not a bigger toolbox — it is understanding the platform.',
      },
    },

    {
      id: 'rweb-p-02',
      title: 'The browser security model',
      read: `Almost every client-side web attack and defence is a consequence of the **browser security model**, whose cornerstone is the **same-origin policy (SOP)**. Read it as a design and the client-side world snaps into focus.

## The same-origin policy

An **origin** is the triple **(scheme, host, port)** — \`https://app.example:443\`. The SOP's rule: script running in one origin can freely interact with resources of the *same* origin but is **restricted from reading responses/data of a *different* origin**. This is *the* foundational web security boundary — it's why a malicious site can't just read your webmail. Crucially, SOP restricts *reading cross-origin responses*; it does **not** stop your browser from *sending* cross-origin requests (which is exactly why CSRF exists — the request goes, cookies attached, the attacker just can't read the response).

## The mechanisms built around SOP

- **CORS** — a *controlled relaxation* of SOP: a server can opt specific origins in to read its responses via \`Access-Control-Allow-Origin\` (and \`-Allow-Credentials\`). Misconfigure it (reflect any origin, allow \`null\`, wildcard + credentials) and you hand cross-origin read access to attackers.
- **Cookies** — sent automatically to their domain (the root of CSRF); controlled by **SameSite** (cross-site sending), **HttpOnly** (JS access), **Secure** (HTTPS only), and domain/path scope. Cookie behaviour is its own sub-model with real subtlety (subdomains, \`__Host-\` prefixes).
- **CSP (Content Security Policy)** — a server-set policy restricting what resources/scripts a page may load/run — defence in depth against XSS. Its strength is entirely in its configuration (nonces/hashes vs \`unsafe-inline\`).
- **iframe / framing controls** — \`X-Frame-Options\`/CSP \`frame-ancestors\` (clickjacking), and sandboxing.

## Why the design lens matters

Every client-side attack you know maps to this model: **XSS** is running script *within* an origin (so SOP protects nothing — you're already same-origin); **CSRF** exploits that SOP allows cross-origin *requests* (not reads); **CORS attacks** exploit misconfigured relaxation of SOP; **clickjacking** exploits framing; **postMessage** issues are cross-origin messaging outside SOP's read rule. Understanding *why* SOP allows or forbids each thing tells you where the attacks and the defences live — and lets you reason about a novel situation from first principles.

## The pro finding

Instead of "CORS is misconfigured", you write "\`Access-Control-Allow-Origin\` reflects the request Origin with \`Allow-Credentials: true\`, so any site can read authenticated responses — the SOP relaxation is unbounded; restrict to an exact allowlist." That mechanism-level precision is the value. In the lab, map an app's SOP-related headers (CORS, CSP, cookie flags, frame options) and reason about what each does and does not protect.`,
      sample: {
        lang: 'text',
        caption: 'The same-origin policy and the model around it',
        code: `ORIGIN = (scheme, host, port).  SOP: script may READ same-origin
resources, but NOT read cross-origin responses.
  BUT SOP does NOT stop SENDING cross-origin requests -> CSRF.

BUILT AROUND SOP:
  CORS    controlled RELAXATION (Allow-Origin/-Credentials) -> misconfig = read access
  cookies auto-sent (CSRF); SameSite/HttpOnly/Secure/scope
  CSP     restrict scripts/resources (XSS defence in depth)
  framing X-Frame-Options / frame-ancestors (clickjacking)

MAP each attack to the model:
  XSS = script WITHIN an origin   CSRF = cross-origin SEND allowed
  CORS attack = bad relaxation    clickjacking = framing`,
        output: `The browser security model (SOP at its core) explains the whole
client-side world: what a page may read vs send, and every
mechanism (CORS/cookies/CSP/framing) is a design around it. Attacks
live at the boundaries. Reason from the model -> mechanism-level
findings and first-principles thinking about novel cases.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The same-origin policy restricts cross-origin access. Why does CSRF still work despite the SOP?',
        options: [
          'Because CSRF disables the same-origin policy',
          'Because the SOP restricts *reading* cross-origin responses, but it does not prevent the browser from *sending* cross-origin requests (with cookies attached) — CSRF only needs the request to be sent and acted upon, not to read the response',
          'Because CSRF only works on same-origin requests',
          'Because the SOP does not apply to authenticated users',
        ],
        answer: 1,
        explain:
          'The same-origin policy’s core restriction is on reading: script in one origin generally cannot read the responses/data of a different origin. It does not, however, stop the browser from sending cross-origin requests, and the browser automatically attaches the target site’s cookies to those requests. CSRF exploits exactly this asymmetry: the attacker’s page causes the victim’s browser to send a state-changing request to the target (transfer, change email), which the server processes as authenticated — the attacker never needs to read the response, only to have the request acted upon. That is why CSRF coexists with the SOP, and why defences add what SOP does not provide: anti-CSRF tokens (which the attacker cannot read cross-origin) and SameSite cookies (which stop the cookie being sent cross-site). Understanding the model this precisely — read vs send — is what lets a pro reason about client-side attacks from first principles.',
        hint: 'SOP restricts one verb (reading) but not another (sending) — which does CSRF only need?',
      },
    },

    {
      id: 'rweb-p-03',
      title: 'HTTP internals and protocol attacks',
      read: `Pro-level understanding of **HTTP itself** explains request smuggling, response splitting, and a class of protocol-level attacks — and lets you reason about them rather than run a scanner blind.

## HTTP/1.1 message framing

An HTTP/1.1 connection carries messages back to back, so servers must know exactly where each message ends. The length is given by **Content-Length** (byte count) or **Transfer-Encoding: chunked** (a series of sized chunks ending in a zero-length chunk). Connections are **reused** (keep-alive) for many requests, and often shared through proxies. **All the framing-based attacks flow from this:** if two parties in the chain compute message boundaries differently, one message can bleed into the next.

- **Request smuggling** (skilled) is precisely a **framing disagreement** between front-end and back-end (CL vs TE, duplicated/obfuscated headers) on a reused connection. Now you know *why*: HTTP/1.1's two length mechanisms plus connection reuse make boundary consensus fragile.
- **Response splitting / header injection** — if attacker input reaches a response header unsanitised and can inject CRLF (\`\\r\\n\`), it can forge headers or split one response into two (an older but instructive class). Same root: the protocol delimits with newlines, so injected newlines confuse framing.

## HTTP/2 (and /3) change the game

**HTTP/2** uses **binary framing** with explicit lengths and multiplexed streams — the CL/TE ambiguity largely disappears *within* HTTP/2. That's why **end-to-end HTTP/2 is a smuggling defence**. But **HTTP/2-to-HTTP/1.1 downgrading** at a front-end reintroduces the problem: the front-end rewrites h2 into h1 for the back-end, and if it does so carelessly (e.g. trusting an h2 header that becomes a conflicting CL/TE), **h2 request smuggling** results. Understanding the framing difference is what lets you reason about these.

## Other protocol-level surface

- **Host header attacks** — the app trusting the \`Host\`/\`X-Forwarded-Host\` (password-reset poisoning, cache issues, routing to unintended vhosts).
- **Connection/keep-alive and proxy quirks**, **header parsing differentials** (which underpin smuggling and WAF bypass).

## Why the depth pays

Protocol attacks are subtle and high-impact, and they *require* understanding the protocol — you can't meaningfully find or explain a smuggling desync without knowing CL vs TE and connection reuse. The pro finding is mechanism-level: "the front-end forwards TE while the back-end uses CL on a reused connection → CL.TE desync; deploy end-to-end HTTP/2 or reject ambiguous framing." In the lab, examine chunked vs Content-Length framing in raw requests, and study how an HTTP/2 downgrade can reintroduce smuggling.`,
      sample: {
        lang: 'text',
        caption: 'HTTP framing is the root of protocol-level attacks',
        code: `HTTP/1.1 length: Content-Length (bytes) OR Transfer-Encoding: chunked
  + connections REUSED (keep-alive), shared via proxies
  -> if two parties compute boundaries differently, one message
     bleeds into the next = REQUEST SMUGGLING (CL.TE/TE.CL/TE.TE)
  -> injected CRLF into a header = response splitting/header injection

HTTP/2: BINARY framing, explicit lengths -> CL/TE ambiguity gone
  BUT h2->h1 DOWNGRADE at a front-end can REINTRODUCE smuggling.

Also: Host / X-Forwarded-Host trust (reset poisoning, routing).`,
        output: `HTTP/1.1's two length mechanisms + connection reuse make boundary
consensus fragile -> smuggling/splitting. HTTP/2 binary framing
fixes it end-to-end, but h2->h1 downgrade brings it back. You can't
find/explain these without knowing the framing. Pro finding =
mechanism-level (name the desync + the framing fix).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does end-to-end HTTP/2 largely prevent request smuggling, while an HTTP/2-to-HTTP/1.1 downgrade at the front-end can reintroduce it?',
        options: [
          'HTTP/2 encrypts requests so they cannot be tampered with',
          'HTTP/2 uses binary framing with explicit lengths, removing the HTTP/1.1 Content-Length-vs-Transfer-Encoding ambiguity that causes boundary disagreements — but when a front-end rewrites HTTP/2 into HTTP/1.1 for the back-end, it can carelessly produce conflicting CL/TE framing, so the desync returns',
          'HTTP/2 has no headers, so smuggling is impossible',
          'The downgrade only affects image requests',
        ],
        answer: 1,
        explain:
          'Request smuggling arises from disagreement over where one HTTP/1.1 message ends, which stems from HTTP/1.1 having two length mechanisms (Content-Length and Transfer-Encoding: chunked) plus reused connections — parties can compute boundaries differently. HTTP/2 replaces this with binary framing that carries explicit, unambiguous lengths and multiplexed streams, so within HTTP/2 the CL/TE ambiguity that enables smuggling essentially disappears — which is why end-to-end HTTP/2 is a defence. The problem returns when a front-end speaks HTTP/2 to clients but rewrites requests into HTTP/1.1 for the back-end: if it translates carelessly (for example trusting an HTTP/2 header that becomes a conflicting Content-Length/Transfer-Encoding in the h1 request), it recreates the exact desync condition — HTTP/2 request smuggling. HTTP/2 still has headers and is not about encryption here; understanding the framing difference is what lets you reason about it.',
        hint: 'What ambiguity does HTTP/2 binary framing remove, and what does translating h2 back into h1 risk reintroducing?',
      },
    },

    {
      id: 'rweb-p-04',
      title: 'The theory of injection',
      read: `At the deepest level, *all* injection — SQLi, XSS, command injection, SSTI, XXE, header injection — is **one idea**: a **parser confusion** where data crosses into code because two systems interpret a string differently. Seeing the unifying theory lets you reason about any injection, and find new ones.

## The core: code/data confusion via parsers

Every injection has the same shape:

1. A string is built that mixes trusted **structure** (the query, the HTML, the command, the template) with untrusted **data** (user input).
2. That string is handed to a **parser/interpreter** (the SQL engine, the HTML parser, the shell, the template engine).
3. The parser can't tell which parts were meant as *structure* and which as *data*, so crafted input **changes the structure** — data becomes code.

The vulnerability is *always* "structure and data were combined into one string and then parsed." The fix is *always* "keep structure and data separate so the parser can't confuse them" (parameterisation, context-aware encoding, argument arrays, disabling dangerous parser features). Different interpreter, same theorem.

## Context is a parser concept

The "context" idea from advanced XSS is really *which parser, in which state, will consume your input*. Input flowing into an HTML attribute vs a JS string vs a URL is consumed by different parsers (or the same parser in different states), so the escape/breakout differs. Encoding must match the *consuming parser's* rules. This is why context-aware encoding — not one blanket filter — is the correct fix: you're encoding for whichever parser reads that position.

## Parser differentials: the frontier

The subtle, research-grade cases are **parser differentials** — *two* parsers disagreeing about the *same* input:

- **Request smuggling** — front-end and back-end HTTP parsers disagree on message boundaries.
- **Server-side vs client-side parsing** — a value sanitised for one parser but consumed by another (mutation XSS: the sanitizer's HTML parse differs from the browser's).
- **URL parser confusion** — an SSRF validator and the HTTP fetcher parse a URL differently (which host is it?), enabling filter bypass.
- **Unicode/encoding differentials** — one layer normalises differently than the next, smuggling a payload past a filter.

Finding differentials — where two components will parse your input differently — is a powerful lens for discovering *novel* bugs, because wherever two parsers meet, a disagreement may hide.

## Why this is the pro view

With this theory, you don't memorise dozens of injection types — you recognise the one pattern and reason about *any* place data meets a parser, including combinations no tool has a signature for. And you explain findings at the deepest level: "the sanitizer and the browser parse this HTML differently (a parser differential), so the payload that's inert to the sanitizer executes in the browser — fix by parsing/sanitising with the same model the browser uses." In the lab, take three different injection types and articulate each as the same code/data-confusion pattern, then find a parser differential (e.g. an mXSS via sanitizer/browser disagreement).`,
      sample: {
        lang: 'text',
        caption: 'All injection is one idea; differentials are the frontier',
        code: `THE ONE PATTERN (every injection):
  structure + untrusted DATA -> one string -> a PARSER -> data
  becomes CODE because the parser can't tell them apart.
  FIX (always): keep structure & data SEPARATE (parameterise /
  context-encode / arg arrays / disable dangerous parser features).

CONTEXT = which parser (or parser state) consumes your input
  -> encode for THAT parser (why context-aware, not one filter).

PARSER DIFFERENTIALS (research frontier): TWO parsers disagree:
  smuggling (front/back HTTP), mXSS (sanitizer vs browser),
  SSRF URL confusion (validator vs fetcher), unicode normalisation.`,
        output: `Injection = code/data confusion at a PARSER. One theorem across
SQLi/XSS/cmd/SSTI/XXE. "Context" = which parser consumes the input.
The frontier is PARSER DIFFERENTIALS: two components parsing the
same input differently - where novel bugs hide. Reason from the
pattern, not a list; explain findings at parser level.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What single underlying idea unifies SQL injection, XSS, command injection, SSTI and XXE, and what does it imply about the fix?',
        options: [
          'They all require the attacker to guess a password; the fix is stronger passwords',
          'They are all code/data confusion at a parser — untrusted data is combined with trusted structure into one string that an interpreter then parses, so crafted input changes the structure (data becomes code) — implying the fix is always to keep structure and data separate (parameterisation, context-aware encoding, argument arrays, disabling dangerous parser features)',
          'They are all client-side attacks fixed by a Content Security Policy',
          'They are all caused by missing encryption; the fix is TLS',
        ],
        answer: 1,
        explain:
          'Every injection class shares one shape: a string is built mixing trusted structure (a SQL query, HTML, a shell command, a template, XML) with untrusted user data, and that string is handed to a parser/interpreter that cannot distinguish which parts were meant as structure versus data — so crafted input alters the structure and data becomes code. Because the root cause is identical, so is the remedy: keep structure and data separate so the parser can never confuse them — parameterised queries for SQL, context-aware output encoding for HTML/JS/URL, argument-array APIs (no shell) for commands, passing data only as template variables, and disabling external entities for XML. This unifying theory means you reason about any place data meets a parser rather than memorising dozens of types, and the research frontier — parser differentials, where two components parse the same input differently — is where novel bugs hide. It is not about passwords, TLS, or a single client-side control.',
        hint: 'What happens when structure and data share one string that a parser then reads — and what does "always separate them" fix?',
      },
    },

    {
      id: 'rweb-p-05',
      title: 'Building web tooling and extensions',
      read: `Pros don't stop at existing tools. When testing needs a capability no tool provides — a custom check, a bespoke scanner, an automation of *your* methodology — you build it. Understanding how tooling is built also makes you far more effective with the tools you have.

## Extending Burp

Burp's real power at the pro level is **extensions**. The Extender API (Java, or Python via Jython, or the modern **Montoya API**) lets you:

- **Add custom scanner checks** — encode a vulnerability pattern *you* know (a specific parameter behaviour, a business-specific issue) so Burp tests for it automatically across the app.
- **Manipulate traffic programmatically** — auto-modify requests (add headers, re-sign JWTs, refresh CSRF tokens, handle custom auth) so manual testing isn't blocked by the app's mechanics.
- **Automate workflows** — custom Intruder payloads, session handling, or processing responses to extract data.
- **Integrate** other tools and data. Many famous extensions (Autorize for access-control testing, JWT editors, param miner) are exactly this — someone automated a methodology.

## Standalone tooling

Beyond Burp, you build:

- **Custom scanners / fuzzers** — targeted at a specific tech, protocol, or class, in Python/Go, often on top of libraries (requests/httpx, an HTTP/2 client for smuggling research).
- **Recon automation** — pipelines chaining subdomain enum → probing → screenshotting → nuclei-style templated checks, tuned to your process.
- **Nuclei templates** — encode a check as a shareable template rather than code.
- **One-off scripts** — the pro habit of scripting anything repetitive (bulk-test an IDOR across thousands of ids, diff responses at scale).

## Why build

- **Fit** — your methodology and the target's specifics, not a tool vendor's defaults.
- **Scale** — automate the repetitive so you spend human attention on judgement (finding logic flaws, chaining).
- **Novelty** — new attack classes have no tool yet; you build the check that finds them (and often release it, advancing the field).
- **Understanding** — building a check for a bug class forces you to understand it precisely.

## The defensive mirror

Everything you can build to *find* a class, a defender can build to *detect* or *prevent* it — custom detection rules, CI security checks, or a test in the app's own suite. Sharing a nuclei template or a Burp check helps both sides. Understanding tooling is understanding the automatable core of a vulnerability. In the lab, write a small Burp extension (or a Python script) that automates one check you find yourself doing repeatedly — e.g. testing an ID parameter for IDOR across a range.`,
      sample: {
        lang: 'text',
        caption: 'Automate your methodology: Burp extensions and custom tools',
        code: `BURP EXTENSIONS (Montoya/Jython): encode a check YOU know so Burp
  runs it automatically; auto-modify traffic (re-sign JWT, refresh
  CSRF token, custom auth); custom Intruder/session handling.
  (Autorize, JWT editors, param miner = automated methodologies.)

STANDALONE: custom scanners/fuzzers (Python/Go), recon pipelines
  (subs -> probe -> screenshot -> templated checks), nuclei
  templates, one-off scripts (bulk-test IDOR across 1000s of ids).`,
        output: `Build when tools don't fit: for FIT (your methodology), SCALE
(automate the repetitive -> spend attention on judgement), NOVELTY
(new classes have no tool yet), UNDERSTANDING. Mirror: anything you
build to FIND a class, a defender can build to DETECT/PREVENT it
(detection rules, CI checks, tests). Sharing helps both sides.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do pro-level web testers build custom tooling (Burp extensions, scripts, nuclei templates), and what is the defensive mirror?',
        options: [
          'To avoid learning how the underlying vulnerabilities work',
          'For fit (their own methodology), scale (automating the repetitive so human attention goes to judgement like logic flaws and chaining), and novelty (new classes have no tool yet) — and the defensive mirror is that whatever you build to find a class, a defender can build to detect or prevent it (detection rules, CI checks, app tests)',
          'Because custom tools are the only legal way to test',
          'Because building tools removes the need for authorization',
        ],
        answer: 1,
        explain:
          'Off-the-shelf tools encode vendor defaults and known checks; pros build their own to fit their specific methodology and a target’s specifics, to scale by automating repetitive work (bulk-testing an ID parameter across thousands of values, diffing responses) so their human attention is spent on judgement-heavy work like business-logic flaws and chaining, and to cover novel vulnerability classes that no tool yet detects — often releasing the result and advancing the field. Building a check also forces precise understanding of the bug class. The defensive mirror follows directly: the automatable core of a vulnerability can be encoded for defence too — as detection rules, CI/CD security checks, or tests in the application’s own suite — so sharing a Burp extension or nuclei template helps both attackers and defenders. Building tools neither replaces understanding nor removes the need for authorization.',
        hint: 'Think fit/scale/novelty for why — and for the mirror, what can a defender do with the same automatable check?',
      },
    },

    {
      id: 'rweb-p-06',
      title: 'Source code review for web bugs',
      read: `Black-box testing probes from outside; **white-box source code review** reads the app's code to find vulnerabilities directly. It finds bugs black-box misses, explains root causes precisely, and is a core pro skill (in engagements with code access, and for your own apps).

## Why review source

- **Coverage** — you see *every* endpoint, parameter, and code path, including ones black-box never reaches (hard-to-trigger branches, admin-only code, disabled features).
- **Root cause** — you see exactly *why* a bug exists (the missing check, the concatenated query), so the finding and fix are precise.
- **Efficiency** — for whole classes (all SQL queries, all deserialization calls), grepping the source is faster and more complete than probing blindly.
- **Subtle bugs** — logic flaws, missing authorization on one endpoint among many, and dangerous patterns are often clearest in code.

## The method: sources and sinks

The core technique is **data-flow (taint) analysis**:

- **Sources** — where untrusted input enters (request params, headers, body, uploaded files, external data).
- **Sinks** — dangerous operations where input causes harm: a SQL query (SQLi), HTML output (XSS), a shell call (command injection), a file path (traversal), a deserialize (RCE), a URL fetch (SSRF), a template (SSTI).
- **The flow** — trace whether data from a source reaches a sink **without proper sanitisation/separation** in between. If it does, that's the vulnerability. If it's parameterised/encoded/validated on the way, it's safe.

You work either **forward** (from sources, where does this input go?) or **backward** (from dangerous sinks, what feeds them?). Backward from sinks is often efficient: grep for the dangerous functions (raw query builders, \`eval\`, \`exec\`, \`system\`, \`unserialize\`/\`pickle.load\`, \`innerHTML\`, template render-with-concatenation, deserialize APIs) and trace their arguments back to see if attacker input reaches them unsanitised.

## What to look for

- **The sinks above** and whether input reaches them safely.
- **Authorization checks** — is every sensitive function/endpoint gated? Missing checks are visible in code (an endpoint with no auth decorator/guard).
- **Auth/session/crypto** — how tokens/passwords/sessions are handled; hardcoded secrets and keys (grep for them).
- **Configuration** — debug flags, insecure defaults, dependency versions (the manifest → known-vuln components).
- **Dangerous patterns** — the framework escape-hatches (\`dangerouslySetInnerHTML\`), string-built queries, disabled security features.

## Tools

- **grep/ripgrep** for sinks, secrets, and patterns — simple and powerful.
- **SAST** (Static Application Security Testing: Semgrep, CodeQL) — automated source-to-sink analysis; write custom rules for app-specific patterns (the mirror of custom Burp checks). Verify results (false positives), as with any scanner.

## The mirror

Source review *is* the defender's activity too — secure code review and SAST in CI are how bugs are caught before shipping. A pro who reviews code finds the bug, gives the exact file/line and fix, and can recommend the SAST rule that would catch it next time. In the lab, review a deliberately vulnerable app's source: grep for sinks, trace one source-to-sink flow to a real bug, and note the missing separation.`,
      sample: {
        lang: 'text',
        caption: 'Source review = tracing sources to sinks',
        code: `SOURCES (untrusted in)      SINKS (dangerous ops)
request params/headers/body  raw SQL query      -> SQLi
uploaded files               HTML output        -> XSS
external data                shell exec         -> command inj
                             file path          -> path traversal
                             unserialize/pickle -> RCE
                             url fetch          -> SSRF
                             template + concat  -> SSTI

VULN = source reaches a sink WITHOUT sanitisation/separation.
Work BACKWARD: grep sinks (exec, eval, unserialize, innerHTML,
raw query) -> trace args back to a source. Also: missing authz
checks, hardcoded secrets, debug flags, vuln deps.`,
        output: `White-box review sees EVERY path + the ROOT cause. Method = taint
analysis: does untrusted SOURCE reach a dangerous SINK unsanitised?
Grep sinks/secrets; SAST (Semgrep/CodeQL) automates source->sink
(verify). Mirror: this IS secure code review / SAST-in-CI - find
the bug, give file:line + fix + the rule to catch it next time.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the core technique of source code review for finding injection-style web vulnerabilities?',
        options: [
          'Running the app and clicking every button',
          'Data-flow (taint) analysis: tracing whether untrusted input from a source (request params, headers, body, uploads) reaches a dangerous sink (SQL query, HTML output, shell exec, deserialize, URL fetch, template) without proper sanitisation or separation in between — often working backward by grepping for the dangerous sinks and tracing their arguments to a source',
          'Counting the lines of code in each file',
          'Checking only the CSS and image assets',
        ],
        answer: 1,
        explain:
          'White-box review finds vulnerabilities by reasoning about data flow — taint analysis. You identify sources (where untrusted input enters: request parameters, headers, body, uploaded files, external data) and sinks (dangerous operations where input can cause harm: raw SQL queries, HTML output, shell execution, file-path use, deserialization, URL fetches, template rendering), then determine whether input from a source can reach a sink without being properly sanitised, parameterised, or otherwise kept separate from code. If it can, that path is the vulnerability; if it is parameterised/encoded/validated along the way, it is safe. In practice you often work backward — grep for the dangerous sinks (exec, eval, unserialize, innerHTML, raw query builders) and trace their arguments back to a source — which is efficient and complete for whole classes. Source review also reveals missing authorization checks, hardcoded secrets, and vulnerable dependencies, and it mirrors the defender’s secure-code-review/SAST activity. It is not about clicking buttons, counting lines, or reviewing assets.',
        hint: 'You are looking for a path from untrusted input to a dangerous operation — what is that analysis called, and which two endpoints of the path do you connect?',
      },
    },

    {
      id: 'rweb-p-07',
      title: 'Researching novel vulnerabilities',
      read: `The deepest skill is finding *new* vulnerability classes and techniques — the research that produced SSRF-to-metadata, request smuggling, prototype pollution, and every technique you've learned. Even if you never publish a novel class, thinking like a researcher makes you find bugs others miss.

## Where new vulnerability classes come from

Novel research usually comes from a few reliable lenses:

- **Question an assumption everyone makes.** Request smuggling came from asking "what if the front-end and back-end *disagree* about request length?" — challenging the assumption that all parsers agree. Ask what the whole industry takes for granted, then test if it's actually true.
- **Look where two systems meet.** Parser differentials (the last step's frontier): wherever two components parse the same input — proxy/server, sanitizer/browser, validator/fetcher, two encoders — a disagreement may hide. Boundaries between systems are bug-rich.
- **Study a technology deeply, then abuse its features.** Prototype pollution came from understanding JavaScript's prototype chain; SSTI from template engines; deserialization from language internals. Deep knowledge of *how something works* reveals how it breaks.
- **Generalise a one-off.** A weird bug in one app may be an instance of a class present everywhere. Ask "is this a general pattern?"
- **Combine known ideas in a new context.** Apply an old technique to new tech (an injection idea to GraphQL, a smuggling idea to HTTP/2).

## The research process

- **Read deeply** — specs (RFCs), source code, documentation, and prior research. Novel work builds on understanding what exists.
- **Experiment** — build a lab, try things, observe unexpected behaviour. Curiosity about "why did it do *that*?" drives discovery.
- **Model the system** — draw the trust boundaries, the parsers, the assumptions; look for where they can be violated.
- **Automate the hunt** — fuzzing, differential testing (send the same input to two parsers and diff), and large-scale scanning surface anomalies to investigate.
- **Verify and generalise** — confirm the bug, then determine its scope: one app, one library, or a whole class across the ecosystem.

## Why it matters even if you never publish

The research mindset — questioning assumptions, probing boundaries, understanding deeply — is exactly what finds *hard* bugs in *any* engagement. Tools and checklists encode *known* attacks; research thinking finds what's not on the list. It's the difference between a tester who runs the playbook and one who writes it.

## The ethical frame (unchanged, and it scales)

Research is done on systems you own, deliberately vulnerable targets, or with authorization; novel findings against real software go through **responsible disclosure** (next step). You research to *improve security* — new classes get defended once understood. In the lab, take one technology (a parser, a protocol, a framework feature), study it deeply, and probe an assumption about it — practising the researcher's core loop.`,
      sample: {
        lang: 'text',
        caption: 'The lenses that reveal novel vulnerability classes',
        code: `QUESTION AN ASSUMPTION   "what if front-end/back-end DISAGREE on
                         request length?" -> request smuggling
TWO SYSTEMS MEET         parser differentials: proxy/server,
                         sanitizer/browser, validator/fetcher
STUDY DEEPLY, THEN ABUSE prototype chain -> prototype pollution;
                         templates -> SSTI; language -> deserialization
GENERALISE A ONE-OFF     is this weird bug a whole CLASS?
COMBINE IN NEW CONTEXT   old technique + new tech (h2, GraphQL)

PROCESS: read specs/source -> experiment in a lab -> model trust/
parsers -> automate (fuzz/differential) -> verify + generalise.`,
        output: `Research finds NEW classes (SSRF-metadata, smuggling, prototype
pollution) by questioning assumptions, probing where two systems
meet, and understanding tech deeply. Even unpublished, this mindset
finds HARD bugs any tool/checklist misses - you write the playbook,
not just run it. Ethics unchanged: own/authorized; disclose responsibly.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'HTTP request smuggling was discovered by asking "what if the front-end and back-end disagree about where a request ends?" What research lens does this exemplify?',
        options: [
          'Running an automated scanner until it reports something',
          'Questioning an assumption the whole industry takes for granted (here, that all parsers in a chain agree) and testing whether it is actually true — one of several research lenses, alongside probing where two systems meet, studying a technology deeply then abusing its features, generalising a one-off, and combining known ideas in a new context',
          'Memorising the OWASP Top 10 more thoroughly',
          'Waiting for a vendor to publish a CVE',
        ],
        answer: 1,
        explain:
          'Request smuggling is a classic example of novel research through questioning an assumption everyone makes. The industry implicitly assumed that every server in a request chain parses message boundaries the same way; the research asked "what if they don’t?" and tested it, revealing a whole vulnerability class from the parser disagreement. This is one of the reliable research lenses: question a universal assumption, probe boundaries where two systems parse the same input (parser differentials), study a technology deeply enough to abuse its features (as with prototype pollution or SSTI), generalise a one-off oddity into a class, and combine known techniques in new contexts (e.g. smuggling in HTTP/2). The process is read deeply, experiment in a lab, model the trust boundaries and parsers, automate the hunt with fuzzing/differential testing, then verify and generalise. This mindset finds hard bugs that scanners and checklists — which only encode known attacks — never will, and it is done ethically on owned/authorized targets with responsible disclosure.',
        hint: 'The discovery came from doubting something everyone assumed was always true — what is that lens called?',
      },
    },

    {
      id: 'rweb-p-08',
      title: 'Bug bounty as a discipline',
      read: `**Bug bounty** programs let you legally test real, in-scope applications and get paid for valid findings. It's where many pros apply their skills on real targets — and doing it well is a discipline of its own, built on everything in this track plus professional rigour.

## What bug bounty is

Companies (via platforms like HackerOne, Bugcrowd, Intigriti, or self-hosted programs) publish a **scope** and **rules**, and invite researchers to find and report vulnerabilities in exchange for rewards (bounties) and recognition. It is **authorized testing of real systems** — the permission comes from the published program terms, which define exactly what you may test and how. **Stay rigorously within scope**: testing out-of-scope assets, using prohibited techniques (often: no automated scanning, no DoS, no social engineering, no testing other users' data), or violating the rules is unauthorized — the same legal line as ever. The program's scope *is* your authorization; read it carefully and obey it.

## Why it rewards the whole track

- **Recon wins** — as in the enumeration lessons, most bounties come from the *forgotten surface*: subdomains, old endpoints, hidden parameters, new acquisitions. Deep, continuous recon is the top hunters' edge.
- **Depth and chaining** — programs are tested by many people, so surface bugs are found fast; the rewards go to those who go *deeper* (the advanced/skilled classes) and *chain* modest bugs into critical impact.
- **Understanding the target** — business logic and access-control flaws (which need understanding, not payloads) are high-value and scanner-invisible.
- **Persistence and specialisation** — many hunters specialise (a class like SSRF, a tech like GraphQL, a target type) and revisit programs as they change.

## Professional rigour

- **Read scope and rules first, every time.** They are your authorization boundary.
- **Report well** — a clear, reproducible, well-impacted report (exactly the reporting skill from earlier) gets triaged and paid faster; a vague one gets rejected. Include exact steps, impact, and least-intrusive proof.
- **Don't cause harm** — minimal proof, no real user data, respect availability, and stop and report immediately if you access something sensitive.
- **Duplicates and disclosure** — expect duplicates (someone reported it first); follow the program's disclosure policy (usually coordinated, not public until fixed).

## Why it's a legitimate, valuable path

Bug bounty channels offensive skill into improving real software, legally and ethically — the entire philosophy of this track, at scale, on real targets, with the company's blessing. It's also how many people build a career and reputation. The boundary that opened this track is the same one that makes bug bounty legitimate: **explicit permission** — here, the published scope. In the lab-to-real transition, study a real program's scope and rules, and note exactly what it does and does not authorize.`,
      sample: {
        lang: 'text',
        caption: 'Bug bounty: authorized real-world testing, within scope',
        code: `PROGRAM publishes SCOPE + RULES = your AUTHORIZATION.
  in scope: *.example.com, the mobile API
  OUT of scope: third-party services, staging, physical, social eng.
  rules: no automated scanning / no DoS / no other users' data
  -> testing outside this = UNAUTHORIZED (same legal line as ever)

WHAT WINS: deep RECON (forgotten surface) + DEPTH/CHAINING (surface
bugs go fast) + business-logic/access-control (understanding) +
persistence/specialisation. Report clearly; least-intrusive; no harm.`,
        output: `Bug bounty = paid, authorized testing of REAL apps; the published
SCOPE is the permission - read it, obey it. Rewards go to recon
depth, advanced classes, and chaining (surface bugs are found
fast). Rigor: scope first, great reports, no harm, coordinated
disclosure. The track's ethic (explicit permission) at real scale.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In bug bounty, what constitutes your authorization to test, and where do the meaningful rewards typically come from?',
        options: [
          'Any public website is fair game; rewards come from volume of low findings',
          'The program’s published scope and rules are your authorization (testing outside them is unauthorized, the same legal line as ever), and meaningful rewards typically come from deep recon of the forgotten surface, advanced vulnerability classes, chaining modest bugs into critical impact, and understanding-driven flaws like business logic — since surface bugs are found fast by many hunters',
          'A signed contract is required for every individual request',
          'Rewards come only from automated scanning of the main page',
        ],
        answer: 1,
        explain:
          'A bug bounty program’s published scope and rules are exactly your authorization — they define which assets you may test and which techniques are permitted (commonly excluding automated scanning, DoS, social engineering, and accessing other users’ data). Testing outside that scope or breaking the rules is unauthorized access, the identical legal line that has governed the entire track; the difference from illegal hacking is precisely that explicit permission. As for rewards, because programs are tested by many researchers, easy surface bugs are found and reported quickly (and often come back as duplicates), so the meaningful bounties go to those who do deep, continuous recon of the forgotten attack surface (subdomains, old endpoints, hidden parameters), who apply the advanced/skilled vulnerability classes, who chain modest issues into critical impact, and who find understanding-driven flaws like business logic and access control that scanners cannot see. It rewards the whole track plus professional reporting and no-harm rigor — not volume, blanket permission, or scanning the front page.',
        hint: 'What document grants permission, and given many hunters compete, what kind of work earns the real payouts?',
      },
    },

    {
      id: 'rweb-p-09',
      title: 'Automation and scaling responsibly',
      read: `At the pro level you test *breadth* — many endpoints, many targets (in scope), continuously — which demands **automation**. Doing it powerfully *and* responsibly is a discipline: automation multiplies both your reach and your capacity to cause harm.

## What to automate

- **Recon at scale** — continuous subdomain enumeration, endpoint/parameter discovery, tech fingerprinting, and change detection across a large scope. Bug bounty and large engagements live on this; new assets and changes are where fresh bugs appear.
- **Templated checks** — nuclei-style templates or custom scripts to test many hosts for known issues, misconfigurations, exposed files, and specific vulnerability signatures.
- **Differential and fuzzing pipelines** — send crafted inputs at scale and flag anomalies (for research and for finding injection/parser bugs).
- **Monitoring** — watch a large scope for new subdomains, new endpoints, changed responses, or newly-exposed assets, and alert you to investigate.

The pro pattern is **automate breadth to focus human attention** on the judgement-heavy work (logic flaws, chaining, verifying) that automation can't do.

## The responsibility (this is the crux)

Automation can easily cause harm or cross lines, so it demands restraint:

- **Stay in scope, automatically** — your tooling must *enforce* scope (only touch authorized hosts); a misconfigured scan hitting out-of-scope or third-party assets is unauthorized activity, and automation makes that mistake at scale and speed.
- **Respect rules and rate limits** — many programs *prohibit* automated scanning or limit it; honor that. Even when allowed, **rate-limit** so you don't degrade the target (aggressive automation is a self-inflicted DoS and a violation).
- **No destructive automation** — never automate actions that modify/delete data, submit forms with real effects, or affect other users. Automate *detection*, not *exploitation of side effects*.
- **Verify before reporting** — automated findings are leads with false positives (as always); a human confirms each before it's a finding. Flooding a program with unverified scanner output is unprofessional and often against the rules.
- **Handle data responsibly** — automation can hoover up sensitive data; design it not to, and handle anything it does per scope.

## The false-positive and noise problem

Scaling amplifies noise: more results, more false positives, more duplicates. The skill is **tuning signal-to-noise** — precise checks, good filtering, and human triage — so automation *helps* rather than burying you (and the program) in junk.

## Why responsible scaling is the pro standard

Anyone can point a scanner at everything; a pro scales *precisely and safely* — enforcing scope, respecting targets, verifying results, and never causing harm — turning automation into leverage without turning it into a liability. It's the same ethic as the whole track (authorization, no harm), applied to tooling that operates faster than you can watch. In the lab, build a small, scope-enforcing recon/monitoring pipeline for a target you own, with rate limiting and human-verify steps.`,
      sample: {
        lang: 'text',
        caption: 'Scale breadth to focus human attention — safely',
        code: `AUTOMATE (breadth):            KEEP HUMAN (judgement):
  continuous recon/monitoring    logic flaws, chaining
  templated checks (nuclei)      verifying each finding
  fuzzing/differential pipelines interpreting anomalies

RESPONSIBLY (automation harms at scale + speed):
  ENFORCE scope in tooling (only authorized hosts)
  respect rules + RATE-LIMIT (aggressive scan = self-DoS + violation)
  automate DETECTION, never destructive actions / others' data
  VERIFY before reporting (false positives); tune signal-to-noise`,
        output: `Pro tests breadth -> automate recon/checks/monitoring to FOCUS
human attention on judgement. But automation multiplies HARM:
enforce scope in the tooling, respect rules + rate-limit (no
self-DoS), detection-not-destruction, verify before reporting.
Scale PRECISELY + SAFELY = leverage without liability. Same ethic,
faster tooling.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does automation at scale demand extra restraint, and what is the responsible pattern?',
        options: [
          'Automation is risk-free, so no restraint is needed',
          'Because automation multiplies both reach and the capacity for harm at speed — a misconfigured scan can hit out-of-scope assets or degrade a target (a self-inflicted DoS/violation) — so the responsible pattern enforces scope in the tooling, respects rules and rate limits, automates detection not destructive actions, and verifies findings before reporting, using automation for breadth to focus human attention on judgement',
          'The responsible pattern is to scan everything as fast as possible',
          'Automation removes the need to stay in scope',
        ],
        answer: 1,
        explain:
          'Automation is leverage: it lets a pro test breadth — continuous recon, templated checks, fuzzing, monitoring across a large scope — which is where fresh bugs appear. But that same speed and reach multiply the potential for harm: a misconfigured scanner can touch out-of-scope or third-party assets (unauthorized activity at scale) or overwhelm a target (an accidental denial of service and a rules violation). So the responsible pattern is to enforce scope within the tooling itself (only authorized hosts), respect program rules and rate limits (many programs prohibit or cap automated scanning), automate detection rather than destructive actions or anything touching other users’ data, verify each automated finding before reporting (false positives abound), and tune signal-to-noise — all to use automation for breadth while reserving human attention for judgement-heavy work like logic flaws and chaining. It is the same authorization-and-no-harm ethic as the whole track, applied to tooling that runs faster than you can watch. Automation never removes scope obligations.',
        hint: 'Automation runs faster than you can watch — what can a misconfigured scan do at scale, and what safeguards prevent it?',
      },
    },

    {
      id: 'rweb-p-10',
      title: 'Vulnerability research and disclosure',
      read: `When research finds a vulnerability in real software — a library, a framework, a product — the work isn't done until it's **responsibly disclosed** and fixed. Disclosure is the ethical and professional core of security research, and getting it right is a pro skill.

## Coordinated (responsible) disclosure

The standard model:

1. **Report privately to the vendor** — give them the details (clear reproduction, impact, affected versions) through their security contact (security.txt, a security email, or a bug bounty/VDP channel).
2. **Give them reasonable time to fix** — a disclosure deadline (often ~90 days, adjustable for severity/complexity) balances giving the vendor time against not leaving users exposed indefinitely.
3. **Coordinate public disclosure** — after a fix is available (or the deadline passes), publish details so defenders can protect themselves and the community learns. Often a **CVE** is assigned to track it.

The goal throughout: **get it fixed with minimal risk to users.** You never weaponise the bug against systems you don't own, never sell it to be used maliciously, and never dump details publicly before a fix when that would endanger users.

## Why this model exists (the tension it balances)

- **Full/immediate public disclosure** pressures vendors to fix fast but arms attackers before users can patch.
- **Silence** leaves the bug unfixed and users at risk, and lets others rediscover and exploit it.
- **Coordinated disclosure** threads the needle: private report + a deadline (so vendors can't ignore it forever) + eventual publication (so the community benefits). It's the widely-accepted professional norm.

## Doing it well

- **Write a great report** — the same rigor as any finding: clear, reproducible, honest about impact, professional in tone. Vendors respond better to good reports.
- **Be patient but firm** — work with the vendor; use a reasonable deadline; escalate through a CERT/coordinator if a vendor is unresponsive or hostile.
- **Follow program/legal terms** — a VDP or bug bounty defines the safe-harbor terms; some jurisdictions still have legal risk for research, so know the landscape and prefer programs with clear safe harbor.
- **Get credit, build reputation** — coordinated disclosure with a CVE and a good write-up advances your reputation and the field's knowledge — the positive-sum outcome.

## Why disclosure is the point

This closes the loop the whole track has been about: **offensive skill exists to improve security.** A researcher who finds a bug and gets it fixed — quietly, coordinated, minimising user risk — makes everyone safer. Disclosure done right is where "attacker skills" become unambiguously defensive. In the lab-to-real transition, read a real vendor's security policy / security.txt and a well-written public disclosure, and note how the coordinated process protected users.`,
      sample: {
        lang: 'text',
        caption: 'Coordinated disclosure balances vendor time and user safety',
        code: `1 REPORT PRIVATELY  -> vendor security contact (security.txt / VDP)
     clear repro + impact + affected versions
2 GIVE TIME TO FIX  -> a deadline (~90 days, adjust for severity)
3 COORDINATE PUBLIC -> after a fix (or deadline); often a CVE

BALANCES:
  full immediate disclosure -> arms attackers before users patch
  silence                   -> bug unfixed, users at risk
  COORDINATED               -> private report + deadline + publish

NEVER: weaponise vs others, sell for misuse, dump pre-fix + endanger.`,
        output: `Research isn't done until responsibly DISCLOSED: report privately,
give reasonable time (deadline), coordinate public release after a
fix (CVE). Goal: fixed with MINIMAL user risk. This closes the
track's loop - offensive skill exists to improve security; done
right, disclosure is where attacker skills become defensive.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is coordinated (responsible) disclosure the professional norm for a vulnerability found in real software?',
        options: [
          'Because it lets the researcher exploit the bug for as long as possible',
          'Because it balances the competing risks — reporting privately with a reasonable fix deadline pressures the vendor to fix without ignoring it, and public release only after a fix (often with a CVE) lets defenders and the community benefit — all aimed at getting the bug fixed with minimal risk to users',
          'Because it requires publishing full exploit details immediately to force a fast fix',
          'Because it means never telling anyone about the bug',
        ],
        answer: 1,
        explain:
          'Coordinated disclosure threads the needle between two bad extremes. Immediate full public disclosure would pressure a fast fix but arm attackers before users can patch; staying silent leaves the bug unfixed and users exposed while others may rediscover it. The coordinated model reports the vulnerability privately to the vendor with clear reproduction, impact, and affected versions, gives a reasonable deadline (commonly around 90 days, adjusted for severity) so the vendor cannot ignore it indefinitely, and then publishes details after a fix is available (or the deadline lapses), often with a CVE, so defenders and the community can protect themselves and learn. The overriding goal is to get the bug fixed with minimal risk to users — never weaponising it against systems you don’t own, selling it for misuse, or dumping details pre-fix in a way that endangers people. This closes the track’s central loop: offensive skill exists to improve security, and responsible disclosure is where it unambiguously becomes defensive.',
        hint: 'It is neither immediate full disclosure nor silence — what does it balance, and toward what goal?',
      },
    },

    {
      id: 'rweb-p-11',
      title: 'The complete picture: offence for defence',
      read: `Step back and see the whole. Across five levels you learned to map apps, find and exploit XSS, SQLi, and every injection, break access control and authentication, attack sessions and CSRF, exploit SSRF, XXE, deserialization, SSTI, races, smuggling, cache poisoning, OAuth/SAML and client-side flaws, chain them into critical impact, and understand the browser and HTTP internals beneath it all. **Every bit of it exists to make web applications stronger.** Pro is where that stops being a slogan and becomes how you work.

## What the depth gives the defender

- Because you understand **the browser security model**, your finding isn't "CORS bug" but "\`Access-Control-Allow-Origin\` reflects the Origin with credentials — an unbounded SOP relaxation; restrict to an exact allowlist."
- Because you understand **injection theory**, your finding isn't "XSS" but "input reaches the HTML parser unencoded in an attribute context; apply context-aware output encoding here, and a strict nonce-based CSP as defence in depth."
- Because you understand **HTTP internals**, your finding isn't "smuggling" but "the front-end forwards TE while the back-end uses CL on a reused connection — a CL.TE desync; deploy end-to-end HTTP/2 or reject ambiguous framing."
- Because you can **review source**, your finding is a file, a line, the missing check, the exact fix, and the SAST rule to catch it next time.

## The mindset

A pro web tester is the **best possible teacher for the developers**. You prove what's exploitable, exactly how — down to the parser and the packet — and exactly what closes it: in the code, in the config, in the architecture. You do it inside authorization (or a program's scope), handle sensitive data carefully, cause no harm, and write for two audiences: the business (risk) and the developers (actionable fixes).

## Where to keep going

Web security never stands still: new frameworks, new protocols (HTTP/3), new client-side APIs, new auth models, serverless and edge, and new research every week. Stay curious, keep a lab, hunt in scope, research and disclose responsibly, and keep the boundary you started with — owned or authorized targets — as the fixed point around which all of it turns. That boundary is not a limit on the skill; it is what makes the skill a profession, and what makes everything you've learned a force for making the web safer. The final step is your research-grade capstone.`,
      sample: {
        lang: 'text',
        caption: 'From deep understanding to a fixable finding',
        code: `UNDERSTANDING              FINDING THE DEVELOPER CAN ACT ON
browser security model     exact SOP/CORS/CSP misconfig + the fix
injection theory           the parser + context + context-aware fix
HTTP internals             the precise desync + framing fix
source review              file:line + missing check + fix + SAST rule

Offence proves it. The stronger, safer application is the deliverable.
Two audiences: business (risk) + developers (actionable fixes).`,
        output: `A pro web tester is the developers' best teacher: proves what's
exploitable, exactly how (to the parser/packet), and exactly what
closes it - code, config, architecture. Inside authorization/scope,
no harm, careful with data, written for business AND developers.
Offence is the means; a safer web is the end.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the defining characteristic of a *professional* pro-level web engagement, as opposed to simply achieving compromise?',
        options: [
          'Achieving the most impressive exploit regardless of scope',
          'Translating each proven technique into a precise, mechanism-level finding a developer can implement — the exact parser/context/desync/config and the fix (down to file:line and a SAST rule) — done inside authorization or program scope, with no harm and careful data handling, and written for both business and developer audiences',
          'Compromising the maximum number of applications quickly',
          'Keeping the techniques secret so the client cannot reproduce them',
        ],
        answer: 1,
        explain:
          'Achieving compromise is the easy part; the professional value is the translation into something the organisation can act on. Because a pro understands the browser security model, injection theory, HTTP internals, and source review, each proven technique becomes a precise, mechanism-level finding with a concrete fix — the exact SOP/CORS/CSP misconfiguration and its correction, the specific parser and context and the context-aware encoding to apply, the exact CL.TE desync and framing remedy, or the file and line with the missing check and the SAST rule to catch it next time. It is delivered inside authorization or a program’s published scope, causes no harm (least-intrusive proofs, no real data exfiltrated), handles any sensitive data responsibly, and is written for two audiences: the business (risk) and developers (actionable fixes). Offence is the means; a stronger, safer web application is the end — the theme the entire track was built to teach.',
        hint: 'Compromise is the start — what makes the work worth paying for is what you hand back, at what precision, and to whom.',
      },
    },

    {
      id: 'rweb-p-12',
      title: 'Project: research-grade web assessment',
      read: `Your pro capstone — and the final project of the offensive web track — is a **research-grade assessment**: not just finding bugs, but explaining them at the deepest level (parser, protocol, security model), building any tooling you need, reviewing source where available, and delivering a developer- and researcher-grade report. Do it on an app you own, a deliberately vulnerable target, or a program that authorizes you.

## The brief

Take a substantial target (a vulnerable app you run with source available — Juice Shop is open-source, so you can go white-box; or a real bug-bounty target strictly in scope). Assess it end to end *with pro depth*: mechanism-level understanding, custom tooling, source review, and (if novel) research and disclosure.

## What to produce (a report; hands-on where possible)

1. **Scope & authorization** — the target, the boundary (ownership / vulnerable-by-design / program scope), and the rules you followed.
2. **Findings at mechanism depth** — for each vulnerability, explain it at the deepest level: the parser/context (injection), the security-model boundary (client-side), the protocol framing (HTTP), or the exact code path (from source review) — not just the class name.
3. **A tooling artifact** — a Burp extension, script, or nuclei template you built to find or verify something (show the automatable core of a bug).
4. **A source-review component** — trace at least one bug from source to sink in the code, giving file/line, the root cause, and the exact fix (plus the SAST rule that would catch it).
5. **A chain** — connect findings into critical impact, told as a narrative.
6. **Remediation** — for each finding and the chain, precise fixes (code, config, architecture), prioritised; and, where relevant, the detection/prevention a defender should add.
7. **(If applicable) a disclosure plan** — if you found something in real software, how you'd responsibly disclose it.

## The standard

If a developer who has never met you could read your report and (a) understand *why* each bug works at the parser/protocol/security-model level, (b) reproduce it, and (c) implement your exact fixes — and if a security team could adopt your tooling/rules to catch these next time — you've hit the pro standard. That is the whole point of everything you've learned: **to make the applications you assess stronger than you found them.** Keep it authorized, keep it curious, and keep going — the web will keep giving you more to understand, and the boundary you started with will keep it a profession.`,
      sample: {
        lang: 'text',
        caption: 'The research-grade web report skeleton',
        code: `1 Scope & authorization  own / vulnerable-by-design / program scope
2 Findings at MECHANISM depth  parser+context / security-model
                          boundary / HTTP framing / exact code path
3 Tooling artifact        a Burp ext / script / nuclei template you built
4 Source review           >=1 bug source->sink: file:line + fix + SAST rule
5 Chain                   findings -> critical impact, as a narrative
6 Remediation             precise fixes (code/config/arch), prioritised
7 Disclosure plan         if found in real software (coordinated)

Standard: a dev understands WHY (parser/protocol/model), reproduces
it, applies the fixes; a security team adopts your tooling/rules.`,
        output: `Passing bar: the report explains each bug at parser/protocol/
security-model depth, includes tooling you built and a source->sink
review with file:line + fix, chains to critical impact, and gives
precise prioritised remediation - so the app ends up stronger than
you found it. Authorized, curious, done. Keep going.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the pro capstone, the research-grade web assessment?',
        options: [
          'Finding the single highest-severity bug as fast as possible',
          'That a developer who has never met you could understand why each bug works at the parser/protocol/security-model level, reproduce it, and apply your exact fixes — and a security team could adopt the tooling/rules you built to catch these next time — with a source-to-sink review, a chain to critical impact, and prioritised remediation, all on an authorized target',
          'Using every tool and technique in the track at least once',
          'Keeping the exploitation details out of the report for security',
        ],
        answer: 1,
        explain:
          'The pro capstone is about depth and deliverability, not speed or breadth of tools. The bar is that an unfamiliar developer can, from your report alone, understand the deepest-level mechanism of each vulnerability (the parser and context for injections, the security-model boundary for client-side issues, the protocol framing for HTTP attacks, or the exact code path from source review), reproduce it, and implement your precise fixes — and that a security team could adopt the tooling artifact (a Burp extension, script, or nuclei template) and SAST rules you produced to catch these issues next time. It includes tracing at least one bug source-to-sink in code with file/line and fix, chaining findings into critical impact as a narrative, and prioritised remediation across code, config, and architecture — with a responsible disclosure plan if the target is real software. Achieving that means the assessment served its true purpose: the application ends up stronger than you found it. It is done only on an app you own, a deliberately vulnerable target, or a program that authorizes you — the boundary that makes the whole skill a profession.',
        hint: 'Speed and tool count are not it — think about what a developer and a security team can each do with your report, and at what depth.',
      },
    },
  ],
}

export default level
