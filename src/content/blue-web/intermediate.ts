import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Access control, CSRF, SSRF and logic flaws',
  summary:
    'The vulnerabilities that survive good input handling: broken access control and IDOR, CSRF and SSRF, path traversal, business-logic and race-condition flaws, API-specific risks like mass assignment, cryptographic failures, vulnerable dependencies and misconfiguration — and how to design each one out.',
  outcomes: [
    'Design and test authorization that fails closed',
    'Find and fix IDOR, CSRF, SSRF and path traversal',
    'Recognise business-logic and race-condition flaws',
    'Secure REST and GraphQL APIs against mass assignment and BOLA',
    'Avoid cryptographic failures and manage secrets properly',
    'Control dependency risk and eliminate misconfiguration',
  ],
  steps: [
    {
      id: 'bweb-i-01',
      title: 'Broken access control',
      read: `**Broken access control** is OWASP's **number one** web application risk — and unlike injection, no amount of input sanitising helps. The request is perfectly well-formed; the app simply fails to check whether *this user* is allowed to do *this thing*.

## Authentication vs authorization

- **Authentication** — who are you? (the login, from the last level)
- **Authorization** — what are you allowed to do?

An app can authenticate flawlessly and still be wide open, because it never asks the second question.

## The two kinds of failure

- **Vertical** — a lower-privileged user performs a higher-privileged action. A normal user reaches \`/admin/users\` because the app only hid the link in the UI, or checks the role in JavaScript, or protects the page but not the API endpoint behind it.
- **Horizontal** — a user accesses another user's data at the *same* privilege level. Changing \`/orders/1042\` to \`/orders/1043\` and seeing someone else's order (IDOR — next step).

## Why it is so common

Because the check must be made **everywhere**, consistently, and it is easy to miss one:

- Protecting the HTML page but not the **JSON API** it calls.
- Checking on \`GET\` but forgetting \`POST\`/\`PUT\`/\`DELETE\` for the same resource.
- Relying on the **UI not showing** the option ("security by obscurity of the link").
- Trusting a **client-supplied** role or ID (\`?role=admin\`, a \`user_id\` in the body, a JWT claim the client can edit).
- A new endpoint added later that nobody wired into the authorization layer.

## The design principles

1. **Deny by default.** Access is refused unless a rule explicitly allows it, so a forgotten endpoint fails *closed*, not open.
2. **Enforce server-side, on every request.** Never in the UI or client code — the client is attacker-controlled.
3. **Centralize the mechanism.** One shared authorization layer (middleware, policy engine, decorators) rather than ad-hoc \`if\` statements scattered through handlers — scattered checks are how one gets forgotten.
4. **Derive identity from the session, not the request.** The user ID must come from the authenticated session, never from a parameter the client sends.
5. **Check ownership, not just role.** "Is this user an authenticated customer?" is not enough — ask "does *this* order belong to *this* user?"

Access control is a design problem, not a filtering problem. Get the model right and apply it uniformly, and the whole class of flaw largely disappears.`,
      sample: {
        lang: 'python',
        caption: 'The same endpoint, broken and fixed',
        code: `# BROKEN - authenticated, but never authorized
@app.get("/api/orders/<int:oid>")
@login_required
def get_order(oid):
    return Order.query.get(oid).json()     # ANY logged-in user, ANY order

# BROKEN - trusts a client-supplied identity
uid = request.args["user_id"]              # attacker sets this freely

# FIXED - identity from the session, ownership enforced, deny by default
@app.get("/api/orders/<int:oid>")
@login_required
def get_order(oid):
    order = Order.query.filter_by(id=oid, user_id=current_user.id).first()
    if order is None:
        abort(404)                         # fails CLOSED
    return order.json()`,
        output: `Broken access control is OWASP #1 and input validation cannot
help - the request is well-formed. Deny by default, enforce
server-side on EVERY request (including the API behind a page,
and every method), centralize the check, take identity from the
SESSION, and verify OWNERSHIP, not just role.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An application checks the user’s role in its JavaScript before showing the "Delete user" button, and the admin page itself requires login. Why is this still broken access control?',
        options: [
          'Because JavaScript is slow',
          'Hiding a control in the UI is not an access-control check: the attacker can call the underlying API endpoint directly, and requiring only *login* does not verify the user is an administrator — authorization must be enforced server-side on every request, including the API',
          'Because the page should use POST instead of GET',
          'It is not broken; hiding the button is sufficient',
        ],
        answer: 1,
        explain:
          'Two separate mistakes compound here. First, the client-side role check only hides a button — an attacker simply issues the delete request directly (with a proxy or curl), never touching your UI. Second, "requires login" is authentication, not authorization: it confirms *someone* is logged in, not that they are an admin. The fix is a server-side authorization check on the endpoint itself, enforced by a centralized mechanism that denies by default, so both the page and its API are covered.',
        hint: 'Does the attacker use your button, and does "logged in" mean "allowed"?',
      },
    },

    {
      id: 'bweb-i-02',
      title: 'IDOR: insecure direct object references',
      read: `**IDOR** is the most common concrete form of broken access control: the application exposes a reference to an internal object (a database ID, a filename, a key) and acts on it **without checking the requester is entitled to it**.

## The classic shape

\`\`\`
GET /api/invoices/1042      -> your invoice
GET /api/invoices/1043      -> someone else's invoice
\`\`\`

Change the number, get another user's data. The request is legitimate-looking, so WAFs and input validation see nothing wrong — the flaw is the missing ownership check.

It applies to every operation, not just reads: \`POST /api/invoices/1043/pay\`, \`DELETE /api/users/77\`, and to files (\`/files/report_1043.pdf\`), to nested references, and to identifiers hidden in POST bodies or JWT claims.

## The fix: check ownership at the data layer

The robust pattern is to **scope every query by the authenticated user**, so an unauthorised ID simply returns nothing:

\`\`\`
Invoice.where(id: params[:id], user_id: session.user_id).first
\`\`\`

rather than fetching by ID and *then* comparing — that "fetch then compare" pattern is easy to forget in one place, and object-level checks belong as close to the data access as possible. Many frameworks support scoping by default (e.g. loading through the user's association), which makes the safe path the easy path.

## Unguessable IDs are not access control

Switching to UUIDs makes IDs hard to enumerate, which is worth doing as defence in depth — but it is **not** an access-control fix. The reference still leaks (in URLs, emails, logs, shared links, the browser history, to anyone the object was ever shown to), and once known it works. Treat UUIDs as reducing discovery, never as authorization. This is why the OWASP-preferred framing is now "insecure direct object reference" as a symptom of **broken object-level authorization** — the missing check is the bug.

## Return 404, not 403

When a user requests an object they don't own, returning **404 Not Found** (rather than 403 Forbidden) avoids confirming the object exists — denying an attacker an enumeration oracle. Be consistent, or the difference itself leaks.

## Finding IDOR

Testing is mechanical and effective: log in as two different users, capture a request from user A, replay it as user B, and see whether A's data comes back. Do it for every object type and every method. Automated tools help, but this two-account replay test is the reliable way to find object-level authorization failures.`,
      sample: {
        lang: 'text',
        caption: 'The two-account replay test that finds IDOR',
        code: `As user A (session A), capture:
  GET /api/invoices/1042      -> 200, A's invoice

Replay the SAME request with session B:
  GET /api/invoices/1042      -> 200, A's invoice   <- IDOR!
  (expected: 404)

Repeat for every object type and every method:
  GET / PUT / DELETE /api/invoices/{id}
  POST /api/invoices/{id}/pay
  GET /files/report_{id}.pdf
  ...and IDs buried in POST bodies and JWT claims.`,
        output: `IDOR = acting on an object reference without an ownership check
(broken object-level authorization). Fix by SCOPING the query to
the authenticated user at the data layer, so a foreign ID
returns nothing. UUIDs reduce guessing but are NOT authorization.
Return 404 to avoid confirming existence. Test by replaying one
user's requests with another user's session.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A team fixes an IDOR by replacing sequential numeric IDs with random UUIDs. Is the vulnerability resolved?',
        options: [
          'Yes — UUIDs cannot be guessed, so the data is safe',
          'No — the missing authorization check is still the bug; UUIDs only make IDs harder to discover, but they leak through URLs, emails, logs and shared links, and once known still grant access. The fix is to scope the query to the authenticated user so a foreign ID returns nothing',
          'Yes, provided the UUIDs are version 4',
          'No, because UUIDs are too long for URLs',
        ],
        answer: 1,
        explain:
          'Unguessable identifiers raise the cost of *discovering* references, which is worthwhile defence in depth, but they do not answer the question the application is failing to ask: is this user entitled to this object? References leak constantly — in shared links, emails, referrer headers, logs, and to anyone who ever legitimately saw the object — and a leaked UUID works exactly as a sequential ID would. The real fix is object-level authorization: scope every lookup by the authenticated user so an unauthorised reference simply returns nothing.',
        hint: 'Does making a reference hard to guess answer the question "is this user allowed to have it?"',
      },
    },

    {
      id: 'bweb-i-03',
      title: 'Designing authorization',
      read: `Since access control is a design problem, it deserves an actual design. Ad-hoc checks scattered through handlers are how the gaps appear.

## Models

- **RBAC (Role-Based Access Control)** — permissions attach to roles (admin, editor, viewer), users get roles. Simple, widely used, and fine for coarse, mostly-static permissions. Its limit is that it struggles with per-object rules ("the *owner* of this document").
- **ABAC (Attribute-Based)** — decisions consider attributes of the user, the resource, the action and the context (department, owner, sensitivity, time, location). More expressive, more complex.
- **ReBAC / relationship-based** — decisions follow relationships ("user is a member of the team that owns this folder"), the model behind Google Zanzibar and tools like OpenFGA. A good fit for sharing/collaboration apps.

Most real apps need **role checks for coarse capability** *plus* **object-level checks for ownership/relationship** — both, not either.

## Enforce centrally, not per-handler

Put the decision in **one place**: middleware, a policy layer, decorators, or a policy engine (OPA, Casbin, Cedar). Benefits:

- **Deny by default** is easy to guarantee (an endpoint with no policy is refused, so a forgotten one fails closed).
- The policy is **auditable** — you can read what the rules are, rather than inferring them from a hundred handlers.
- Changes apply uniformly; you cannot fix a rule in nine places and miss the tenth.

## Rules that keep it sound

- **Identity from the session**, never from a request parameter or an unverified token claim.
- **Check at the point of data access** as well as the route, so a new caller can't bypass a route guard.
- **Every method and every entry point** — the JSON API, GraphQL resolvers, webhooks, background jobs triggered by users, file downloads, exports. Alternate paths to the same data are where holes hide.
- **Re-check after state changes** — a permission revoked or a role changed should take effect promptly (another argument for revocable server-side sessions over long-lived tokens).
- **Least privilege** in the model itself: minimal default permissions, no ambient "admin" that is handed out for convenience.

## Test it deliberately

Authorization deserves **automated tests** as a first-class concern: for each endpoint, assert that an anonymous user, a different user, and a lower-privileged user are all denied, and that the legitimate user is allowed. These tests catch the regression where a refactor drops a check — a very common way access control breaks after it was once correct.

Designed centrally, denying by default, enforced at the data layer, and covered by tests: that is authorization that stays correct as the app grows.`,
      sample: {
        lang: 'python',
        caption: 'Centralized policy plus authorization tests',
        code: `# One place defines the rules; endpoints declare what they need.
@app.put("/api/docs/<doc_id>")
@requires(action="doc:edit")          # middleware denies by DEFAULT
def edit(doc_id):
    doc = authorized_doc(doc_id, action="doc:edit")   # object-level too
    ...

def can(user, action, resource):      # the single policy function
    if action == "doc:edit":
        return resource.owner_id == user.id or user.id in resource.editors
    return False                      # unknown action -> DENY

# Authorization tests treated as first-class
def test_other_user_cannot_edit(client, doc_of_user_a, session_b):
    assert client.put(f"/api/docs/{doc_of_user_a.id}", **session_b).status == 404`,
        output: `Design it: roles for coarse capability PLUS object-level checks
for ownership/relationship. Enforce in ONE central layer that
denies by default, at the data-access point, across every method
and entry point (API, GraphQL, exports, jobs). Take identity from
the session. And write authorization TESTS so refactors can't
silently drop a check.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is centralizing authorization in a shared policy layer safer than writing an access check inside each request handler?',
        options: [
          'It makes the application run faster',
          'A central layer can deny by default — so an endpoint with no policy fails closed rather than open — and makes the rules auditable and uniformly applied, whereas per-handler checks are easy to forget on one endpoint, method or alternate entry point, which is exactly how access-control gaps appear',
          'Per-handler checks cannot access the session',
          'Centralized policy removes the need for object-level checks',
        ],
        answer: 1,
        explain:
          'Scattered checks fail by omission: a new endpoint, an extra HTTP method, a GraphQL resolver or an export path gets added and nobody adds the check, and because the default is "allowed", the gap is silent. A central enforcement point inverts that — anything without an explicit policy is denied — and gives you one readable, auditable set of rules that changes apply to uniformly. It complements rather than replaces object-level ownership checks at the data layer, and both should be backed by authorization tests.',
        hint: 'What happens when someone adds a new endpoint and forgets the check — under each approach?',
      },
    },

    {
      id: 'bweb-i-04',
      title: 'Cross-Site Request Forgery',
      read: `**CSRF** exploits the gap you met in the Same-Origin Policy: a browser will **send** a cross-site request (with your cookies attached) even though the attacker cannot **read** the response.

## How the attack works

1. You are logged into \`bank.example\` — your browser holds a session cookie.
2. You visit \`evil.example\`, which contains a hidden form or image that issues a request to \`bank.example/transfer\`.
3. Your browser sends that request **and attaches your bank cookie automatically**, because cookies are sent based on the *destination*, not on who initiated the request.
4. The bank sees an authenticated request and performs the transfer.

The attacker never sees the response — they don't need to. The **side effect** is the attack. This is why CSRF targets state-changing actions: transfers, password or email changes, purchases, privilege grants.

## Defence 1: SameSite cookies

Setting \`SameSite=Lax\` (a modern browser default) stops cookies being attached to most cross-site requests — notably cross-site \`POST\`s — which neutralises the classic attack. \`Strict\` is stronger but breaks legitimate inbound links.

It is excellent, but treat it as **defence in depth** rather than your only control: behaviour varies across older browsers, \`Lax\` still permits top-level cross-site \`GET\` navigations (so any state-changing \`GET\` remains exploitable), and same-site-but-different-subdomain scenarios can still bite.

## Defence 2: anti-CSRF tokens (the primary control)

Give each session (or form) a **random, unpredictable token**, embed it in the form or a custom header, and require it on every state-changing request. The attacker's site cannot read the token (the Same-Origin Policy stops them reading your page), so they cannot forge a valid request.

Patterns: the **synchronizer token** (server stores the expected value), or the **double-submit cookie** (token in both a cookie and a request field, compared server-side — simpler but weaker if an attacker can set cookies on your domain). Every modern framework ships CSRF protection — use it rather than inventing one, and make sure it is enabled for all state-changing routes.

## Defence 3: use the right methods, and check origin

- **Never perform state changes on \`GET\`.** A \`GET\` that transfers money is trivially triggered by an \`<img>\` tag. Use \`POST\`/\`PUT\`/\`DELETE\` for effects.
- **Validate \`Origin\`/\`Referer\`** on state-changing requests as an additional check.
- **Re-authenticate for critical actions** (changing a password or email, large transfers) — a step-up that makes forgery useless.

## A note on APIs

Token-based APIs that use an \`Authorization\` header rather than cookies are **not** inherently vulnerable to classic CSRF, because the browser does not attach that header automatically. The risk returns whenever the credential is carried in a **cookie** — including session cookies used by a single-page app's API.

**Use the framework's CSRF protection, set \`SameSite\`, keep state changes off \`GET\`, and step up for critical actions.**`,
      sample: {
        lang: 'html',
        caption: 'The attack page, and the token that defeats it',
        code: `<!-- on evil.example: auto-submits with the victim's cookies -->
<form action="https://bank.example/transfer" method="POST" id="f">
  <input name="to" value="attacker">
  <input name="amount" value="5000">
</form>
<script>document.getElementById('f').submit();</script>

<!-- the bank's real form carries an unpredictable token -->
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="a7f3...random-per-session">
  ...
</form>
<!-- evil.example cannot READ that token (Same-Origin Policy),
     so its forged request is rejected. -->`,
        output: `CSRF abuses cookies being sent by DESTINATION: the request goes
through with your session even though the attacker can't read the
reply - the side effect IS the attack. Defend with anti-CSRF
tokens (primary), SameSite cookies (defence in depth), never
state-changing GETs, Origin checks, and re-auth for critical actions.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does an unpredictable anti-CSRF token in a form prevent the attack, given the attacker can already make the victim’s browser send the request?',
        options: [
          'Because the token encrypts the request body',
          'The attacker’s site cannot read the victim’s page, so it cannot learn the token value (the Same-Origin Policy blocks cross-origin reads) — and without a valid token the forged request is rejected, even though the browser would happily attach the session cookie',
          'Because tokens make the request use HTTPS',
          'Because the browser refuses to send cross-site requests at all',
        ],
        answer: 1,
        explain:
          'CSRF works because cookies are attached based on the destination, so the forged request arrives authenticated. What the attacker cannot do is *read* content from your origin — the Same-Origin Policy prevents that. An anti-CSRF token exploits exactly this asymmetry: the legitimate page contains a random value the attacker has no way to obtain, so a request without the correct token is rejected. The browser still sends the request and the cookie; it simply lacks the one ingredient only your own origin can supply.',
        hint: 'The attacker can make the browser *send* a request. What can they still not do, and how does the token use that?',
      },
    },

    {
      id: 'bweb-i-05',
      title: 'Server-Side Request Forgery',
      read: `**SSRF** makes the *server* issue attacker-chosen requests. Because the server sits inside your network and often holds privileged credentials, SSRF turns a web app into a proxy into your infrastructure. It is serious enough to have its own OWASP Top 10 category.

## Where it comes from

Any feature where the app fetches a URL supplied (or influenced) by the user: "import from URL", webhooks, link preview and unfurling, PDF/HTML rendering, image fetching and thumbnailing, XML parsers resolving external entities, file uploads "by URL", integrations that call a configurable endpoint.

## Why it is dangerous

The attacker gets the server's network position:

- **Reach internal services** not exposed to the internet — admin panels, databases, message queues, Kubernetes APIs, internal APIs with no authentication because "only internal systems can reach them".
- **Read cloud metadata.** The classic escalation: requesting \`http://169.254.169.254/...\` on a cloud instance returns instance metadata — historically including **temporary IAM credentials**, which turns SSRF into cloud account compromise. (This is why IMDSv2, which requires a session token and blocks naive SSRF, should be enforced.)
- **Port-scan the internal network** by observing response times, status codes or error differences.
- **Reach \`localhost\`** services bound only to the loopback interface.

## Defending it

1. **Allow-list destinations.** The strongest control: permit only specific hosts/domains (and schemes and ports) the feature legitimately needs. Deny-listing internal ranges is weak — attackers bypass it with decimal/octal/IPv6 encodings, redirects, DNS names that resolve to internal IPs, and **DNS rebinding** (a name that passes validation then resolves to an internal address when actually fetched).
2. **Resolve and validate, then connect to the resolved address** — do the DNS resolution yourself, check the resulting IP is not private/loopback/link-local, and connect to that IP, to close the validate-then-resolve (TOCTOU/rebinding) gap.
3. **Restrict schemes** to \`http\`/\`https\` — block \`file://\`, \`gopher://\`, \`ftp://\`, and similar.
4. **Do not follow redirects** blindly; re-validate each hop, since a permitted host can redirect to \`169.254.169.254\`.
5. **Network-level containment** (defence in depth): egress filtering so the app server simply cannot reach internal ranges or the metadata endpoint, and enforcing IMDSv2. This protects you even when the application check is bypassed.
6. **Don't reflect the response** to the user where avoidable, and keep errors generic — blind SSRF is far less useful to an attacker.

SSRF is a reminder that *the server's* network position is an asset an attacker wants. Allow-list where it may go, validate the resolved address, and back it with egress controls.`,
      sample: {
        lang: 'text',
        caption: 'SSRF reaching cloud metadata, and the layered defence',
        code: `Feature: POST /preview  { "url": "https://example.com/page" }

ATTACK:
  { "url": "http://169.254.169.254/latest/meta-data/iam/
            security-credentials/app-role" }
  -> the SERVER fetches it and returns temporary IAM credentials
  -> SSRF becomes cloud account compromise.
  (also: http://localhost:9200, http://10.0.0.5:8080/admin, file:///etc/passwd)

DEFENCE:
  1. allow-list hosts/schemes/ports the feature actually needs
  2. resolve DNS yourself; reject private/loopback/link-local IPs;
     connect to the RESOLVED ip (defeats DNS rebinding)
  3. don't follow redirects blindly - re-validate every hop
  4. egress filtering + IMDSv2 so it fails even if the check is bypassed`,
        output: `SSRF hands the attacker your SERVER's network position: internal
services, localhost, and cloud metadata (IAM credentials).
Defend by allow-listing destinations, validating the RESOLVED
address and connecting to it, restricting schemes, re-validating
redirects - plus egress filtering and IMDSv2 as containment.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is deny-listing internal IP ranges a weak defence against SSRF, and what is the stronger approach?',
        options: [
          'Deny-lists are slow to evaluate',
          'Attackers bypass deny-lists with alternative encodings, redirects, DNS names that resolve to internal addresses, and DNS rebinding — so the stronger approach is to allow-list permitted destinations, resolve the name yourself and validate the resulting IP before connecting to it, backed by egress filtering',
          'Internal IP ranges change too often to list',
          'Deny-listing works fine; no stronger approach exists',
        ],
        answer: 1,
        explain:
          'A deny-list must anticipate every representation of "internal", and attackers have many: decimal or octal encodings of an address, IPv6 forms, a public DNS name that resolves to 127.0.0.1 or 169.254.169.254, an allowed host that issues a redirect, or DNS rebinding where the name passes your check and then resolves elsewhere when the connection is actually made. Allow-listing inverts the burden to known-good destinations; resolving the hostname yourself, validating the resulting IP, and connecting to that address closes the validate-then-resolve gap. Egress filtering and IMDSv2 contain the damage if all of that fails.',
        hint: 'How many ways can an attacker write, or arrange to reach, an internal address?',
      },
    },

    {
      id: 'bweb-i-06',
      title: 'Path traversal and file access',
      read: `When user input influences a **file path**, an attacker will try to escape the intended directory. **Path traversal** (directory traversal) uses \`../\` sequences to reach files elsewhere on the filesystem.

## The attack

\`\`\`
GET /download?file=report.pdf          -> /var/app/files/report.pdf
GET /download?file=../../etc/passwd    -> /etc/passwd
\`\`\`

Targets worth stealing: \`/etc/passwd\` (user list), application source code and configuration, \`.env\` files with credentials, SSH keys, database files, cloud credential files. On Windows, \`..\\\` and absolute paths like \`C:\\\` do the same.

## Evasion to expect

A naive check for the literal string \`../\` fails against:

- **URL encoding** — \`%2e%2e%2f\`, and **double encoding** — \`%252e%252e%252f\`.
- **Backslashes** and mixed separators on Windows.
- **Absolute paths** — \`/etc/passwd\` with no traversal at all.
- **Nested sequences** — \`....//\` collapses to \`../\` if you strip \`../\` once.
- **Unicode/overlong encodings** and null bytes in older stacks.

This is the canonicalization lesson: decode and normalize *before* checking, and never rely on stripping.

## The robust fix

Do not build paths from user input at all where you can avoid it:

1. **Best — don't use the filename as a path.** Store an ID → real path mapping (in the database) and look it up. The user sends \`id=482\`; the server knows the path. Traversal becomes impossible because no user text reaches the filesystem.
2. **If you must**, take only the **base name** (strip all directory components), then **resolve the full canonical path** and verify it is **inside** the intended directory before opening it. Resolving first and checking containment defeats encodings, \`....//\`, symlinks and absolute paths in one step — because you check the *final, real* path, not the input text.
3. **Allow-list** the permitted names/extensions as well.
4. **Least privilege** on the filesystem: the app user should not be able to read sensitive files at all, so a missed check yields little.

## The same shape elsewhere

The identical risk appears in archive extraction (**Zip Slip** — entries named \`../../etc/cron.d/x\` escaping the extraction directory), in template/include paths (local file inclusion), and in anything that maps a name to a resource. In every case: resolve to a canonical path and confirm it stays within the boundary — or avoid user-controlled paths entirely.`,
      sample: {
        lang: 'python',
        caption: 'Resolve-then-contain beats any amount of string filtering',
        code: `BASE = Path("/var/app/files").resolve()

# WEAK - string filtering; bypassed by %2e%2e%2f, ....//, absolute paths
if ".." in name: abort(400)

# ROBUST - strip directories, resolve, then verify containment
candidate = (BASE / Path(name).name).resolve()
if not candidate.is_relative_to(BASE) or not candidate.is_file():
    abort(404)
return send_file(candidate)

# BEST - never let user text reach the filesystem
row = Document.query.filter_by(id=doc_id, user_id=current_user.id).first()
return send_file(row.stored_path)`,
        output: `Path traversal escapes the intended directory with ../ (and its
many encodings). String filtering loses. Resolve the canonical
path and verify it stays INSIDE the base directory - or better,
map an ID to a stored path so no user text touches the
filesystem. Same shape as Zip Slip and file inclusion.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is resolving the requested path and checking it lies inside the intended directory more robust than filtering out `../` from the input?',
        options: [
          'Resolving the path is faster than string matching',
          'Because it validates the final, real path the code will open — so encodings (%2e%2e%2f), double encoding, `....//`, absolute paths and symlinks are all handled at once — whereas string filtering must anticipate every textual representation and inevitably misses some',
          'Because `../` is not actually used in traversal attacks',
          'Because it prevents the file from being read at all',
        ],
        answer: 1,
        explain:
          'String filtering operates on the attacker’s representation, and there are endless representations: percent-encoded, double-encoded, backslash variants, nested `....//` that survives a single strip, absolute paths that need no traversal, and symlinks that redirect after the check. Canonical resolution collapses all of that into the one path the filesystem will actually use; confirming that path is contained within the intended base directory then gives a single check that holds regardless of how the input was written. Better still is to avoid mapping user text to paths at all.',
        hint: 'Are you checking the attacker’s text, or the file the code will really open?',
      },
    },

    {
      id: 'bweb-i-07',
      title: 'Business logic and race conditions',
      read: `Some of the most damaging web flaws involve no malformed input at all. **Business-logic vulnerabilities** arise when the application's *rules* can be subverted using entirely valid requests, in an order or combination the designer never considered. Scanners rarely find these; they require understanding what the app is *supposed* to do.

## Typical logic flaws

- **Workflow bypass** — skipping a step in a multi-stage process by requesting a later endpoint directly (going straight to \`/checkout/confirm\` without paying; completing a password reset without the email step).
- **Price and quantity manipulation** — trusting a client-supplied price (the hidden-field lesson), negative quantities producing a credit, or a discount that can be applied repeatedly.
- **Coupon and limit abuse** — reusing a single-use code, stacking promotions, exceeding a per-user cap by using a second path.
- **Insufficient validation of state transitions** — cancelling an order after it shipped, refunding twice, re-activating a closed account.
- **Parameter abuse within legitimate ranges** — transferring a negative amount to reverse the direction of a transfer.

The common cause: **rules enforced in the UI or assumed by the flow, rather than checked server-side at each step**. The fix is to validate the *invariants* — server-side, on every transition: does this user own this cart, is this state transition legal from the current state, is the price the one the server computed, is the coupon still unused?

## Race conditions (TOCTOU)

A special and frequently missed case: **time-of-check to time-of-use**. If an app checks a condition and then acts on it non-atomically, an attacker who sends many simultaneous requests can slip between the two.

Classic examples: redeeming a gift card or coupon many times concurrently (every request checks "unused" before any marks it used), withdrawing more than a balance, exceeding a rate or seat limit, or double-spending a credit. Modern tooling makes these easy to exploit (single-packet and parallel-request attacks).

**Defences:** make check-and-act **atomic** — database transactions with appropriate isolation, \`SELECT ... FOR UPDATE\` row locks, a conditional update (\`UPDATE coupons SET used=true WHERE id=? AND used=false\` and require one affected row), unique constraints that make a duplicate impossible, or idempotency keys so a repeated operation has no extra effect. Never "check, then later write" across a gap.

## Finding logic flaws

You cannot scan for these — you **reason** about them. Map the intended workflow, then ask at each step: what if I skip it? repeat it? do it out of order? send a negative or enormous value? do two at once? use another user's object here? Threat-model the *business rules*, not just the inputs.`,
      sample: {
        lang: 'sql',
        caption: 'A race condition in coupon redemption, and the atomic fix',
        code: `-- VULNERABLE: check, then act (a gap an attacker races into)
SELECT used FROM coupons WHERE code = 'SAVE50';   -- false, in 20 threads
-- ... application logic ...
UPDATE coupons SET used = TRUE WHERE code = 'SAVE50';
-- 20 concurrent requests all saw used=false -> discount applied 20x

-- FIXED: one atomic conditional update; require exactly one row
UPDATE coupons SET used = TRUE
WHERE code = 'SAVE50' AND used = FALSE;
-- rows affected = 1 -> proceed;  0 -> already used, reject
-- (or SELECT ... FOR UPDATE inside a transaction, or a unique constraint)`,
        output: `Business-logic flaws use perfectly valid requests in an order or
combination nobody planned for: workflow bypass, price/quantity
manipulation, coupon reuse, illegal state transitions. Race
conditions (TOCTOU) exploit the gap between check and act - fix
with atomic conditional updates, row locks, unique constraints
or idempotency keys. Scanners miss these; reasoning finds them.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An attacker redeems a single-use coupon 20 times by sending 20 requests simultaneously. What kind of flaw is this and how is it fixed?',
        options: [
          'SQL injection; fix with parameterized queries',
          'A race condition (time-of-check to time-of-use): all requests read the coupon as unused before any marked it used — fix by making check-and-act atomic, e.g. a conditional update that only succeeds when still unused, a row lock in a transaction, or a unique constraint',
          'Cross-site scripting; fix with output encoding',
          'Broken authentication; fix with MFA',
        ],
        answer: 1,
        explain:
          'Nothing was injected and every request was legitimate — the flaw is the non-atomic gap between checking "is this coupon unused?" and writing "now it is used". Concurrent requests all pass the check before any performs the write. The fix is to collapse the two into one atomic operation: an `UPDATE ... WHERE used = FALSE` that must affect exactly one row, a `SELECT ... FOR UPDATE` row lock inside a transaction, a unique constraint that rejects duplicates, or an idempotency key. TOCTOU races are a distinct class from injection or auth failures and need this concurrency-aware fix.',
        hint: 'What happens between "check that it is unused" and "mark it used" when 20 requests arrive at once?',
      },
    },

    {
      id: 'bweb-i-08',
      title: 'API security',
      read: `Modern applications are mostly **APIs** consumed by single-page apps and mobile clients. APIs share the web's vulnerabilities but shift the emphasis, which is why OWASP publishes a separate **API Security Top 10**.

## The dominant API risks

- **Broken Object-Level Authorization (BOLA)** — the API name for IDOR, and the number-one API risk. APIs expose object IDs everywhere, so every endpoint needs an ownership check (the earlier lesson, applied to every route and method).
- **Broken Object-Property-Level Authorization** — covering both **mass assignment** and **excessive data exposure**.
- **Broken Function-Level Authorization** — a user reaching an admin endpoint because only the UI hid it.
- **Unrestricted resource consumption** — no rate limiting or pagination, so an API can be scraped or used to exhaust resources.

## Mass assignment

If the API binds the whole request body onto a model, an attacker adds fields you never intended to be settable:

\`\`\`
PUT /api/users/me   {"name": "Alice", "role": "admin", "credits": 99999}
\`\`\`

**Fix:** bind explicitly. Use a DTO/schema listing exactly the fields a client may set (an **allow-list**), and never pass raw request bodies into model constructors or \`update(**body)\`. Deny-listing sensitive fields fails as soon as someone adds a new one.

## Excessive data exposure

A common API mistake is returning the whole object and letting the client hide fields — so the JSON contains password hashes, internal flags, other users' details or PII that the UI never shows but anyone can read. **Fix:** serialize explicitly with a response schema containing only the fields that client is entitled to. Filter at the server, never in the UI.

## GraphQL specifics

GraphQL adds its own edges: **deeply nested or recursive queries** can be catastrophically expensive (defend with query depth/complexity limits, cost analysis and timeouts); **introspection** may reveal the whole schema (disable in production if it aids attackers); **batching** can be abused to brute-force (rate-limit by operation, not just by request); and authorization must be enforced in **every resolver** — a single unprotected field exposes data regardless of the parent query's checks.

## Practical API hardening

**Authenticate every endpoint** (no "internal" endpoints assumed unreachable), **rate-limit** per user and per IP, **validate request schemas strictly** (reject unknown fields), **paginate and cap** result sizes, **version and inventory** your endpoints (shadow/zombie APIs — old or undocumented versions still deployed — are a frequent breach path), and **log** API access for detection.

An API is the application with the UI removed: nothing is hidden, everything is directly callable, so every check must be explicit and server-side.`,
      sample: {
        lang: 'js',
        caption: 'Mass assignment and over-exposure, and their explicit fixes',
        code: `// VULNERABLE - binds whatever the client sent
await User.update(req.body, { where: { id: req.user.id } });
// {"name":"Alice","role":"admin","credits":99999}  -> privilege escalation

// FIXED - explicit allow-list of settable fields
const { name, avatarUrl } = req.body;
await User.update({ name, avatarUrl }, { where: { id: req.user.id } });

// VULNERABLE - returns the whole record
res.json(user);          // includes passwordHash, isAdmin, internalNotes...

// FIXED - explicit response schema
res.json({ id: user.id, name: user.name, avatarUrl: user.avatarUrl });`,
        output: `APIs are the app with the UI removed: nothing is hidden.
Top risks: BOLA (ownership checks on every route/method), mass
assignment (bind an explicit allow-list), excessive data exposure
(serialize explicitly), function-level authorization, and
unrestricted consumption (rate limit, paginate). GraphQL adds
depth/complexity limits and per-resolver authorization.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An API endpoint updates a user by binding the entire JSON request body to the user model. An attacker sends `{"name":"Alice","role":"admin"}` and becomes an administrator. What is this flaw and its fix?',
        options: [
          'SQL injection; use parameterized queries',
          'Mass assignment — the app bound fields the client should not control — fixed by binding an explicit allow-list of permitted fields (a DTO/schema) rather than passing the raw body into the model, since deny-listing sensitive fields breaks as soon as a new one is added',
          'Cross-site request forgery; add a CSRF token',
          'A race condition; add a database lock',
        ],
        answer: 1,
        explain:
          'Mass assignment occurs when a framework maps every key in the request body onto model attributes, so an attacker can set properties the interface never exposes — roles, credit balances, verification flags, ownership. The robust fix is positive: extract only the specific fields a client is permitted to set and pass those, so any extra key is simply ignored. Deny-listing known-sensitive fields is fragile because the next sensitive attribute someone adds will not be on the list. It pairs with explicit response serialization to prevent the mirror-image problem of excessive data exposure.',
        hint: 'The attacker added a field the UI never sends. Should you list what is forbidden, or what is allowed?',
      },
    },

    {
      id: 'bweb-i-09',
      title: 'Cryptographic failures',
      read: `**Cryptographic failures** (OWASP's renamed "sensitive data exposure") cover the ways applications fail to protect data properly — usually not by breaking cryptography, but by not using it, or using it wrongly.

## First: classify the data

Before choosing controls, know what you hold — passwords, payment data, health records, personal data, tokens, session material — and what regulation applies (GDPR, PCI DSS, HIPAA). **The most reliable protection is not storing sensitive data at all**: don't retain card numbers (tokenize via the payment processor), don't keep data past its purpose, minimise what you collect.

## Protect data in transit and at rest

- **In transit** — TLS everywhere with modern versions/ciphers and HSTS (the beginner lesson), including *internal* service-to-service traffic, which is often left plaintext on the assumption the network is trusted.
- **At rest** — encrypt sensitive fields or storage (database/disk encryption, field-level encryption for the most sensitive), and protect backups the same way. Remember encryption at rest mainly defends against stolen media/files, not against an application-level flaw that queries the data legitimately — it is one layer, not the answer to everything.

## Use the right primitive for the job

- **Passwords → slow, salted password hashing** (Argon2/bcrypt/scrypt). Never encryption (reversible), never a fast hash.
- **Data you must read back → authenticated encryption** (AES-GCM, ChaCha20-Poly1305), which provides confidentiality *and* integrity. Plain AES-CBC without a MAC invites tampering attacks.
- **Integrity/fingerprints → SHA-256+**; never MD5 or SHA-1 for security purposes (both are broken for collision resistance).
- **Randomness → a cryptographically secure RNG** (\`secrets\`, \`crypto.randomBytes\`, \`SecureRandom\`) for tokens, session IDs, salts and keys — never \`Math.random()\` or a seeded PRNG, which are predictable.
- **Never invent your own algorithm or protocol**, and never roll your own crypto primitives. Use vetted, maintained libraries and high-level APIs (libsodium, your platform's crypto library) that make correct use the default.

## Key management is the hard part

Keys are what everything depends on, and the usual failure is where they live: **hardcoded in source**, committed to git, sitting in a config file next to the encrypted data, or shared across environments. Use a **secrets manager or KMS/HSM**, keep keys out of source control (scan for leaks), restrict access, support **rotation**, and use **separate keys per environment and purpose**. Encryption with a key stored beside the ciphertext protects almost nothing.

The recurring theme: cryptography usually fails at the edges — missing entirely, applied with the wrong primitive, using predictable randomness, or with keys stored carelessly. Choose vetted primitives for the right purpose, and manage keys properly.`,
      sample: {
        lang: 'python',
        caption: 'Common crypto failures and their corrections',
        code: `# WRONG - reversible, so a breach yields real passwords
store(encrypt(password, KEY))
# RIGHT - one-way, salted, slow
store(argon2.hash(password))

# WRONG - predictable token (Math.random / seeded PRNG equivalents)
token = str(random.random())
# RIGHT - cryptographically secure randomness
token = secrets.token_urlsafe(32)

# WRONG - MD5 for integrity; AES-CBC with no authentication
digest = hashlib.md5(data).hexdigest()
# RIGHT - modern hash; authenticated encryption
digest = hashlib.sha256(data).hexdigest()
ct = AESGCM(key).encrypt(nonce, data, aad)

# WRONG - key in source control.  RIGHT - from a KMS/secrets manager.`,
        output: `Crypto rarely fails by being broken - it fails by being absent,
misapplied or mis-keyed. Don't store what you don't need; TLS
everywhere (including internal); passwords get slow salted
HASHES, readable data gets AUTHENTICATED encryption; use a CSPRNG;
never roll your own. And manage KEYS in a KMS, rotated, never in git.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A developer stores user passwords using AES encryption so support staff can recover them if asked. What is wrong with this?',
        options: [
          'Nothing — AES is a strong algorithm',
          'Encryption is reversible, so anyone who obtains the key (from source control, config, a breach, or an insider) recovers every password in plaintext; passwords must be stored with a one-way, salted, slow hash (Argon2/bcrypt/scrypt) because the system never needs to read them back — only verify them',
          'AES is too slow for password storage',
          'AES cannot handle long passwords',
        ],
        answer: 1,
        explain:
          'The strength of AES is not the issue; the choice of primitive is. Encryption is designed to be reversed, so the recoverability the team wants is exactly the property an attacker exploits — one leaked key, and every password is plaintext (and, through reuse, so are users’ accounts elsewhere). Verifying a login never requires recovering the original: hash the candidate and compare. Slow, salted password hashes make a stolen database expensive to crack, and "support can recover it" should be replaced by a secure reset flow.',
        hint: 'Does the system ever need to read the password back, or only to check it?',
      },
    },

    {
      id: 'bweb-i-10',
      title: 'Vulnerable and outdated components',
      read: `Modern applications are mostly **other people's code** — frameworks, libraries and transitive dependencies. A vulnerability in any of them is a vulnerability in your app, and "vulnerable and outdated components" is a standing OWASP Top 10 risk because it is so widespread and so heavily exploited.

## Why it is such a common breach path

- A typical project pulls in hundreds or thousands of packages, most of them **transitively** (dependencies of dependencies) that nobody chose deliberately.
- Public vulnerabilities come with **public exploits**, and internet-wide scanning for a newly disclosed flaw starts within hours (Log4Shell, Struts, Spring4Shell and many others were exploited at scale almost immediately).
- Teams often don't know which versions they run, so they cannot answer "are we affected?" quickly.

## The practices that manage it

1. **Know what you ship** — maintain an **SBOM** (Software Bill of Materials) so the question "do we run the affected version, and where?" is a query rather than a week-long hunt. Speed of answering *is* the control.
2. **Scan continuously** — **SCA** (Software Composition Analysis) tools (Dependabot, Renovate, Snyk, Trivy, \`npm audit\`, \`pip-audit\`, OWASP Dependency-Check) match your dependency tree against vulnerability databases and open pull requests. Run them in CI so new issues surface on every build, not once a year.
3. **Patch on a schedule, and urgently when needed** — a defined process for routine updates plus an emergency path for critical, actively exploited flaws. Staying reasonably current also makes emergency upgrades feasible; badly outdated dependencies turn a one-line patch into a migration project.
4. **Pin and verify** — lockfiles with integrity hashes so builds are reproducible and you get exactly the reviewed version; verify signatures/provenance where available.
5. **Reduce the dependency surface** — fewer, better-maintained packages. Evaluate before adding: is it maintained, widely used, reasonably sized? Removing an unused dependency eliminates its risk entirely.

## Supply-chain risk beyond known CVEs

The dependency is also an attack vector in itself: **typosquatted** package names, **hijacked maintainer accounts** publishing a malicious version, and **dependency confusion** (a public package shadowing your internal one). Mitigations include scoping internal packages, pinning versions, reviewing updates rather than auto-merging blindly, and monitoring for anomalous package behaviour.

## Prioritise sensibly

Not every CVE matters equally: consider whether the vulnerable code path is actually reachable in your usage, whether the component is internet-exposed, and whether an exploit exists in the wild (CISA's KEV catalogue is a good prioritisation input). The goal is fast, informed response — an inventory, continuous scanning, and a patch process — rather than chasing every advisory equally.`,
      sample: {
        lang: 'bash',
        caption: 'Continuous dependency scanning, and answering "are we affected?"',
        code: `# in CI, on every build
npm audit --audit-level=high
pip-audit -r requirements.txt
trivy fs --scanners vuln,license .

# SBOM makes exposure assessment a query, not a hunt
syft dir:. -o spdx-json > sbom.json
grep -A2 '"name": "log4j-core"' sbom.json | grep version`,
        output: `high severity: Prototype Pollution in lodash <4.17.21
  path: app > some-lib > lodash@4.17.15   (transitive!)
  fix: upgrade some-lib to 2.3.0

"version": "2.17.1"    <- affected range: <2.17.1 -> we are patched
# The SBOM answers exposure in seconds; the scanner catches the
# transitive dependency nobody chose deliberately.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A critical vulnerability is announced in a widely used library. Why does maintaining an SBOM and continuous dependency scanning matter so much at that moment?',
        options: [
          'They automatically rewrite the vulnerable code',
          'They let you determine immediately which of your applications and versions include the affected component — including transitive dependencies nobody chose deliberately — so you can patch the exposed systems before internet-wide scanning and public exploits reach them',
          'They prevent the vulnerability from being disclosed',
          'They only matter for open-source projects',
        ],
        answer: 1,
        explain:
          'Exploitation of a newly disclosed, widely deployed vulnerability typically begins within hours, so the decisive factor is how fast you can answer "where do we run the affected version?" An SBOM turns that from a frantic audit across every service and image into a lookup, and continuous SCA scanning surfaces the affected package — often a transitive dependency no developer selected — along with the fix. Together they compress exposure assessment and patching into the window before mass scanning finds you.',
        hint: 'When exploitation starts within hours, what determines whether you patch in time?',
      },
    },

    {
      id: 'bweb-i-11',
      title: 'Security misconfiguration',
      read: `**Security misconfiguration** is one of the most frequently encountered OWASP risks, because it can appear anywhere in the stack — application, framework, web server, database, container, cloud — and it usually results from a default left in place or a setting nobody revisited.

## The usual suspects

- **Default credentials** left unchanged on an admin panel, database, dashboard or device. Still a leading cause of real breaches.
- **Unnecessary features enabled** — sample applications, admin consoles, debug endpoints, unused HTTP methods, directory listing, verbose banners.
- **Debug mode in production** — exposing configuration, stack traces and sometimes code execution (the error-handling lesson).
- **Missing security headers** — HSTS, CSP, \`nosniff\`, \`frame-ancestors\` (the amateur-level baseline).
- **Overly permissive CORS** — \`Access-Control-Allow-Origin: *\` on authenticated endpoints, or reflecting the requesting origin with credentials allowed, which hands other sites the ability to read your users' data and effectively undoes the Same-Origin Policy.
- **Public cloud storage** — an S3 bucket or equivalent left world-readable, a perennial source of mass data exposure.
- **Over-permissive cloud IAM** — wildcard permissions granted because it was quicker than scoping them.
- **Unpatched or default-configured infrastructure** — the platform beneath the app.

## Why it recurs

Defaults favour convenience and broad compatibility, not security; environments drift as people make temporary changes that become permanent; and configuration lives in many places (code, containers, orchestration, cloud console) so no single person sees it all.

## The controls

1. **Hardened, repeatable baselines** — build configuration as code (infrastructure-as-code, container images, config management) so every environment is identical and reviewed, rather than hand-tuned. This is the same config-as-code lesson from the host tracks.
2. **Minimal footprint** — install and enable only what is needed; remove sample apps, unused features and dormant accounts. Less enabled means less to misconfigure.
3. **A hardening checklist per component**, derived from vendor and CIS guidance, applied and verified.
4. **Automated verification** — scan for misconfiguration continuously: header/TLS scanners, cloud posture management (CSPM) for public buckets and wide IAM, container/image scanning, and tests that assert security-relevant settings.
5. **Separate environments properly** — no production data or credentials in development and staging; different keys per environment.
6. **Review configuration changes** like code, and re-scan after every deployment, because drift is continuous.

Misconfiguration is rarely subtle — it is usually an unchanged default or a forgotten setting. The defence is equally unglamorous: standardise, minimise, automate the verification, and re-check continuously.`,
      sample: {
        lang: 'text',
        caption: 'A CORS misconfiguration that undoes the Same-Origin Policy',
        code: `DANGEROUS - reflects any origin AND allows credentials:
  Access-Control-Allow-Origin: https://evil.example   (reflected)
  Access-Control-Allow-Credentials: true
  -> evil.example's JavaScript can now READ authenticated responses
     from your API using the victim's cookies. SOP effectively gone.

ALSO DANGEROUS on authenticated endpoints:
  Access-Control-Allow-Origin: *

CORRECT - an explicit allow-list of origins that truly need access:
  if origin in {"https://app.example.com"}:
      Access-Control-Allow-Origin: <that origin>
      Access-Control-Allow-Credentials: true`,
        output: `Misconfiguration appears anywhere: default credentials, debug
mode, directory listing, missing headers, permissive CORS, public
buckets, wildcard IAM. Defend with hardened baselines as CODE,
a minimal footprint, per-component checklists, and CONTINUOUS
automated verification - because environments drift.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An API reflects whatever `Origin` the requester sends into `Access-Control-Allow-Origin` and sets `Access-Control-Allow-Credentials: true`. Why is this dangerous?',
        options: [
          'It makes API responses slower to load',
          'It lets any website read authenticated responses from your API using the victim’s cookies — the reflection plus credentials effectively removes the Same-Origin Policy protection — so origins must instead be checked against an explicit allow-list',
          'It blocks legitimate clients from calling the API',
          'It only affects requests made without cookies',
        ],
        answer: 1,
        explain:
          'The Same-Origin Policy normally stops a malicious site from reading responses from your API even though the browser attaches the victim’s cookies. Reflecting the requesting origin tells the browser that *that* origin is permitted, and allowing credentials means the cookies are sent and the response is readable — so any site the victim visits can pull their data out of your API. It converts the CSRF-style "can send but not read" limitation into full read access. The fix is to compare the origin against a small explicit allow-list and echo only permitted values.',
        hint: 'If you echo back whatever origin asks, which origins end up permitted — and what can they now read?',
      },
    },

    {
      id: 'bweb-i-12',
      title: 'Project: threat-model and test access control',
      read: `Bring the level together with the two activities that find what scanners cannot: a **threat model** of the application's logic, and a **systematic access-control test**.

## Part 1 — threat-model the application

Take your lab app (or a real app you own) and work through the method from the Linux skilled level, applied to the web:

1. **Draw the flows** — users, roles, endpoints, data stores, third-party services, and the trust boundaries between them.
2. **Enumerate the objects and actions** — for every resource type (order, document, user, file), list the operations (create, read, update, delete, share, export) and who *should* be able to perform each.
3. **Walk STRIDE per flow**, focusing on the logic: **Spoofing** (can identity be faked?), **Tampering** (can data or prices be altered?), **Repudiation** (is it logged?), **Information disclosure** (excessive exposure, errors), **Denial of service** (unbounded queries, no rate limits), **Elevation of privilege** (vertical/horizontal access control).
4. **Reason about the workflows** — for each multi-step process: what if I skip a step, repeat it, reorder it, run two at once, or supply a negative/huge value?

## Part 2 — test access control systematically

Authorization needs a **matrix**, not spot checks. Build one: rows are endpoints (every method and every entry point — API, GraphQL, export, file download), columns are actors (anonymous, user A, user B, lower-privileged role, admin). Then, for each cell, issue the request and record the result against what the model says it *should* be.

The mechanical core is the **two-account replay test** from the IDOR step: capture each request as user A, replay it with user B's session and with no session, and confirm you get 404/401 rather than A's data. Do it for reads *and* writes, and for IDs hidden in bodies and tokens.

## Part 3 — probe the rest of the level

With the model in hand, check the specific classes: **CSRF** (does every state-changing route require a token? any state-changing GETs?), **SSRF** (any URL-fetching feature — where can it be pointed?), **path traversal** (any filename in a request?), **mass assignment** (does adding \`"role":"admin"\` change anything?), **excessive exposure** (what extra fields are in the JSON?), **CORS**, headers, and dependency scan results.

## The measure of success

You can produce, for an application: a **threat model** identifying its logic and authorization risks, a completed **access-control matrix** with every cell verified by an actual request, and a prioritised list of findings with the *structural* fix for each.

> The level distilled: input-handling defences do not touch this class of flaw. **Access control must be designed** — deny by default, centralized, server-side, identity from the session, ownership checked at the data layer — and **verified by testing every endpoint against every actor**. CSRF, SSRF, traversal, mass assignment and logic flaws each come from trusting something about the *request's context* (its origin, its target, its fields, its order) rather than its characters. Model the trust, then test it.`,
      sample: {
        lang: 'text',
        caption: 'An access-control matrix, verified by real requests',
        code: `Endpoint                    anon    user A   user B   admin   expected?
--------------------------------------------------------------------------
GET  /api/orders/{A's id}   401 ok  200 ok   200 !!   200 ok   B MUST be 404
PUT  /api/orders/{A's id}   401 ok  200 ok   403 ok   200 ok   ok
DELETE /api/users/{id}      401 ok  403 ok   403 ok   200 ok   ok
GET  /admin/users           302 ok  403 ok   403 ok   200 ok   ok
GET  /api/admin/users       401 ok  200 !!   200 !!   200 ok   API not guarded!
GET  /export/orders.csv     401 ok  200 ok   200 !!   200 ok   B MUST be 404

!! = finding. Note the API behind the guarded admin PAGE was missed -
     the classic "page protected, endpoint not" gap.`,
        output: `Threat-model the logic (objects, actions, who may do what,
workflow order), then verify authorization with a MATRIX -
every endpoint and method against every actor, by actually
sending the requests. The two-account replay test finds IDOR;
the matrix finds the endpoint everyone forgot to guard.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is building an access-control matrix (every endpoint and method against every actor) more effective than spot-checking a few pages?',
        options: [
          'It produces nicer documentation for auditors',
          'Access-control gaps are failures of omission — a forgotten method, an API behind a protected page, an export or GraphQL path — so only systematically testing every endpoint against every actor reveals the specific cell that was missed, which spot checks reliably skip',
          'Because spot checks cannot be automated',
          'Because matrices detect injection flaws as well',
        ],
        answer: 1,
        explain:
          'Broken access control rarely means the whole app is unprotected; it means one route, one HTTP method, or one alternate path to the same data was never wired into the check — commonly the JSON API behind a guarded HTML page, a write method when reads were covered, or an export/GraphQL resolver. Spot checks confirm the paths someone thought about, which are precisely the ones likely to be correct. Enumerating endpoints against actors and actually issuing each request surfaces the omission, and the same matrix becomes a regression test so a refactor cannot silently drop a check.',
        hint: 'If the flaw is the one endpoint somebody forgot, which approach will find it?',
      },
    },
  ],
}

export default level
