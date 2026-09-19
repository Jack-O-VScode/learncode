import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'The deep end: advanced web attack and defence',
  summary:
    'The frontier of web security: deserialization and template injection, prototype pollution, HTTP request smuggling and cache poisoning, DOM clobbering and client-side prototype attacks, browser isolation policies, supply-chain attacks on the front end, advanced API and GraphQL risks, bug bounty and disclosure, and running an application security program.',
  outcomes: [
    'Defend deserialization, SSTI and prototype pollution',
    'Understand request smuggling and web cache poisoning',
    'Apply modern browser isolation policies beyond the SOP',
    'Secure the front-end supply chain with SRI and Trusted Types',
    'Run vulnerability disclosure and bug bounty effectively',
    'Lead and measure an application security program',
  ],
  steps: [
    {
      id: 'bweb-p-01',
      title: 'Insecure deserialization',
      read: `**Serialization** converts an object into bytes for storage or transmission; **deserialization** rebuilds it. When an application deserializes **untrusted** data using a format that can reconstruct arbitrary objects, the attacker can often achieve **remote code execution** — one of the most severe web vulnerabilities.

## Why it leads to code execution

Native serialization formats (Java's, .NET's \`BinaryFormatter\`, Python's \`pickle\`, PHP's \`unserialize\`, Ruby's Marshal) don't just carry data — they encode **which classes to instantiate** and can trigger methods during reconstruction (constructors, \`__wakeup\`/\`__destruct\` in PHP, \`readObject\` in Java, \`__reduce__\` in pickle).

The attacker does not need a vulnerable class in *your* code: they build a **gadget chain** from classes already present in your application or its libraries, stringing together ordinary methods that, when invoked during deserialization, ultimately execute a command. Tools like **ysoserial** (Java) and **ysoserial.net** produce these chains for common libraries, so exploitation is often turnkey. Notably, the payload runs **before** your application logic ever validates the object.

## Where untrusted serialized data appears

Cookies and session data, hidden form fields, API parameters, cache and message-queue entries, file uploads, and any inter-service communication — often base64-encoded, which is why it can be overlooked.

## The defences

1. **Never deserialize untrusted data with a format that can instantiate arbitrary types.** This is the real fix. If you control both ends, use a **data-only format** — JSON, Protocol Buffers, MessagePack — parsed into known types, so the input describes values, not classes to construct.
2. If a native format is unavoidable, **restrict types with an allow-list** (Java's \`ObjectInputFilter\`, .NET's serialization binder) so only the expected classes can be reconstructed. Deny-listing known gadget classes fails, because new chains are found continually.
3. **Sign or encrypt** serialized data you hand to a client, with a key only the server holds, and verify the signature *before* deserializing — so tampered objects are rejected without ever being reconstructed.
4. **Keep libraries current** — gadget chains live in dependencies, and updates remove known ones.
5. **Run with least privilege**, so successful execution yields as little as possible.

## The modern echo: JSON is safer, not magic

JSON parsing is data-only and does not instantiate arbitrary classes, which is why moving to it removes this class of bug. But beware framework features that **map JSON onto polymorphic types** (type hints in the document choosing a class) — these reintroduce exactly the same problem, as a series of Jackson and .NET vulnerabilities demonstrated. Disable polymorphic type handling unless it is essential and tightly constrained.

The principle: **data should describe values, never which code to run.** Deserialization violates that principle whenever the format lets the input choose types.`,
      sample: {
        lang: 'python',
        caption: 'A format that instantiates types vs. a data-only format',
        code: `# DANGEROUS - pickle reconstructs objects and can invoke code
data = pickle.loads(base64.b64decode(request.cookies["prefs"]))
# an attacker's payload defines __reduce__ -> os.system("...")
# executed BEFORE any of your validation runs

# SAFE - JSON is data-only; parse into known types yourself
raw = json.loads(request.cookies["prefs"])        # values, not classes
prefs = Prefs(theme=str(raw.get("theme", "light")),
              page_size=int(raw.get("page_size", 25)))

# If you must hand serialized state to a client, SIGN it and
# verify the signature BEFORE deserializing.`,
        output: `Native serialization formats encode WHICH CLASSES to build and
can invoke methods while rebuilding, so untrusted input becomes
remote code execution via gadget chains already in your
dependencies. Fix: use data-only formats (JSON/protobuf) parsed
into known types; otherwise allow-list types and sign the data.
Beware JSON polymorphic type handling - it reintroduces the flaw.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can insecure deserialization lead to remote code execution even when the application contains no obviously vulnerable code?',
        options: [
          'Because the deserializer always executes shell commands',
          'Because native serialization formats let the input specify which classes to instantiate and can invoke methods during reconstruction, so an attacker chains together ordinary "gadget" classes already present in the app or its libraries — and the chain runs before any application validation',
          'Because deserialization disables the type system permanently',
          'Because JSON parsers execute embedded JavaScript',
        ],
        answer: 1,
        explain:
          'The vulnerability comes from the format’s expressiveness, not from a flawed line in your code. Formats like Java serialization, .NET BinaryFormatter, pickle and PHP unserialize encode type information and trigger lifecycle methods while rebuilding objects, so an attacker can assemble a chain of perfectly ordinary classes from your dependencies whose combined side effects execute a command. Ready-made chains exist for common libraries, and the payload fires during reconstruction — before your logic inspects the object. Using a data-only format parsed into known types removes the capability the attack depends on.',
        hint: 'What does the serialized data get to decide, beyond values — and when does that happen relative to your validation?',
      },
    },

    {
      id: 'bweb-p-02',
      title: 'Server-side template injection',
      read: `Template engines (Jinja2, Twig, Freemarker, Velocity, Handlebars, ERB) render dynamic pages by evaluating expressions inside templates. **Server-side template injection (SSTI)** occurs when user input becomes part of the **template itself** rather than being passed in as data — and because templates can evaluate expressions, that usually escalates to **remote code execution**.

## The distinction that matters

\`\`\`
render_template_string("Hello " + name)     # input is TEMPLATE  -> SSTI
render_template("hello.html", name=name)    # input is DATA      -> safe
\`\`\`

In the first case the engine parses the attacker's text looking for expressions, so \`{{7*7}}\` renders as \`49\` — the classic detection probe. From there, attackers navigate the language's object graph to reach system functions (in Python, via attributes like \`__class__\` and \`__subclasses__\`; in Java engines, via reflection to \`Runtime.exec\`) and execute commands.

Note this is **not** XSS: XSS executes in the victim's browser, while SSTI executes **on your server**, making it far more severe.

## Where it creeps in

Email and notification templates that users can customise, report and document generators, CMS or "low-code" features offering template snippets, error messages built by concatenating input into a template string, and any place a developer reached for the "render this string" API for convenience.

## Defences

1. **Never build a template from user input.** Pass input as **context variables** to a fixed, developer-authored template. This eliminates the class outright and is almost always achievable.
2. **If users must supply templates**, use a **logic-less or sandboxed engine** with a restricted expression set (something closer to Mustache than Jinja2), and treat the sandbox as a best-effort boundary — many template sandboxes have been escaped, so pair it with isolation.
3. **Isolate the rendering** — run user-supplied template rendering in a separate, least-privileged, network-restricted process or container, so an escape yields little.
4. **Keep engines patched** — sandbox escapes are found regularly.

## The same shape client-side

Client-side template engines and frameworks have an analogous issue: interpolating user input into a template compiled in the browser yields **client-side template injection**, which becomes XSS (and in older AngularJS, sandbox escapes gave full script execution). The rule is identical: input is **data bound into a template**, never part of the template.

SSTI is a striking example of the level's recurring theme — **data must never become code**. Injection puts data into a query, XSS puts it into a page, SSTI puts it into a template; each time, the fix is structural separation rather than filtering.`,
      sample: {
        lang: 'python',
        caption: 'Input as template (RCE) vs. input as data (safe)',
        code: `# VULNERABLE - the input becomes part of the TEMPLATE
@app.get("/hello")
def hello():
    name = request.args.get("name", "")
    return render_template_string("<h1>Hello " + name + "</h1>")

#   ?name={{7*7}}                  -> renders "Hello 49"   (SSTI confirmed)
#   ?name={{ <object-graph walk to os> }}  -> command execution ON THE SERVER

# SAFE - fixed template, input passed as a variable (and auto-escaped)
@app.get("/hello")
def hello():
    return render_template("hello.html", name=request.args.get("name", ""))`,
        output: `SSTI = user input parsed as TEMPLATE, so the engine evaluates
the attacker's expressions - on the SERVER (unlike XSS), usually
reaching RCE through the language's object graph. Fix: pass input
as context VARIABLES into fixed templates; if users must supply
templates, use a logic-less/sandboxed engine and isolate the
renderer. Same theme: data must never become code.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does server-side template injection differ from cross-site scripting, and why does that make it more severe?',
        options: [
          'They are the same vulnerability with different names',
          'XSS executes attacker script in a victim’s browser, whereas SSTI causes the template engine to evaluate attacker expressions on the server — typically escalating to remote code execution on your infrastructure rather than compromise of one user’s session',
          'SSTI only affects static HTML pages',
          'XSS runs on the server and SSTI runs in the browser',
        ],
        answer: 1,
        explain:
          'The two share a root cause — untrusted data being treated as code — but differ in where the code runs. XSS payloads execute in the victim’s browser within your origin, so the impact is bounded by what that user can do (session theft, actions as them). SSTI has the server’s template engine evaluate the attacker’s expressions, and template languages typically expose enough of the runtime to reach system functions, so it generally means command execution on your server with the application’s privileges. That difference in blast radius is why SSTI is treated as a critical finding.',
        hint: 'Whose machine evaluates the attacker’s expression in each case?',
      },
    },

    {
      id: 'bweb-p-03',
      title: 'Prototype pollution',
      read: `**Prototype pollution** is a JavaScript-specific class of vulnerability that exploits the language's inheritance model. It is subtle, widespread in the npm ecosystem, and can escalate to denial of service, property injection, XSS, or remote code execution in Node.js.

## The mechanism

In JavaScript, objects inherit from a prototype, and almost everything inherits from \`Object.prototype\`. If an attacker can set a property on that shared prototype — typically by getting the application to assign to a key named \`__proto__\`, \`constructor\` or \`prototype\` — then **every object in the application** suddenly appears to have that property.

The vulnerable pattern is any code that copies attacker-controlled keys into an object without checking them: naive recursive merge/extend/clone functions, \`set\`-by-path helpers, and query-string or JSON parsers that build nested objects. Many popular libraries have shipped this bug.

## Why polluting a prototype is dangerous

The injected property is then read by code that never expected it:

- **Logic subversion** — polluting \`isAdmin\` or \`role\` means a later \`if (user.isAdmin)\` check reads the inherited value on an object that never had it set. Access control silently flips.
- **Denial of service** — overwriting a widely used property or method crashes the application.
- **XSS** — polluting a property that a client-side framework or sanitizer consults (an options object, a template setting) can turn safe rendering unsafe.
- **RCE in Node.js** — polluting properties consulted by child-process spawning or template compilation has produced real remote code execution chains.

The hallmark is that the *exploited* code is often correct and far away from the vulnerable merge — which makes this hard to spot in review.

## Defences

1. **Reject dangerous keys** — explicitly ignore \`__proto__\`, \`constructor\` and \`prototype\` when copying attacker-controlled keys.
2. **Use null-prototype objects** (\`Object.create(null)\`) for maps built from untrusted keys, so there is no prototype to pollute, or use **\`Map\`**, which is designed for arbitrary keys and is immune.
3. **Freeze the prototype** — \`Object.freeze(Object.prototype)\` at startup blocks the pollution entirely (test thoroughly; it can break some libraries).
4. **Validate with a schema** — parse untrusted JSON into a strict, known shape rather than merging it wholesale, which is the same allow-listing lesson that defeats mass assignment.
5. **Keep dependencies patched** — most real-world instances arrive through a library, so SCA scanning matters here.
6. **Use safe utilities** — modern versions of popular libraries guard against this; avoid hand-rolled deep merges.

Prototype pollution is the archetype of a modern, ecosystem-specific flaw: it requires understanding the *language's* semantics, not just HTTP, and it shows why the pro defender must know the runtime their application is built on.`,
      sample: {
        lang: 'js',
        caption: 'Polluting the shared prototype, and safe alternatives',
        code: `// VULNERABLE deep merge: copies attacker keys, including __proto__
merge({}, JSON.parse(req.body));      // {"__proto__": {"isAdmin": true}}

// Now EVERY object inherits isAdmin:
const user = { name: "mallory" };
user.isAdmin;                          // true  <- never set on this object
if (user.isAdmin) grantAdmin();        // correct-looking code, subverted

// DEFENCES
const BAD = new Set(["__proto__", "constructor", "prototype"]);
for (const k of Object.keys(input)) if (BAD.has(k)) continue;   // reject

const safeMap = Object.create(null);   // no prototype to pollute
const better  = new Map();             // immune by design
Object.freeze(Object.prototype);       // block it globally (test first)`,
        output: `Prototype pollution injects a property onto Object.prototype, so
EVERY object inherits it - subverting later checks (isAdmin),
crashing the app, or reaching XSS/RCE through options a library
consults. The exploited code is usually correct and far from the
vulnerable merge. Defend: reject __proto__/constructor/prototype,
use null-prototype objects or Map, freeze the prototype, and
validate against a schema instead of merging untrusted input.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is prototype pollution particularly hard to spot during code review?',
        options: [
          'Because it only occurs in compiled languages',
          'Because the vulnerable code (a naive merge copying attacker-controlled keys) and the exploited code (a later check like `if (user.isAdmin)`) are in different places, and the exploited code is itself correct — the property simply arrives through inheritance from a polluted prototype',
          'Because JavaScript has no objects',
          'Because it only affects the browser, never the server',
        ],
        answer: 1,
        explain:
          'Most vulnerabilities are visible at the point of the flaw. Here the dangerous act — copying untrusted keys such as `__proto__` into an object — may sit in a utility function or a dependency, while the damage appears somewhere entirely different, in code that quite reasonably reads a property it expects to be absent or false. That code is not wrong; the object has genuinely inherited the attacker’s value. The separation between cause and effect, combined with the flaw frequently arriving via a library, is why it evades review and needs structural defences (rejecting dangerous keys, null-prototype objects or `Map`, schema validation, and dependency scanning).',
        hint: 'Where is the bug, and where does the damage appear — and is the damaged code itself wrong?',
      },
    },

    {
      id: 'bweb-p-04',
      title: 'HTTP request smuggling',
      read: `**HTTP request smuggling** exploits disagreement between two servers about where one HTTP request ends and the next begins. It is a protocol-level attack against the *infrastructure* in front of your application, and its impact can be severe.

## The mechanism

Requests usually pass through a chain: CDN → reverse proxy/load balancer → application server. Each parses the request stream. If the front-end and back-end **disagree about the request boundary**, an attacker can craft a request that the front-end sees as one request but the back-end sees as one and a half — leaving a **prefix** in the back-end's buffer that gets prepended to **the next user's request**.

The classic cause is conflicting length indicators: both \`Content-Length\` and \`Transfer-Encoding: chunked\` present, with the two servers prioritising different headers (**CL.TE**, **TE.CL**, **TE.TE** with an obfuscated header). Modern variants exploit HTTP/2-to-HTTP/1 downgrading at the edge, where the boundary information is re-derived and can be desynchronised.

## Why it is so damaging

Because the smuggled prefix attaches to *another user's* request, the attacker can:

- **Capture other users' requests**, including their session cookies and credentials.
- **Bypass front-end security controls** — the WAF and authentication enforced at the edge inspected only the outer request, so the smuggled inner one arrives at the application unexamined.
- **Poison the response queue**, so users receive responses intended for others, or serve attacker content to them.
- **Chain into cache poisoning** (next step) to persist the effect for many victims.

It is unusual among web vulnerabilities in that it attacks **other users directly through the shared infrastructure**, without requiring them to visit anything.

## Defences

1. **Normalise at the front end** — reject ambiguous requests outright: any request containing both \`Content-Length\` and \`Transfer-Encoding\`, or malformed/obfuscated chunked encoding, should be rejected rather than "interpreted".
2. **Use HTTP/2 end to end** where possible, and avoid downgrading to HTTP/1.1 at the back end; if you must downgrade, ensure the proxy revalidates and rewrites length information strictly.
3. **Keep proxies, load balancers and servers patched** — these are parser bugs, and vendors fix them.
4. **Avoid connection reuse to the back end** where the risk is high (it removes the shared buffer the attack depends on), accepting the performance cost.
5. **Prefer consistent, well-maintained components** in the chain, and minimise the number of hops that re-parse HTTP.

The defensive lesson is architectural: **every additional component that parses HTTP is a chance for two parsers to disagree.** Reduce hops, normalise strictly, keep everything patched, and reject ambiguity rather than resolving it.`,
      sample: {
        lang: 'text',
        caption: 'A CL.TE desync leaving a prefix for the next user’s request',
        code: `Attacker sends ONE request with conflicting length headers:

  POST / HTTP/1.1
  Content-Length: 6
  Transfer-Encoding: chunked

  0

  GPOST /admin HTTP/1.1 ...        <- the smuggled prefix

  FRONT-END uses Content-Length -> sees one complete request, forwards all
  BACK-END uses Transfer-Encoding -> request ends at "0", the rest STAYS
                                     in the buffer

Next victim's request arrives and is APPENDED to the prefix:
  GPOST /admin HTTP/1.1 ... + [victim's request incl. their Cookie]
  -> victim's session captured; front-end WAF/auth never saw the inner request.`,
        output: `Smuggling exploits two HTTP parsers disagreeing on where a
request ends, leaving a prefix that attaches to ANOTHER user's
request - capturing their cookies, bypassing edge WAF/auth, and
poisoning responses. Defend: reject ambiguous requests (never
both CL and TE), HTTP/2 end to end, patch the proxies, limit
back-end connection reuse, and minimise re-parsing hops.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does HTTP request smuggling let an attacker bypass security controls enforced at a front-end proxy or WAF?',
        options: [
          'Because it encrypts the request so the proxy cannot read it',
          'Because the front end parses and inspects only the outer request; the smuggled portion is treated as part of that request’s body, then interpreted by the back end as a separate request that the front end never examined — so WAF rules and edge authentication were never applied to it',
          'Because proxies do not inspect POST requests',
          'Because the attack disables the proxy entirely',
        ],
        answer: 1,
        explain:
          'Edge controls act on what the front end understands to be a request. In a desync, the attacker’s payload sits inside what the front end considers the body, so it passes inspection as inert data. The back end, disagreeing about where the request ended, then treats that payload as a fresh request and processes it — without it ever having been evaluated by the WAF or the edge authentication layer. That is also why the smuggled request can reach internal paths the edge would have blocked, and why rejecting ambiguous length signalling at the front end is the primary fix.',
        hint: 'Which server inspects the payload, and which server executes it as a request?',
      },
    },

    {
      id: 'bweb-p-05',
      title: 'Web cache poisoning and deception',
      read: `Caches (CDNs, reverse proxies, browser caches) make the web fast by serving one stored response to many users. **Cache poisoning** abuses that: get a malicious response stored, and it is served to **everyone** who requests the same resource — a rare one-to-many web attack.

## Cache keys: the crux

A cache decides whether two requests are "the same" using a **cache key**, typically the method, host and path, plus a few headers. Anything **not** in the key is **unkeyed** — it can influence the response without changing which entry it is stored under.

The attack: find an unkeyed input (a header like \`X-Forwarded-Host\`, \`X-Forwarded-Scheme\`, or an extra query parameter the cache ignores) that the **application reflects into the response** (in a link, a script \`src\`, a redirect). Send a request that poisons the response, and the cache stores it under the normal key. Every subsequent visitor to that URL receives the attacker's content — for example a page whose scripts now load from the attacker's domain, turning a reflected quirk into **stored XSS for all users**.

## Related techniques

- **Cache deception** — the reverse: trick the cache into **storing a victim's private response**. If the app serves \`/account\` content for a request to \`/account/style.css\`, and the cache stores anything ending \`.css\`, then the attacker requests that URL afterwards and retrieves the victim's cached personal data.
- **Cache key normalisation flaws** — differences in how the cache and the application normalise paths, casing, or encodings create entries that can be poisoned or confused.

## Defences

1. **Do not let unkeyed input affect the response.** This is the core fix: the safest application behaviour is to ignore headers like \`X-Forwarded-Host\` entirely, or to derive absolute URLs from configuration rather than from request headers.
2. **Include every response-affecting input in the cache key**, or strip it at the edge before it reaches the application. Many CDNs let you normalise and remove headers — do that for anything the app might reflect.
3. **Mark private responses uncacheable** — \`Cache-Control: no-store, private\` on anything user-specific or authenticated. This prevents cache deception outright.
4. **Cache by content type and route deliberately**, rather than by file extension, so a URL that *looks* static cannot capture dynamic content.
5. **Test it** — a simple check is to send an unkeyed header with a canary value and see whether it appears in the response, then whether it persists for a subsequent clean request.

The architectural insight: **the cache and the application must agree on what makes a response unique.** Any input the application honours but the cache ignores is a poisoning primitive, so either the application must ignore it or the cache must key on it.`,
      sample: {
        lang: 'text',
        caption: 'An unkeyed header reflected into a cached response',
        code: `1. Attacker request (X-Forwarded-Host is NOT part of the cache key):
     GET /home HTTP/1.1
     Host: shop.example.com
     X-Forwarded-Host: evil.example

2. App reflects it when building absolute URLs:
     <script src="https://evil.example/static/app.js"></script>

3. The cache stores that response under the normal key  GET /home

4. EVERY subsequent visitor to /home gets the attacker's script.
   -> reflected quirk becomes stored XSS for all users.

FIX: app ignores X-Forwarded-Host (use configured base URL), or the
edge strips it; mark user-specific responses no-store, private.`,
        output: `Cache poisoning stores a malicious response under a normal cache
key, serving it to everyone - a one-to-many web attack. It needs
an UNKEYED input that the app reflects. Fix by making the app
ignore such headers (derive URLs from config), stripping or
keying them at the edge, and marking private responses
no-store/private to prevent cache deception.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the essential precondition for a web cache poisoning attack?',
        options: [
          'The attacker must have valid administrator credentials',
          'An input that influences the response but is not part of the cache key (an "unkeyed" input, such as a header the application reflects) — so the poisoned response is stored under the normal key and served to every subsequent visitor',
          'The cache must be disabled for the target site',
          'The victim must click a crafted link',
        ],
        answer: 1,
        explain:
          'The attack depends on a mismatch between what the application honours and what the cache considers identifying. If an input changes the response but is excluded from the cache key, the attacker can send it once, have the resulting malicious response stored under the ordinary key, and let the cache serve it to everyone requesting that URL normally — no interaction from victims required, which is what makes it a one-to-many attack. Removing the mismatch is therefore the fix: have the application ignore such inputs, or have the edge strip them or include them in the key.',
        hint: 'What must be true about an input for the poisoned response to be stored under the *normal* key?',
      },
    },

    {
      id: 'bweb-p-06',
      title: 'Advanced client-side attacks',
      read: `As applications moved into the browser, an entire attack surface moved with them. Pro-level defence requires understanding client-side vulnerabilities that server-side controls cannot touch.

## DOM clobbering

HTML elements with \`id\` or \`name\` attributes become **global JavaScript variables**. If an attacker can inject even *non-script* HTML — through a sanitizer that allows tags and attributes but strips scripts — they can **clobber** variables the application relies on. Code checking \`if (window.config)\` or \`if (!window.sanitizeEnabled)\` can be manipulated by injecting \`<a id="config">\`, redirecting logic without executing any script. It is a reminder that "no script tags" is not the same as "safe HTML", and that sanitizers must also constrain \`id\`/\`name\`.

## Client-side prototype pollution

The prototype pollution of an earlier step, but in the browser: pollution via URL parameters parsed into objects, then read as options by a library, a sanitizer or a templating call — escalating to XSS. The **gadget** is in the library, not your code, which makes it hard to find without dedicated tooling.

## postMessage vulnerabilities

\`window.postMessage\` enables deliberate cross-origin communication, bypassing the Same-Origin Policy by design. Two symmetric mistakes:

- **The receiver fails to validate \`event.origin\`**, accepting messages from any site — and then acts on the data (often writing it into the DOM, producing XSS, or performing privileged actions).
- **The sender uses \`"*"\` as the target origin**, broadcasting potentially sensitive data to whatever origin happens to be framed.

Always check \`event.origin\` against an allow-list, validate the message shape, and specify an exact target origin when sending.

## Clickjacking and UI redressing

Framing your application invisibly over attacker content so the victim's clicks land on your real controls (defended with \`frame-ancestors\`, from the amateur level). Modern variants include drag-and-drop tricks and cursor-jacking.

## The defences that generalise

- **Trusted Types** — a browser feature that makes dangerous DOM sinks (\`innerHTML\`, \`eval\`, script \`src\`) reject plain strings, permitting only values produced by a reviewed policy. Enforced via CSP, it eliminates DOM XSS at the sink level rather than requiring every call site to be correct — the strongest structural defence available for client-side XSS.
- **A strict CSP** limits what injected content can do even when injection succeeds.
- **Sanitize with a maintained library** (DOMPurify), configured to restrict \`id\`/\`name\` where clobbering matters, and keep it updated.
- **Review client-side code for sources and sinks** deliberately, since server-side scanners will not see these flows.

The lesson: the browser is an execution environment with its own semantics, and the pro defender must reason about it as carefully as about the server.`,
      sample: {
        lang: 'js',
        caption: 'DOM clobbering, and a postMessage handler done right',
        code: `// DOM CLOBBERING - injected non-script HTML defines a global
// <a id="isAdmin" href="x">   ->  window.isAdmin is now truthy
if (window.isAdmin) showAdminPanel();      // subverted, no script needed

// postMessage - WRONG: accepts messages from anywhere
window.addEventListener("message", (e) => {
  document.getElementById("out").innerHTML = e.data;   // XSS from any site
});

// RIGHT: validate origin, validate shape, use a safe sink
window.addEventListener("message", (e) => {
  if (e.origin !== "https://trusted.example.com") return;
  if (typeof e.data?.text !== "string") return;
  document.getElementById("out").textContent = e.data.text;
});`,
        output: `Client-side flaws server controls cannot reach: DOM clobbering
(id/name become globals, so non-script HTML subverts logic),
client-side prototype pollution (gadget lives in a library),
postMessage without origin validation, and clickjacking.
Structural defences: TRUSTED TYPES (dangerous sinks reject plain
strings), a strict CSP, a maintained sanitizer, and deliberate
review of client-side sources and sinks.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is DOM clobbering possible even when a sanitizer has removed all `<script>` tags and event-handler attributes?',
        options: [
          'Because sanitizers always leave one script tag behind',
          'Because HTML elements carrying `id` or `name` attributes automatically become global JavaScript variables, so injected non-script markup can overwrite variables the application checks — subverting its logic without executing any attacker script',
          'Because removing script tags enables eval by default',
          'Because clobbering requires the attacker to control the server',
        ],
        answer: 1,
        explain:
          'The browser exposes named elements as properties on the global object, which means markup alone can define or shadow variables. An attacker permitted to inject benign-looking tags can therefore make `window.config`, `window.isAdmin` or a similar name resolve to an element, causing application logic that tests those values to take the wrong branch — all without a single script executing, so script-focused sanitization does not help. Defences include restricting `id`/`name` in sanitizer configuration, avoiding reliance on implicit globals, and using Trusted Types and a strict CSP to harden the sinks.',
        hint: 'What does the browser do with an element that has an `id`, in terms of JavaScript globals?',
      },
    },

    {
      id: 'bweb-p-07',
      title: 'Modern browser isolation policies',
      read: `The Same-Origin Policy was designed before cross-origin attacks like **Spectre** demonstrated that merely *loading* attacker-adjacent data into the same process could leak it. Browsers responded with a family of newer isolation headers that a pro defender should understand and deploy.

## Cross-Origin Resource Sharing (CORS) — recap

The deliberate relaxation of the SOP, granting named origins read access. Its dangers (reflecting origins, wildcards with credentials) were covered earlier; treat it as the exception you grant carefully, not a default.

## Cross-Origin Resource Policy (CORP)

\`Cross-Origin-Resource-Policy: same-origin\` (or \`same-site\`) tells the browser **who may embed or load this resource at all**. It protects resources from being pulled into another origin's process — the foundation for defending against speculative-execution side-channel leaks, and a simple way to stop other sites hot-linking or probing your endpoints.

## Cross-Origin Opener Policy (COOP)

\`Cross-Origin-Opener-Policy: same-origin\` severs the \`window.opener\` relationship with cross-origin documents, so a page you open (or that opens you) cannot hold a reference to your window. This blocks cross-window attacks such as **tabnabbing** (a page you opened rewriting your original tab to a phishing page) and denies attackers a channel for probing.

## Cross-Origin Embedder Policy (COEP)

\`Cross-Origin-Embedder-Policy: require-corp\` requires that every cross-origin resource the document loads explicitly opts in (via CORP or CORS). Combined with COOP, it puts the document into **cross-origin isolation**, which the browser rewards with access to powerful features (like \`SharedArrayBuffer\` and high-resolution timers) that are otherwise disabled because they sharpen side-channel attacks.

## Fetch Metadata

Browsers send \`Sec-Fetch-Site\`, \`Sec-Fetch-Mode\` and \`Sec-Fetch-Dest\` headers describing **where a request came from and what it is for** — and these are set by the browser, so unlike \`Referer\` they cannot be forged by page content. A server-side **Resource Isolation Policy** can therefore reject requests that make no sense: a cross-site request whose destination is \`document\` hitting an API endpoint, for instance. This is a powerful, low-effort defence against CSRF, cross-site leaks and clickjacking-adjacent attacks, because it lets the *server* apply an isolation rule rather than relying on the browser's defaults.

## Deploying them

Add CORP to resources, COOP to top-level documents, and a Fetch Metadata policy at the edge or in middleware — all are low-risk and additive. COEP requires more care, since it will block cross-origin subresources that have not opted in, so roll it out in report-only mode first (the audit-then-enforce pattern once more).

These headers represent the modern direction of browser security: **explicit, server-declared isolation** replacing implicit assumptions, hardening the boundaries that the original SOP left porous.`,
      sample: {
        lang: 'text',
        caption: 'Isolation headers, and a Fetch Metadata policy',
        code: `Cross-Origin-Resource-Policy: same-origin      (who may load this resource)
Cross-Origin-Opener-Policy:   same-origin      (cut window.opener links)
Cross-Origin-Embedder-Policy: require-corp     (subresources must opt in)

# Server-side Resource Isolation Policy using browser-set headers
if (secFetchSite !== "same-origin" && secFetchSite !== "none") {
    if (secFetchMode === "navigate" && method === "GET") allow();   // links
    else deny(403);      // blocks cross-site API calls, framing, sub-loads
}
# Sec-Fetch-* are set BY THE BROWSER and cannot be forged by page script -
# unlike Referer - so the server can enforce isolation reliably.`,
        output: `Modern isolation goes beyond the SOP: CORP (who may load this),
COOP (sever opener links, blocks tabnabbing), COEP (subresources
must opt in -> cross-origin isolation), and FETCH METADATA
(Sec-Fetch-*, browser-set and unforgeable) letting the SERVER
reject requests whose origin and purpose make no sense - a
low-effort defence against CSRF and cross-site leaks.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are the `Sec-Fetch-*` (Fetch Metadata) headers more trustworthy for server-side security decisions than the `Referer` header?',
        options: [
          'Because they are encrypted in transit and Referer is not',
          'Because they are set by the browser itself and cannot be forged or suppressed by page content, so the server can reliably determine where a request originated and what it is for — whereas Referer can be absent, stripped or manipulated',
          'Because they are only sent on same-origin requests',
          'Because they contain a cryptographic signature from the server',
        ],
        answer: 1,
        explain:
          'Fetch Metadata headers are added by the browser as forbidden headers, meaning script on a page cannot set or alter them, and they describe the request’s site relationship, mode and destination. That makes them a dependable basis for a server-side Resource Isolation Policy: reject cross-site requests to sensitive endpoints unless they match an expected pattern. `Referer`, by contrast, is frequently stripped by privacy settings or policy, varies in granularity, and cannot be relied upon as present or accurate — so decisions built on it are fragile.',
        hint: 'Who sets each header, and can page script influence it?',
      },
    },

    {
      id: 'bweb-p-08',
      title: 'Front-end supply chain',
      read: `Every third-party script a page loads runs with **full privileges in your origin** — it can read the DOM, cookies accessible to script, and anything the user enters. The front-end supply chain is therefore a direct path into your users' sessions, and it has produced some of the most damaging web breaches.

## The attack in practice

**Magecart**-style attacks compromise a third-party script — an analytics tag, a chat widget, a payment or A/B-testing library — or the CDN serving it, and inject code that **skims payment card details and credentials** from forms as users type. Because the script is loaded legitimately by the site, it operates inside the origin and is invisible to users. Major breaches (British Airways, Ticketmaster) followed exactly this pattern, and the compromised component was often several steps removed from the site's own code.

Related vectors: a **hijacked npm package** that ships malicious code into your bundle at build time, **dependency confusion**, and a compromised **CDN** serving altered files for an otherwise-legitimate URL.

## Defences

1. **Subresource Integrity (SRI)** — add an \`integrity\` hash to \`<script>\` and \`<link>\` tags so the browser refuses to execute a file whose contents do not match. This defeats CDN compromise and tampering in transit outright. It requires versioned, immutable URLs (an auto-updating script cannot be hashed), which is itself good practice.
2. **A strict CSP** — restrict \`script-src\` to specific origins (or nonces with \`strict-dynamic\`), so an injected or compromised script cannot load further attacker code, and \`connect-src\` so skimmed data cannot be exfiltrated to an arbitrary endpoint. CSP limits both the loading and the *exfiltration* half of the attack.
3. **Minimise third-party scripts**, especially on sensitive pages. The strongest control for a payment page is to have **no third-party script on it at all**, or to isolate the payment fields in a **separate iframe from the payment provider**, so even a compromised script on the parent page cannot read them (this is why PCI DSS 4.0 now explicitly requires managing and monitoring page scripts).
4. **Self-host** critical dependencies where practical, so you control the supply.
5. **Monitor for change** — watch for unexpected modifications to third-party scripts and for new outbound destinations appearing in CSP violation reports, which are an excellent detection source for exactly this attack.
6. **Build-time controls** — lockfiles with integrity hashes, review of dependency updates, and scanning (the SCA lesson) to catch malicious packages before they ship.

## The mental model

Loading a third-party script is **granting that vendor — and everyone who can compromise them — the ability to execute code as your site, for every user**. Treat each inclusion as the significant trust decision it is: justify it, pin and verify it, constrain it with CSP, isolate anything sensitive from it, and monitor it. "It's just an analytics tag" has been the first line of many breach reports.`,
      sample: {
        lang: 'html',
        caption: 'Pinning a third-party script, and constraining exfiltration',
        code: `<!-- SRI: the browser refuses to run the file if its hash changes -->
<script src="https://cdn.example.com/lib@3.2.1/lib.min.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>

<!-- CSP limits what a COMPROMISED script can do -->
Content-Security-Policy:
  script-src 'self' https://cdn.example.com;
  connect-src 'self' https://api.example.com;   <- skimmer cannot POST out
  report-uri /csp-report                        <- violations = detection

<!-- Strongest for payments: fields live in the PROVIDER's iframe,
     so scripts on the parent page cannot read them at all. -->`,
        output: `A third-party script runs with FULL privileges in your origin -
it can read forms, the DOM and script-accessible cookies. That is
how Magecart skimmers steal cards. Defend: SRI (pin the hash),
strict CSP for script-src AND connect-src (blocks exfiltration),
minimise/self-host scripts, isolate payment fields in the
provider's iframe, and monitor CSP reports for new destinations.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does restricting `connect-src` in a Content Security Policy help against a compromised third-party script (a Magecart-style skimmer)?',
        options: [
          'It prevents the third-party script from loading at all',
          'Even if the script runs and reads form data, `connect-src` restricts the destinations it may send data to — so the skimmer cannot exfiltrate the stolen details to the attacker’s server, and the blocked attempt generates a CSP violation report that acts as a detection signal',
          'It encrypts the data the script can access',
          'It forces the script to run in a sandboxed iframe',
        ],
        answer: 1,
        explain:
          'A skimming attack has two halves: collecting the data and sending it out. `script-src` and SRI address the first by controlling what may load and execute, but if a legitimately-included script is compromised at source it will still run. Restricting `connect-src` to the specific endpoints your application actually calls blocks the second half, because the exfiltration request to the attacker’s collection server is refused by the browser. The refusal also surfaces in CSP violation reports, giving you an alert that something on the page is attempting to contact an unexpected destination.',
        hint: 'The script is already running and has read the card number. What must it do next, and what stops that?',
      },
    },

    {
      id: 'bweb-p-09',
      title: 'Advanced API and GraphQL security',
      read: `APIs carry most modern application traffic, and at the pro level their risks go well beyond the basics covered earlier.

## Authorization at scale

**Broken object-level authorization** remains the top API risk, but in a microservice architecture it becomes an architectural problem: which service is responsible for the check? Patterns that hold up:

- **Enforce at the service that owns the data**, never only at the gateway — a gateway check protects the front door while internal callers bypass it.
- **Propagate identity, not trust** — pass a verified token or signed context between services rather than an unauthenticated \`user_id\` header, and have each service validate it.
- **Zero trust between services** — mutual TLS and per-service authorization, so an internal network position grants nothing (a service mesh can provide this).

## GraphQL-specific risks

GraphQL's flexibility shifts query construction to the client, which creates distinctive problems:

- **Query depth and complexity attacks** — nested or recursive queries can multiply into enormous workloads from a single small request. Defend with **depth limits, complexity/cost analysis, timeouts and pagination caps**.
- **Batching abuse** — many operations in one request can defeat per-request rate limiting; limit by operation count and cost, not just request count. Batched aliases have been used to brute-force credentials and one-time codes.
- **Introspection** — convenient in development, but publishes your entire schema; disable it in production where it aids attackers.
- **Per-resolver authorization** — a single unguarded field leaks data regardless of checks elsewhere, because clients choose their own traversal paths. Authorization must be enforced at every resolver, ideally by a shared mechanism.
- **The N+1 and data-loader surface** — performance patterns can inadvertently bypass field-level checks if they fetch in bulk.

## Other advanced API concerns

- **Shadow and zombie APIs** — undocumented or deprecated endpoints still deployed and unmonitored; a recurring breach path. Maintain an **API inventory** (discovery tooling helps) and decommission deliberately.
- **Mass assignment and excessive exposure** at scale — enforce request and response schemas as contracts (OpenAPI), validated automatically, so drift cannot silently widen either.
- **Rate limiting that reflects cost** — limit by expense and by user, not merely requests per second, and apply it to authentication and expensive endpoints specifically.
- **Webhooks in both directions** — verify inbound webhook signatures and replay windows; treat outbound webhook URLs as an SSRF surface.
- **Versioning and deprecation** — old versions with weaker checks are frequently what attackers find.

## Documentation as a control

An OpenAPI/GraphQL schema is not just documentation: it is a **machine-readable contract** that can drive request validation, response filtering, automated security testing and inventory. Treat the specification as an enforced artefact and much of API security becomes systematic rather than case-by-case.`,
      sample: {
        lang: 'text',
        caption: 'A GraphQL query that costs a fortune, and the limits that stop it',
        code: `# One small request, enormous cost (recursive relationships)
query {
  users(first: 100) {
    friends(first: 100) {
      friends(first: 100) {
        friends(first: 100) { name }   # 100^4 = 100,000,000 nodes
      } } } }

DEFENCES
  depth limit:        max 7 levels
  complexity/cost:    each field a cost; reject above a budget
  pagination caps:    'first' limited (e.g. <= 50), always required
  timeouts + per-user cost-based rate limits
  batching:           limit operations per request and total cost
  authorization:      enforced in EVERY resolver, not just the entry point`,
        output: `Advanced API risks: object-level authorization in microservices
(enforce at the data owner, propagate verified identity, zero
trust between services), GraphQL depth/complexity/batching abuse,
per-resolver authorization, introspection, and shadow/zombie
APIs. Treat the OpenAPI/GraphQL schema as an enforced CONTRACT
driving validation, filtering, testing and inventory.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a microservice architecture, why is enforcing object-level authorization only at the API gateway insufficient?',
        options: [
          'Because gateways cannot read HTTP headers',
          'Because the gateway protects only the external entry path — internal callers, other services, or any route that reaches the service directly bypass it — so authorization must also be enforced by the service that owns the data, with verified identity propagated between services rather than trusted headers',
          'Because gateways cannot perform TLS termination',
          'Because object-level authorization is only relevant to GraphQL',
        ],
        answer: 1,
        explain:
          'A gateway check is a perimeter control, and perimeters are bypassed: another microservice, a background job, a misrouted internal call, or an attacker who has reached the internal network can talk to the service directly and never traverse the gateway. Authorization therefore belongs at the service that owns the resource, where it cannot be skipped, with identity propagated as a verified token or signed context that each service validates independently rather than as a trusted header. This is the zero-trust principle applied inside the application architecture.',
        hint: 'Who else can call the service besides traffic that came through the front door?',
      },
    },

    {
      id: 'bweb-p-10',
      title: 'Vulnerability disclosure and bug bounty',
      read: `However good your engineering, external researchers will find issues you missed. How you **receive** those reports determines whether they reach you or reach someone else — and it is among the cheapest sources of security value available.

## A vulnerability disclosure policy (VDP)

A published policy telling researchers **how to report** and **what you commit to**:

- A clear contact route — a \`security.txt\` file at \`/.well-known/security.txt\` (an internet standard), a security page, and a monitored address.
- **Scope**, so researchers know what is in and out.
- **Safe harbour** — an explicit commitment not to pursue legal action against good-faith research within the policy. Without it, many researchers will not report at all, because the legal risk is real.
- Expected **response times** and a commitment to keep the reporter informed.

A VDP costs little and converts "someone finds a flaw" from an unknown into a managed inbound process. Increasingly it is expected, and in some sectors required.

## Bug bounty

A VDP with **payment** for valid findings, run either publicly or privately through a platform. Considerations:

- **Readiness first.** A bounty on an application with hundreds of easy findings is expensive and overwhelming. Establish scanning, testing and a remediation capability first; start **private** (invited researchers, limited scope) and widen as you mature.
- **Triage capacity** is the real cost — duplicates, false positives and out-of-scope reports consume time. Platforms offer managed triage.
- **Reward meaningfully** — payouts reflecting severity attract quality research; under-paying attracts noise and damages goodwill.
- Bounties are **complementary**, not a replacement for internal security work. They excel at finding what your process missed, particularly logic and chained flaws.

## Handling a report well

Acknowledge promptly, validate and reproduce, communicate a timeline, fix, credit the reporter if they wish, and close the loop by telling them it is resolved. Researchers talk to each other; a reputation for responsiveness attracts good reports, while ignoring or threatening a reporter reliably produces public disclosure instead.

## Coordinated disclosure

If you ship software others run, you also need an outbound process: fixing, publishing an advisory with a **CVE**, and giving downstream users time to patch. And when a researcher sets a disclosure deadline, negotiate rather than ignore — deadlines exist because silence was historically the norm.

## The mindset

External reports are **free security testing by motivated experts**. The organisations that benefit are those that make reporting easy, respond like professionals, and treat researchers as allies — while the ones that go quiet or hostile find their vulnerabilities disclosed publicly, or exploited quietly, instead.`,
      sample: {
        lang: 'text',
        caption: 'A security.txt, and what a mature intake process commits to',
        code: `# https://example.com/.well-known/security.txt
Contact: mailto:security@example.com
Policy: https://example.com/security/disclosure
Preferred-Languages: en
Expires: 2027-01-01T00:00:00.000Z

Policy commits to:
  scope (what is in / out of bounds)
  SAFE HARBOUR for good-faith research within the policy
  acknowledgement within 3 business days
  triage + severity within 10 business days, with status updates
  credit if the reporter wishes; notification when it is fixed`,
        output: `A published VDP with safe harbour turns external discovery into
a managed inbound process - researchers report to YOU rather than
disclosing publicly or selling it. Bug bounty adds payment: start
private and narrow, budget for TRIAGE (the real cost), and treat
it as complementary to internal testing. Respond professionally;
reputation determines the quality of reports you receive.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an explicit "safe harbour" clause an important part of a vulnerability disclosure policy?',
        options: [
          'It transfers legal liability for breaches to the researcher',
          'Without an assurance that good-faith research within the stated scope will not be met with legal action, many researchers will not report at all — the legal risk is genuine — so safe harbour is what makes responsible disclosure to you the rational choice',
          'It guarantees that all reports will be valid',
          'It is required before a CVE can be issued',
        ],
        answer: 1,
        explain:
          'Security research inevitably involves interacting with systems in unintended ways, which under computer-misuse laws can look indistinguishable from an attack. Researchers have faced real legal threats for reporting in good faith, so in the absence of an explicit commitment the safe choice for them is to stay silent — or to disclose anonymously or publicly. A clear safe-harbour statement, bounded by a defined scope and good-faith conduct, removes that risk and makes reporting directly to you the sensible path, which is precisely the behaviour the policy exists to encourage.',
        hint: 'What is the personal risk to a researcher who probes your system and then emails you about it?',
      },
    },

    {
      id: 'bweb-p-11',
      title: 'Running an application security program',
      read: `At the highest level, web defence is a **program**: a set of capabilities, people and measurements that make security sustainable across many teams and applications, rather than heroics on one codebase.

## Scaling beyond the security team

Security teams are always outnumbered by developers, so the model that works is **enablement rather than gatekeeping**:

- **Security champions** — an interested engineer embedded in each team, given extra training and a direct line to the security team. They review designs, triage findings and raise the baseline locally. This is the single most effective scaling mechanism most organisations have.
- **Paved roads** — provide hardened frameworks, libraries, templates and pipelines so that the default path is secure and teams get security by adoption rather than by effort. The strongest security programs win by making the secure way the easiest way, not by reviewing everything.
- **Self-service tooling and clear guidance** — scanners in the pipeline, threat-model templates, secure-coding guidance tied to the specific classes teams introduce.
- **Training that targets reality** — based on the vulnerabilities actually found in your code, not generic awareness slides.

## Maturity models

Frameworks such as **OWASP SAMM** and **BSIMM** provide structured maturity assessments across governance, design, implementation, verification and operations. Their value is less the score than the **gap analysis and shared language**: they turn "we should do more security" into a prioritised roadmap that leadership can fund.

## Measuring what matters

Choose metrics that reflect risk and improvement rather than activity:

- **Coverage** — proportion of applications and features threat-modelled, scanned, and covered by security tests; inventory completeness (you cannot secure what you do not know you run).
- **Flow** — mean time to remediate by severity, age of open findings, and the trend of escaped defects (issues found in production that earlier stages should have caught). Escape rate is a particularly honest measure of whether "shift left" is working.
- **Prevention** — recurrence rate of vulnerability classes (is the same bug class still being introduced?), and adoption of paved-road components.
- **Detection and response** — application attack detection coverage and time to respond.

Avoid vanity metrics: number of scans run, or raw finding counts, measure activity rather than outcome, and can even reward noise.

## Risk-based prioritisation

You cannot fix everything, so prioritise by **exploitability, exposure and impact**: is it internet-facing, authenticated or not, does it touch sensitive data, is there a known exploit in the wild? A defensible, explicit prioritisation is itself a security control, because it directs limited capacity at genuine risk rather than at whatever the scanner ranked first.

## The leadership dimension

A program needs executive sponsorship, a defined risk appetite, clear ownership of applications, and integration with engineering's normal ways of working. Security that exists outside the development process gets routed around; security embedded in the paved road, the pipeline and the team's own backlog endures.`,
      sample: {
        lang: 'text',
        caption: 'A program dashboard: coverage, flow, prevention, response',
        code: `Metric                                  Q1     Q2     Q3    Target
--------------------------------------------------------------------------
Applications in inventory               62%    88%    97%   > 95%  ok
Features threat-modelled                18%    44%    71%   > 80%
Endpoints covered by authz tests        31%    69%    92%   > 90%  ok
MTTR - critical findings              21 d    9 d    3 d   < 7 d  ok
Open findings > 90 days                 140     61     22   < 25   ok
Escaped defects (found in prod)          27     14      6   trend down ok
Recurrence: same vuln class reintroduced 12      5      2   trend down ok
Paved-road framework adoption           40%    72%    89%   > 85%  ok

Recurrence and escape rate falling as paved-road adoption rises:
evidence the program prevents, not just detects.`,
        output: `A program scales through ENABLEMENT, not gatekeeping: security
champions in each team, PAVED ROADS that make the secure path the
default, self-service tooling, and training aimed at the classes
you actually introduce. Use SAMM/BSIMM for a gap-based roadmap,
measure coverage/flow/prevention/response (not scan counts), and
prioritise by exploitability, exposure and impact.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do mature application security programs emphasise "paved roads" (hardened default frameworks, libraries and pipelines) over reviewing every change?',
        options: [
          'Because code review never finds vulnerabilities',
          'Because security teams are vastly outnumbered by developers, so review cannot scale; providing defaults that are secure — auto-escaping templates, parameterized data access, authorization middleware, hardened pipelines — means teams get security by adopting the standard path, and scarce expert time goes to design review and the flaws tooling cannot find',
          'Because paved roads eliminate all vulnerabilities permanently',
          'Because developers are not permitted to see security findings',
        ],
        answer: 1,
        explain:
          'Gatekeeping every change creates a bottleneck that engineering routes around and that no security team can staff. Changing the defaults scales instead: when the standard framework escapes output, parameterizes queries, enforces authorization centrally and ships through a hardened pipeline, entire vulnerability classes become hard to introduce for every team simultaneously, without anyone needing to remember. Expert attention is then spent where it genuinely adds value — threat modelling, design review, and the logic and authorization flaws no tool detects — which is also why recurrence rate and paved-road adoption are meaningful program metrics.',
        hint: 'How many developers are there per security engineer, and what scales better — reviewing everything, or changing the default?',
      },
    },

    {
      id: 'bweb-p-12',
      title: 'Capstone: secure an application end to end',
      read: `Tie the entire web track together into the exercise a senior application security engineer leads: take a real application and **secure it end to end**, with evidence at every stage.

## The engagement

1. **Understand and inventory** — map the application: endpoints, entry points, data stores, third-party scripts and dependencies, authentication and session mechanisms, tenancy model, and the infrastructure and pipeline that ship it.

2. **Threat-model** — data flow diagram, trust boundaries, STRIDE at each crossing, and a prioritised threat list turned into testable security requirements and abuse cases.

3. **Assess** — combine the techniques from every level: automated (SAST, DAST, SCA, secret scanning, IaC and image scanning, header and TLS checks) *and* manual (the authorization matrix and two-account replay tests, business-logic probing, CSRF/SSRF/traversal/mass-assignment checks, client-side source-to-sink review, and the advanced classes from this level — deserialization, SSTI, prototype pollution, caching and smuggling exposure where relevant).

4. **Fix structurally** — for each finding, apply the root-cause fix rather than a filter: parameterization, context-correct encoding with Trusted Types and a nonce CSP, centralized deny-by-default authorization with ownership checks, database-enforced tenant isolation, correct OIDC/JWT validation, secrets in a manager with short lifetimes, SRI and constrained CSP for third-party scripts, and safe deserialization and template handling.

5. **Harden the runtime and pipeline** — non-root minimal containers, least-privilege service identity, restricted egress, isolation headers and Fetch Metadata policy, hardened CI/CD with signed artefacts.

6. **Instrument and detect** — structured security events, detections for credential stuffing, authorization probing, mass data access and anomalous admin actions, CSP violation reporting, and an incident runbook including full credential and signing-key rotation.

7. **Institutionalise** — security tests in CI so every fix is a permanent regression test, pipeline gates, a published disclosure policy, and the findings fed back into the paved road so other teams benefit.

8. **Verify and measure** — re-run every attack that previously worked, confirm each now fails and that functionality is intact, and report coverage, remediation times and residual accepted risks.

## The measure of a pro

You can take an application from "we think it's fine" to: *threats modelled, vulnerabilities found by tooling and by reasoning, fixed at the root, hardened in runtime and pipeline, instrumented so it reports its own attacks, covered by tests that prevent regression, and measured — with the residual risk stated explicitly.*

## The whole arc

From a first HTTP request to leading an application security program, one idea runs through everything: **the client controls the entire request, so the server must never trust it — and data must never become code.** Injection, XSS, SSTI, deserialization and prototype pollution are that second principle violated in different interpreters; broken access control, CSRF, SSRF and logic flaws are the first principle violated about *context* rather than characters. Defence is structural separation, deny-by-default design, secure defaults that make flaws hard to introduce, and instrumentation that tells you when someone tries anyway.

> Build it so the vulnerability is hard to write, prove it with tests, watch it in production, and keep the loop turning — because the application will change, the dependencies will change, and the attackers certainly will.`,
      sample: {
        lang: 'text',
        caption: 'Capstone scorecard: before and after, with evidence',
        code: `Area                    Before              After            Evidence
-----------------------------------------------------------------------------
Threat model            none                per-feature      design docs
Injection               3 SQLi              parameterized    payloads inert
XSS                     stored + DOM        encoding + CSP   + Trusted Types
Access control          IDOR on 4 endpoints centralized authz authz matrix green
Tenant isolation        app-layer filters   database RLS     cross-tenant tests
AuthN/tokens            JWT alg unpinned    pinned + aud/exp verification tests
Secrets                 in repo + config    manager, 1h TTL  rotation drilled
3rd-party scripts       9, unpinned         4, SRI + CSP     connect-src locked
Runtime                 root container      non-root, egress image + IaC scan
Detection               none                5 detections     emulated + fired
Pipeline                no gates            SAST/SCA + tests blocks high sev
Disclosure              no contact          VDP + security.txt  published`,
        output: `End to end: inventory, threat model, assess (tools AND
reasoning), fix at the ROOT, harden runtime and pipeline,
instrument for detection, institutionalise with tests and paved
roads, then VERIFY every previously-working attack now fails.
Residual risk stated explicitly. That is application security
led, not merely performed.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What single pair of principles underlies nearly every vulnerability and defence across the whole web security track?',
        options: [
          'Use HTTPS, and keep software updated',
          'The client controls the entire request so the server must never trust it, and data must never become code — injection, XSS, SSTI, deserialization and prototype pollution violate the second, while broken access control, CSRF, SSRF and logic flaws violate the first about the request’s context; defences are structural separation and deny-by-default design',
          'Scan frequently, and hire more security staff',
          'Encrypt everything, and log everything',
        ],
        answer: 1,
        explain:
          'Every class in the track reduces to one of these. When attacker-controlled data reaches an interpreter that can execute it — a SQL engine, a browser, a template engine, a deserializer, a JavaScript prototype chain — the failure is data becoming code, and the fix is structural separation (parameterization, context-correct encoding, data-only formats, passing values as variables). When the application trusts something about the request’s context — that the client enforced a rule, that a session implies authorization, that an origin or a destination is safe, that steps occur in order — the failure is misplaced trust, and the fix is deny-by-default, server-side verification. HTTPS, patching, scanning and logging all matter, but they are supporting practices rather than the underlying principles.',
        hint: 'One principle is about who controls the request; the other is about what happens when data reaches an interpreter.',
      },
    },
  ],
}

export default level
