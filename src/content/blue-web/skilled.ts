import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Building security into the application',
  summary:
    'Move from fixing bugs to engineering security in: threat modelling and secure design, modern authentication (OAuth/OIDC/JWT) done right, secrets management, secure SDLC with SAST/DAST/SCA in CI, WAFs and runtime protection, secure defaults and frameworks, application logging and detection, and secure deployment.',
  outcomes: [
    'Threat-model an application and apply secure design patterns',
    'Implement OAuth 2.0, OIDC and JWT correctly',
    'Manage secrets and multi-tenant isolation safely',
    'Build a secure SDLC with SAST, DAST, SCA and security tests in CI',
    'Deploy WAF/RASP appropriately and know their limits',
    'Instrument an app for attack detection and response',
  ],
  steps: [
    {
      id: 'bweb-s-01',
      title: 'Threat modelling an application',
      read: `Fixing vulnerabilities one at a time is reactive. **Threat modelling** is how you find design-level problems *before* they are built — and it catches the flaws that no scanner or code review will, because they live in the architecture rather than in a line of code.

## The method

The four questions (Shostack's framing), applied to an application:

1. **What are we building?** Draw a **data flow diagram**: external entities (users, third-party services), processes (services, functions), data stores (databases, caches, buckets), the flows between them, and — critically — the **trust boundaries** they cross (internet → app, app → database, tenant → tenant, user → admin).
2. **What can go wrong?** Walk **STRIDE** at each element and each boundary crossing: **S**poofing (identity), **T**ampering (integrity), **R**epudiation (logging), **I**nformation disclosure (confidentiality), **D**enial of service (availability), **E**levation of privilege (authorization).
3. **What are we going to do about it?** Choose a mitigation per credible threat — or explicitly accept the risk, transfer it, or remove the feature.
4. **Did we do a good job?** Review it, and update the model when the design changes. A threat model is a living document, not a one-off deliverable.

## Where the value is

Trust boundaries are the highest-yield places to look, because that is where data changes hands and assumptions break: every input crossing into your app, every call out to a dependency, every place one tenant's data sits beside another's, every privilege transition. Ask at each: *what does this side assume about the other, and what if that assumption is false?*

## When to do it

- **At design time**, for new features and services — the cheapest moment to change an architecture.
- **When the architecture changes** — a new integration, a new data store, a new authentication method.
- **Lightweight and continuous** beats heavyweight and annual: a short model per feature, in the design doc, is far more valuable than a 90-page document nobody rereads.

## The output

A list of **specific, prioritised threats with owners and mitigations**, plus a set of **security requirements** and **abuse cases** the team can design and test against — "an attacker must not be able to read another tenant's documents", "an attacker who steals a refresh token must not gain permanent access". Those become the authorization tests and detections from earlier levels.

Threat modelling is the skilled defender's highest-leverage activity, because design flaws are the expensive ones: an injection bug is a one-line fix, but "the design assumes the client enforces the tenant boundary" is a rewrite.`,
      sample: {
        lang: 'text',
        caption: 'STRIDE applied at a trust boundary',
        code: `Flow: browser --(HTTPS)--> API --(SQL)--> shared multi-tenant DB
Trust boundaries: internet|API, API|DB, tenantA|tenantB

Element/Flow        STRIDE    Threat                     Mitigation
---------------------------------------------------------------------------
browser -> API      S         session theft via XSS      HttpOnly, CSP
                    T         parameter/price tampering  server-side recompute
                    E         horizontal access (IDOR)   scope query by tenant
API -> DB           I         creds in source            KMS/secrets manager
                    E         over-privileged DB user    least-privilege role
tenantA | tenantB   I         cross-tenant read          tenant_id in EVERY
                                                         query + RLS + tests
API                 D         unbounded query/export     pagination, rate limit
                    R         no audit of admin actions  structured audit log`,
        output: `Threat modelling finds DESIGN flaws scanners cannot: draw the
flows and trust boundaries, walk STRIDE at each crossing, decide
a mitigation per threat, and keep it living. Output: prioritised
threats with owners, plus security requirements and abuse cases
to design and TEST against. Cheapest at design time.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are trust boundaries the highest-value places to focus during application threat modelling?',
        options: [
          'They are the only places where code executes',
          'They are where data passes between parties with different levels of trust — user to app, app to dependency, tenant to tenant, user to admin — so they are where assumptions about the other side can be false, which is exactly where design-level vulnerabilities live',
          'Because scanners already cover everything inside a boundary',
          'Because boundaries are the easiest part to diagram',
        ],
        answer: 1,
        explain:
          'A trust boundary marks a change in who controls the data and what may be assumed about it. Vulnerabilities cluster there because each side makes assumptions about the other — that the client enforced a rule, that the upstream service validated the input, that a tenant identifier is trustworthy, that a privilege transition was checked. Walking STRIDE at each crossing systematically tests those assumptions and surfaces architectural flaws that no line-level scan would reveal, which is precisely the class of problem that is expensive to fix later.',
        hint: 'What changes when data crosses from one party to another, and what does each side assume about the other?',
      },
    },

    {
      id: 'bweb-s-02',
      title: 'Secure design patterns',
      read: `Threat modelling identifies risks; **secure design** removes whole classes of them structurally, so they cannot recur. These principles (rooted in Saltzer and Schroeder) are what "secure by design" actually means in an application.

## The principles that matter most

- **Secure defaults** — the safe configuration is what you get without doing anything. A new object is private until shared; a new endpoint requires authorization; encryption is on unless deliberately disabled. Security that depends on remembering an opt-in will be forgotten.
- **Fail closed (fail safe)** — when something errors, times out, or is unrecognised, **deny**. An authorization service that is unreachable must refuse access, not allow it. Many breaches trace to an error path that defaulted to permit.
- **Least privilege** — every component, service account, database user, token and API key gets the minimum rights needed, scoped and time-limited. Then a compromise yields little.
- **Complete mediation** — check authorization on *every* access, not once at the start and then cached indefinitely. This is why revocation and re-checks matter.
- **Economy of mechanism** — keep security-critical code small and simple, because complexity hides flaws. One well-reviewed authorization layer beats clever logic spread everywhere.
- **Separation of duties** — no single actor can complete a sensitive operation alone (payment release, production deploy, privilege grant) — requiring a second approval limits both insider abuse and a single compromised account.
- **Defence in depth** — layered controls so one failure is not fatal (encoding *and* CSP; validation *and* parameterization; app checks *and* database row-level security).
- **Don't trust, verify** — never rely on the client, on a header, on "internal" network position, or on obscurity.

## Applying them concretely

- Make the **safe path the easy path**: a framework, a base class, a shared library, or a lint rule that makes the secure option the default and the unsafe one awkward. Developers follow the path of least resistance, so design that path to be correct. This is why auto-escaping templates and ORM parameterization eliminated so much injection and XSS.
- **Centralize security-critical logic** — one authentication module, one authorization layer, one crypto wrapper, one sanitizer. Reviewed once, used everywhere; no reinvention in each handler.
- **Design for revocation and rotation** from the start — sessions, tokens, keys and credentials will need invalidating, and retrofitting that is painful.
- **Isolate by default** — separate tenants, environments, services and credentials, so blast radius is bounded.

The measure of good design is that the vulnerability becomes *hard to introduce*. If your framework escapes by default, injects parameters by default and denies by default, then the common flaws require a developer to actively bypass a safeguard — which is exactly where you focus review.`,
      sample: {
        lang: 'python',
        caption: 'Make the safe path the easy path, and fail closed',
        code: `# INSECURE BY DEFAULT: authorization is opt-in - forget it and it's open
@app.get("/api/docs/<id>")
def get_doc(id): ...                    # no check -> PUBLIC

# SECURE BY DEFAULT: the framework denies unless a policy is declared
@app.get("/api/docs/<id>")
@requires("doc:read")                   # missing decorator -> 403, not 200
def get_doc(id):
    return authorized_doc(id)           # scoped query, fails closed

# FAIL CLOSED on error paths
try:
    allowed = policy.check(user, action, resource)
except PolicyServiceUnavailable:
    allowed = False                     # deny on failure, never allow`,
        output: `Secure design removes classes of flaw structurally: secure
DEFAULTS (safe without opting in), FAIL CLOSED on errors, least
privilege, complete mediation, simple centralized security code,
separation of duties, defence in depth. Make the safe path the
EASY path - then a vulnerability requires actively bypassing a
safeguard, which is where you focus review.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An authorization service becomes unreachable and the application treats the error by allowing the request through. Which secure-design principle is violated, and what should happen?',
        options: [
          'Economy of mechanism; the code should be shorter',
          'Fail closed (fail safe) — when a security decision cannot be made, access must be denied rather than permitted, because defaulting to allow on error paths turns an outage or an induced failure into an authorization bypass',
          'Separation of duties; a second approver is needed',
          'Nothing is violated; availability must come first',
        ],
        answer: 1,
        explain:
          'Failing open converts any error — an outage, a timeout, or a condition an attacker can deliberately induce — into unrestricted access, and these paths are rarely tested so the flaw goes unnoticed until exploited. The principle is to fail closed: if the system cannot positively establish that the request is authorized, it denies. That may reduce availability during an incident, which is the correct trade-off for a security decision, and it should be visible (alerted) rather than silent so the underlying failure is fixed.',
        hint: 'If you cannot determine whether the user is allowed, what is the safe answer?',
      },
    },

    {
      id: 'bweb-s-03',
      title: 'OAuth 2.0 and OpenID Connect',
      read: `Modern applications rarely handle passwords directly; they delegate with **OAuth 2.0** (authorization) and **OpenID Connect** (authentication on top of OAuth). Both are widely misimplemented, so a skilled defender must know the correct patterns.

## What each is for

- **OAuth 2.0** — **delegated authorization**: letting an application access resources on a user's behalf ("allow this app to read your calendar") **without sharing the password**. It issues **access tokens** scoped to specific permissions.
- **OpenID Connect (OIDC)** — a thin identity layer on OAuth that adds an **ID token** (a signed JWT asserting *who* the user is) and a standard userinfo endpoint. **Use OIDC for login**; OAuth alone was never designed to prove identity, and "login with OAuth access token" is a classic mistake.

## The correct flow

Use the **authorization code flow with PKCE** for essentially everything today — web apps, SPAs and mobile:

1. The app redirects the user to the identity provider with a \`state\` value and a PKCE \`code_challenge\`.
2. The user authenticates there (the app never sees the credentials) and approves the scopes.
3. The provider redirects back with a short-lived **authorization code**.
4. The app exchanges that code (plus the PKCE \`code_verifier\`) for tokens.

**Implicit flow is deprecated** (tokens in the URL fragment leak via history, referrers and logs). **Resource owner password credentials** is also deprecated — it defeats the whole point by handling the password.

## The details that get it wrong

- **Validate \`redirect_uri\` against an exact registered allow-list.** Open redirects here let an attacker steal the code. No wildcards, no prefix matching.
- **Use and verify \`state\`** — it binds the response to the user's session and prevents CSRF on the callback.
- **Use PKCE** — it stops an intercepted authorization code being redeemed by an attacker (essential for public clients, and now recommended for all).
- **Verify the ID token properly** — signature against the provider's published keys, plus \`iss\`, \`aud\`, \`exp\` and \`nonce\`. Never accept an unverified token or trust claims without checking the signature.
- **Scope minimally** — request only the permissions needed (least privilege), and show the user what is being granted.
- **Treat tokens as credentials** — short-lived access tokens, refresh tokens stored securely with **rotation and reuse detection** (if an old refresh token is presented, assume theft and revoke the family).

## Storage in browsers

Where a SPA keeps tokens is a real trade-off: \`localStorage\` is readable by any XSS, while **HttpOnly cookies** (with \`SameSite\` and CSRF protection) keep tokens out of JavaScript's reach. The backend-for-frontend pattern — the server holds the tokens and the browser holds only a session cookie — is the most robust arrangement.

Delegate authentication to a well-implemented provider, use authorization code + PKCE, validate rigorously, and treat every token as the credential it is.`,
      sample: {
        lang: 'text',
        caption: 'Authorization code flow with PKCE, and what must be validated',
        code: `1. app -> IdP:  /authorize?response_type=code
                   &client_id=...&redirect_uri=https://app.example/cb
                   &scope=openid profile&state=<random>
                   &code_challenge=<S256(verifier)>&nonce=<random>
2. user authenticates AT THE IdP (app never sees the password)
3. IdP -> app:  /cb?code=<short-lived>&state=<random>
       CHECK: state matches the session   (CSRF on callback)
4. app -> IdP:  POST /token  code + code_verifier + client creds
       -> access_token (short-lived), refresh_token, id_token

VALIDATE the id_token: signature (IdP JWKS), iss, aud, exp, nonce.
redirect_uri: EXACT match against the registered allow-list.`,
        output: `OAuth = delegated authorization; OIDC = authentication (ID
token). Use authorization code + PKCE (implicit and password
grants are deprecated). Exact redirect_uri allow-list, verify
state and nonce, validate the ID token's signature/iss/aud/exp,
scope minimally, rotate refresh tokens with reuse detection, and
prefer HttpOnly cookies / BFF over localStorage.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why must an OAuth provider validate `redirect_uri` against an exact registered allow-list rather than a prefix or wildcard?',
        options: [
          'To make the redirect faster',
          'Because a loose match lets an attacker specify a redirect they control (or exploit an open redirect on the legitimate domain), causing the authorization code to be delivered to them — which they can then exchange for the victim’s tokens',
          'Because wildcards are not valid in URLs',
          'To ensure the user sees the correct branding',
        ],
        answer: 1,
        explain:
          'The authorization code is delivered to whatever `redirect_uri` the provider accepts, so that parameter effectively decides who receives the credential. Prefix or wildcard matching lets an attacker register or reach a URL under the accepted pattern — a different path, a subdomain they control, or an open redirect on the legitimate site — and capture the code, then exchange it for tokens and impersonate the victim. Exact matching against pre-registered URIs closes this, and PKCE provides a second layer by making an intercepted code unusable without the verifier.',
        hint: 'The code is sent to that URI. What happens if the attacker can influence where it points?',
      },
    },

    {
      id: 'bweb-s-04',
      title: 'JWTs and token security',
      read: `**JSON Web Tokens** are everywhere in modern APIs, and they come with sharp edges. Using them safely means understanding what they are and what they are not.

## What a JWT is

Three base64url parts — **header** (algorithm, key id), **payload** (claims), **signature** — joined by dots. The signature proves integrity and origin; the payload is **signed, not encrypted**, so anyone holding the token can read the claims. Never put secrets in a JWT.

## The classic vulnerabilities

- **\`alg: none\`** — a token declaring no algorithm; a naive library accepts it unsigned. **Never let the token choose.** Specify the expected algorithm(s) server-side and reject anything else.
- **Algorithm confusion (RS256 → HS256)** — an attacker changes the header to HMAC and signs with the *public* key as the secret; a library that picks the algorithm from the header then validates successfully. Pin the algorithm and the key type.
- **Missing or partial validation** — accepting a token without verifying the signature, or without checking **\`exp\`** (expiry), **\`iss\`** (issuer), **\`aud\`** (audience) and, where relevant, \`nbf\`. Each omission is exploitable — an unchecked \`aud\` lets a token minted for another service be replayed at yours.
- **Weak HMAC secrets** — short or guessable HS256 secrets can be brute-forced offline from a captured token.
- **Trusting claims blindly** — a \`role\` or \`user_id\` claim is only as trustworthy as the signature verification and the issuer; never accept claims from an unverified token, and re-check authorization server-side rather than assuming the claim is current.
- **\`kid\` injection** — attacker-controlled key identifiers used to load an unexpected key or trigger path traversal/SQL injection in key lookup.

## Revocation: the fundamental trade-off

A JWT's appeal is that it is **stateless** — any service can verify it without a database lookup. The cost is that it stays valid until it expires: you **cannot easily revoke it**. Logout, a password change, a permission revocation or a detected compromise will not stop a valid token being used.

Practical mitigations: keep access tokens **short-lived** (minutes) with **refresh tokens** for continuity; maintain a **denylist** of revoked token IDs (which reintroduces state, so at least keep it small); or simply use **server-side sessions** where revocation matters more than statelessness. Choose deliberately rather than defaulting to JWTs for sessions.

## Where to store them

As with OAuth: \`localStorage\` is readable by any XSS; **HttpOnly cookies** plus CSRF protection keep tokens away from JavaScript. For browser apps, a backend-for-frontend holding the tokens is the strongest pattern.

Use a maintained library, pin the algorithm, validate every claim you rely on, keep lifetimes short, and be honest about revocation.`,
      sample: {
        lang: 'js',
        caption: 'Dangerous vs. strict JWT verification',
        code: `// DANGEROUS - lets the TOKEN choose the algorithm (alg:none, RS256->HS256)
const claims = jwt.verify(token, key);          // no constraints

// SAFE - pin algorithm, issuer, audience; expiry checked by the library
const claims = jwt.verify(token, publicKey, {
  algorithms: ["RS256"],                 // never read alg from the header
  issuer:    "https://idp.example.com",
  audience:  "https://api.example.com",  // stops cross-service replay
  clockTolerance: 5,
});

// Then STILL authorize server-side - don't trust a role claim blindly:
if (!policy.can(claims.sub, "doc:read", doc)) return res.sendStatus(403);`,
        output: `A JWT is signed, NOT encrypted - never put secrets in it. Pin the
algorithm (defeats alg:none and RS256->HS256 confusion), verify
signature + exp + iss + aud, use strong keys, and don't trust
claims blindly. The big trade-off: stateless means hard to
REVOKE - use short lifetimes with refresh tokens, or server-side
sessions when revocation matters.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why must a server specify the expected signing algorithm when verifying a JWT, rather than reading it from the token’s header?',
        options: [
          'Because reading the header is computationally expensive',
          'Because letting the token choose enables attacks such as `alg: none` (accepting an unsigned token) and RS256→HS256 confusion (signing with the public key as an HMAC secret) — pinning the expected algorithm server-side prevents the attacker from controlling how verification is performed',
          'Because the header is encrypted and cannot be read',
          'Because algorithms change too frequently to hard-code',
        ],
        answer: 1,
        explain:
          'The header is part of the attacker-supplied token, so trusting it hands the attacker control over verification. Setting `alg` to `none` can make a permissive library treat an unsigned token as valid, and switching an RS256 token to HS256 lets an attacker sign it using the well-known public key as the HMAC secret, which a library that follows the header will then verify successfully. Pinning the acceptable algorithm (and key type) server-side removes that choice, and should be combined with verifying `iss`, `aud` and `exp`.',
        hint: 'Who supplies the header, and what could they set it to?',
      },
    },

    {
      id: 'bweb-s-05',
      title: 'Secrets and configuration',
      read: `Applications need credentials — database passwords, API keys, signing keys, third-party tokens. **Where they live and how they rotate** is a recurring source of serious breaches.

## The rules

1. **Never in source control.** Git remembers forever: a key committed once is compromised even after you delete it, because it remains in history and in every clone, fork and backup. If one leaks, **rotate it** — deletion is not remediation. Scan repositories (gitleaks, trufflehog) and add pre-commit hooks so it does not happen again.
2. **Never baked into container images or client-side code.** Image layers and JavaScript bundles are readable by anyone who pulls them. A "secret" in a mobile app or SPA is not secret.
3. **Use a secrets manager.** HashiCorp Vault, cloud secret managers, or Kubernetes secrets backed by a KMS: secrets are stored encrypted, access is authorized and audited, and rotation is supported. The application fetches them at runtime with a workload identity rather than holding long-lived credentials.
4. **Prefer short-lived, automatically rotated credentials** over static ones — cloud IAM roles for workloads, dynamically generated database credentials, certificate-based service identity (mTLS). A credential that lives for minutes is far less valuable to steal.
5. **Scope tightly** — separate secrets per environment and per service, each with least privilege, so one leak has bounded impact and can be rotated independently.

## Environment variables: better, not perfect

Env vars keep secrets out of code, which is a real improvement, but they leak readily — into \`/proc/<pid>/environ\`, crash dumps, error pages, logs that dump configuration, and child processes. They are a step up from hardcoding, not the destination.

## Rotation is the real control

Assume every secret will eventually be exposed. The mature posture is not "make leaks impossible" but **"make a leaked secret quickly worthless"**: short lifetimes, automated rotation, and the ability to revoke without an outage. Practise rotation before you need it — a secret you cannot rotate quickly is an incident waiting to become a crisis.

## Detect and respond

Monitor for leaked secrets (repository scanning, public paste monitoring, GitHub's secret scanning push protection), and have a defined response: rotate immediately, review logs for use of the exposed credential, and purge it from history. Speed matters — automated scanners find exposed keys within minutes of publication.

Secrets management is unglamorous and decisive: the difference between a contained mistake and a breach is usually whether the credential was short-lived, scoped, and rotatable.`,
      sample: {
        lang: 'text',
        caption: 'The lifecycle that makes a leak survivable',
        code: `WEAK
  DB_PASSWORD hardcoded in config.py, committed 2 years ago,
  identical across dev/staging/prod, never rotated, broad grants
  -> one leak = full production access, and rotation means downtime.

STRONG
  app authenticates with its WORKLOAD IDENTITY to a secrets manager
  -> receives a DYNAMIC database credential, TTL 1 hour, least privilege
  -> separate per environment; rotation is automatic and invisible
  -> access is logged and auditable
  -> a leaked credential expires within the hour and is scoped to one env

IF A SECRET LEAKS: rotate FIRST, then purge history, then review
logs for use of it. Deleting the commit is not remediation.`,
        output: `Never in git, images or client code. Use a secrets manager with
workload identity; prefer SHORT-LIVED, automatically rotated,
tightly scoped credentials. Env vars beat hardcoding but leak via
/proc, dumps and logs. Assume exposure: the control is fast
rotation, so practise it before you need it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An API key was committed to a private git repository 18 months ago. The team removes it in a new commit. Is the key now safe?',
        options: [
          'Yes, once the new commit is pushed',
          'No — the key remains in git history and in every clone, fork and backup, so anyone with repository access (past or present) can recover it; the key must be rotated (revoked and reissued), and only then is purging it from history worthwhile',
          'Yes, because the repository is private',
          'Yes, provided the repository has few contributors',
        ],
        answer: 1,
        explain:
          'Removing a line in a later commit changes nothing about the earlier one: git retains the full history, and every clone, fork, CI cache and backup already contains the value. Private repositories reduce exposure but do not eliminate it — contributors leave, access is broad, and repositories are sometimes made public or leaked. The only remediation that actually invalidates the credential is rotation: revoke it and issue a new one, then rewrite history to remove the old value and review logs for any use of it in the interim.',
        hint: 'Where does git keep old versions, and who already holds a copy?',
      },
    },

    {
      id: 'bweb-s-06',
      title: 'Multi-tenancy and data isolation',
      read: `Most modern applications are **multi-tenant**: many customers' data shares one system. The tenant boundary becomes the most critical trust boundary in the design, because a failure there is a cross-customer data breach — among the most damaging outcomes a SaaS application can have.

## The isolation models

- **Separate database (or instance) per tenant** — strongest isolation, simplest reasoning, but operationally heavy at scale and expensive for many small tenants.
- **Shared database, separate schema** — a middle ground.
- **Shared schema with a \`tenant_id\` column** — the most common and most scalable, and the most dangerous, because isolation now depends entirely on **every single query** filtering correctly. One forgotten \`WHERE tenant_id = ?\` is a cross-tenant leak.

## Making shared-schema isolation safe

Do not rely on developers remembering a filter in hundreds of queries. Enforce it structurally:

1. **Database row-level security (RLS)** — the database itself restricts rows to the current tenant based on a session variable. Even a query that forgets the filter returns nothing outside the tenant. This turns isolation from a convention into an enforced invariant, and is the single strongest control for shared-schema designs.
2. **A data-access layer that scopes automatically** — repositories or ORM scopes that always apply the tenant filter, so the safe path is the default and raw unscoped access is the exception that gets reviewed.
3. **Tenant context from the session, never the request.** The tenant must be derived from the authenticated identity. A \`tenant_id\` in a parameter, header or editable token claim is attacker-controlled — accepting it is how cross-tenant access happens.
4. **Isolate everything else too** — caches (a shared cache key without tenant scoping serves one tenant's data to another), search indexes, object storage prefixes, background jobs, exports, logs, and any per-tenant configuration or encryption keys.

## Test the boundary explicitly

Cross-tenant access must be an **automated test suite**, not a hope: for every endpoint, assert that tenant B receives nothing belonging to tenant A (the two-account replay test from the intermediate level, applied to tenants). Include reads, writes, search, exports, and any aggregate/reporting endpoints, which are frequently overlooked.

## Noisy neighbours and other tenancy concerns

Isolation is not only about confidentiality: per-tenant **rate limits and quotas** prevent one customer exhausting shared resources (a denial of service against everyone else), and per-tenant **encryption keys** can support stronger separation and clean deletion.

The rule: never let tenant isolation depend on every developer remembering it. Enforce it in the database and the data-access layer, derive tenancy from the session, and prove it with tests.`,
      sample: {
        lang: 'sql',
        caption: 'Row-level security makes the isolation an enforced invariant',
        code: `-- One forgotten filter is a cross-tenant breach:
SELECT * FROM documents WHERE id = 42;          -- no tenant_id! LEAK

-- RLS enforces it in the database itself
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- the app sets the tenant from the SESSION (never from the request)
SET app.tenant_id = '<tenant from authenticated session>';

-- now the same forgetful query is safe:
SELECT * FROM documents WHERE id = 42;   -- returns nothing cross-tenant`,
        output: `In shared-schema multi-tenancy, isolation rests on EVERY query
filtering correctly - so enforce it structurally: database RLS,
an auto-scoping data layer, tenant context from the SESSION not
the request, and isolation of caches, search, storage, jobs and
exports too. Then prove it with automated cross-tenant tests.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a shared-schema multi-tenant application, why is database row-level security (RLS) such a valuable control?',
        options: [
          'It encrypts each tenant’s rows with a separate key',
          'It enforces tenant filtering in the database itself, so even a query that forgets its `WHERE tenant_id` clause cannot return another tenant’s rows — turning isolation from a convention every developer must remember into an invariant the system guarantees',
          'It removes the need to authenticate users',
          'It improves query performance across tenants',
        ],
        answer: 1,
        explain:
          'With a shared schema, confidentiality between customers depends on every query in the application applying the tenant filter correctly — an expectation that fails eventually across hundreds of queries, new features and ad-hoc reports. RLS moves the check into the database, which applies the policy to every statement regardless of what the application wrote, so an omitted filter yields no rows rather than another tenant’s data. It pairs with an auto-scoping data-access layer, deriving tenant context from the session, and automated cross-tenant tests.',
        hint: 'What happens when one developer forgets the filter — under each approach?',
      },
    },

    {
      id: 'bweb-s-07',
      title: 'Security in the development lifecycle',
      read: `Finding vulnerabilities after deployment is the most expensive place to find them. A **secure SDLC** shifts security earlier — into design, coding, and the build pipeline — so issues are caught when they are cheap to fix.

## The automated tooling, and what each can and cannot see

- **SAST (Static Application Security Testing)** — analyses source code without running it. Good for injection patterns, hardcoded secrets, unsafe API use and dangerous sinks. Fast and early (IDE, pull request), but produces **false positives** and cannot see runtime or configuration context. Tools: Semgrep, CodeQL, SonarQube.
- **DAST (Dynamic Application Security Testing)** — attacks the running application from outside. Finds configuration issues, missing headers, authentication and some injection flaws that only appear at runtime. Fewer false positives, but has **no view of the code**, covers only what it can reach, and is slower. Tools: OWASP ZAP, Burp.
- **SCA (Software Composition Analysis)** — dependency vulnerabilities and licences (the intermediate lesson). Often the highest-value scanner for effort spent.
- **Secret scanning** — credentials in code and history, ideally with push protection.
- **IaC and container scanning** — misconfiguration in Terraform, Kubernetes manifests and images, before they reach production.

**None of these finds business-logic or access-control flaws** — the classes from the intermediate level — which is why they complement, rather than replace, threat modelling, code review and manual testing.

## Where they belong in the pipeline

- **In the IDE and pre-commit** — fast linters and secret scanning, so developers get instant feedback.
- **In the pull request** — SAST and SCA on the diff, with findings as review comments. Scanning the *change* keeps noise low and relevance high.
- **In CI** — the full SAST/SCA suite, IaC and container scanning, plus **security unit tests** (the authorization matrix, input-handling tests).
- **In staging** — DAST against a deployed build.
- **In production** — dependency monitoring, posture scanning, and runtime detection.

## Making it work in practice

- **Tune ruthlessly and fail the build only on high-confidence, high-severity findings.** A scanner that cries wolf gets bypassed, and a pipeline that blocks on noise gets disabled — the same alert-fatigue failure as noisy detections.
- **Triage with context** — is the vulnerable path reachable? is it internet-facing? A risk-ranked queue beats an undifferentiated list of thousands.
- **Track and own findings** — with severity, owner and due date, in the normal work tracker rather than a separate security backlog nobody reads.
- **Security champions** — an engineer in each team with extra training who reviews designs and triages findings, scaling security expertise without a bottleneck.
- **Train developers** on the classes they actually introduce; secure coding knowledge prevents far more than scanning detects.

Shift left, automate the repeatable checks, keep the signal high, and reserve human effort for design review and the logic flaws no tool will find.`,
      sample: {
        lang: 'text',
        caption: 'Security gates across the pipeline, and what each catches',
        code: `IDE / pre-commit   secret scanning, fast lint        seconds
       v
Pull request       SAST + SCA on the DIFF             minutes, low noise
       v                                              -> review comments
CI build           full SAST/SCA, IaC + image scan,
                   SECURITY TESTS (authz matrix)      fail on high severity
       v
Staging deploy     DAST (ZAP/Burp) against running     runtime + config flaws
       v
Production         dependency + posture monitoring,    continuous
                   runtime detection/WAF

NOT covered by any scanner: business logic, access control,
design flaws -> threat modelling, code review, manual testing.`,
        output: `Shift left: cheap checks early (secrets, SAST, SCA on the diff),
full suite plus security TESTS in CI, DAST in staging, monitoring
in production. Tune hard and block only on high-confidence
findings - a noisy gate gets disabled. Tools cannot find logic
or authorization flaws; humans and threat models must.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can a pipeline full of SAST, DAST and SCA scanners still miss the most serious vulnerabilities in an application?',
        options: [
          'Because scanners only work on compiled languages',
          'Because business-logic and access-control flaws involve entirely valid requests used in unintended ways — a scanner has no knowledge of what the application is *supposed* to permit — so these classes require threat modelling, design review and deliberate manual testing such as an authorization matrix',
          'Because scanners cannot run in continuous integration',
          'Because all scanners produce only false positives',
        ],
        answer: 1,
        explain:
          'Automated tools match patterns: dangerous sinks, known-vulnerable dependencies, missing headers, malformed input handling. They have no model of your intended business rules, so they cannot tell that user B should not be able to read user A’s invoice, that a checkout step may be skipped, or that a coupon can be redeemed twice under concurrency — every such request looks perfectly well-formed. Those classes are found by threat modelling the design, reviewing authorization deliberately, and testing each endpoint against each actor. Scanners handle the repeatable checks so human effort goes where only humans can help.',
        hint: 'What does a scanner know about what your application is *supposed* to allow?',
      },
    },

    {
      id: 'bweb-s-08',
      title: 'WAFs and runtime protection',
      read: `A **Web Application Firewall** inspects HTTP traffic and blocks requests matching attack patterns. It is a useful layer — and frequently misunderstood, so a skilled defender should be clear about what it genuinely provides.

## What a WAF does well

- **Virtual patching** — blocking exploitation of a known vulnerability while a real fix is developed and deployed. This is its highest-value use: when a critical framework vulnerability drops, a WAF rule can buy you days.
- **Stopping commodity attacks and scanners** — the constant background noise of automated exploitation, which it filters cheaply.
- **Rate limiting, bot management and DDoS mitigation** at the edge (often bundled with a CDN).
- **Visibility** — logging attack attempts against the application, feeding detection.

## What it does not do

- **It does not fix the vulnerability.** The flaw remains; you have added a filter in front of it. Treat WAF blocking as temporary mitigation, never as remediation.
- **It can be bypassed.** WAFs pattern-match on request content, and attackers evade with encoding, case variation, comments, parameter pollution, chunked or unusual encodings, and payloads split across parameters — the same evasion dynamic as network IDS.
- **It cannot see business-logic or access-control flaws.** An IDOR request is well-formed and indistinguishable from a legitimate one; no signature catches "this user should not own this object".
- **It struggles with APIs and encrypted or complex payloads** unless carefully configured for them.

## Deploying one properly

- **Start in detection/monitor mode**, review what would be blocked, tune out false positives, then enforce — the same audit-then-enforce discipline as ASR rules and application control. Blocking legitimate traffic gets a WAF disabled entirely, which loses all its value.
- **Tune to the application** rather than relying on a generic ruleset (the OWASP **Core Rule Set** is a good baseline, with paranoia levels to trade coverage against false positives).
- **Feed its logs into your detection pipeline** — attack attempts are valuable telemetry even when blocked.

## RASP and modern runtime protection

**RASP (Runtime Application Self-Protection)** instruments the application itself, so it sees the actual code path, parameters and query being executed — and can therefore distinguish a genuine SQL injection from a search term containing an apostrophe with far greater accuracy than an external pattern matcher. The trade-off is runtime coupling, performance overhead and language support. Similar instrumentation underlies **IAST** (interactive testing during QA).

## The correct posture

Use a WAF as **defence in depth and for virtual patching**, not as a substitute for secure code. The order of investment is: fix the code, design securely, test in CI — and run a WAF in front to blunt commodity attacks and buy time when something new appears. A team that relies on a WAF instead of fixing flaws has a filter in front of an unfixed application, which an attacker will eventually route around.`,
      sample: {
        lang: 'text',
        caption: 'Virtual patching (good use) vs. relying on a WAF (bad use)',
        code: `GOOD - virtual patching while the real fix ships:
  critical RCE disclosed in the framework at 09:00
  09:30  WAF rule blocks the exploit pattern       <- buys time
  next day: patched version deployed; rule kept as defence in depth

BAD - the WAF as the fix:
  SQL injection found in /search
  "the WAF blocks it" -> ticket closed, code unchanged
  attacker bypasses with encoding/comments/parameter pollution
  -> exploited. The vulnerability was never fixed.

CANNOT HELP AT ALL:
  GET /api/invoices/1043  (another user's invoice)
  -> perfectly well-formed; no signature distinguishes it. IDOR
     needs an authorization fix, not a filter.`,
        output: `A WAF blunts commodity attacks, rate-limits, and virtual-patches
known flaws while you fix them - real value. It does NOT fix the
vulnerability, can be evaded by encoding tricks, and is blind to
logic and access-control flaws. Deploy in monitor mode, tune,
then enforce; feed its logs to detection. Never a substitute for
secure code.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A team discovers a SQL injection flaw and adds a WAF rule that blocks the exploit, then closes the ticket without changing the code. What is wrong with this?',
        options: [
          'Nothing — blocking the exploit resolves the risk',
          'The vulnerability still exists; a WAF pattern-matches requests and can be bypassed with encoding, comments, parameter pollution and other evasions, so the flaw remains exploitable — WAF blocking is temporary mitigation (virtual patching) while the code is fixed, not remediation',
          'WAFs cannot inspect POST bodies',
          'The rule will slow the application unacceptably',
        ],
        answer: 1,
        explain:
          'A WAF sits in front of the flaw and matches patterns in requests, so it raises the cost of exploitation without removing the cause. Attackers routinely evade such filters using alternative encodings, inline comments, case variation, splitting payloads across parameters, and unusual content encodings — and the moment one evasion works, the unfixed injection is exploitable again. The legitimate use of the rule is as a virtual patch that buys time while the query is converted to a parameterized statement; once fixed, the rule remains as defence in depth rather than as the fix.',
        hint: 'Is the flaw removed, or is there now a filter in front of it — and how durable is a pattern match?',
      },
    },

    {
      id: 'bweb-s-09',
      title: 'Application-layer detection',
      read: `Everything so far prevents attacks. **Insufficient logging and monitoring** is itself an OWASP Top 10 risk, because an application that cannot tell you it is being attacked leaves you blind until the damage surfaces — often months later.

## What to log

Security-relevant events, with enough context to investigate:

- **Authentication** — successes, failures, lockouts, MFA challenges and failures, password and email changes, session creation and destruction.
- **Authorization** — every **denied** access attempt. A user repeatedly hitting 403s across objects they don't own is exactly the IDOR probing you want to catch.
- **Input validation failures** at a meaningful rate — a burst suggests probing.
- **High-value actions** — administrative operations, privilege and role changes, data exports, payment and refund operations, configuration changes, deletions.
- **Anomalous usage** — unusual volumes, rates, or access patterns per user.

Each entry needs **who, what, when, where, and outcome**: user/tenant identity, action, resource, timestamp, source IP and user agent, and success or failure. Use **structured logging** (JSON) so events are queryable, and a consistent correlation/request ID so a single request can be traced across services.

## What not to log

Never log passwords, session IDs, full tokens, card numbers or unnecessary personal data. Logs are widely readable, shipped to third parties, and retained for years, so a secret in a log is a breach waiting to happen. Mask sensitive fields, and remember **log injection** — strip or encode control characters in user-supplied values so an attacker cannot forge entries.

## Turning logs into detection

Ship logs **off the host** to a central store (the recurring lesson) and build detections that reflect application-layer attacks:

- Many failed logins for one account, or one password across many accounts (**credential stuffing** / spraying).
- A spike in **authorization denials** from one user or session (IDOR/access-control probing).
- A single account accessing an unusual number of distinct records (scraping, mass data access).
- Impossible or improbable behaviour — geographically impossible logins, sudden bulk exports, out-of-hours administrative actions.
- Repeated input-validation failures or WAF blocks from one source.

## Application-specific advantages

Your application knows things no network sensor or WAF can: which *user* did it, which *tenant*, which *object*, whether it *succeeded*, and whether the action makes sense for that account. That context yields high-fidelity detections — "this account read 4,000 customer records in ten minutes" is far stronger than anything visible on the wire, especially now that traffic is encrypted.

## Close the loop

Detections must reach someone (alerting), with a **response plan**: how to disable an account, revoke sessions and tokens, block an IP, and roll back a change. And honour breach-notification obligations, which begin with knowing that a breach occurred — which is exactly what this instrumentation provides.`,
      sample: {
        lang: 'json',
        caption: 'A structured security event, and the detections it powers',
        code: `{
  "ts": "2026-09-19T14:03:11Z",
  "event": "authz.denied",
  "request_id": "7f3c9a21",
  "actor": {"user_id": "u_8821", "tenant": "t_14", "ip": "203.0.113.9"},
  "action": "invoice:read",
  "resource": {"type": "invoice", "id": "1043", "owner_tenant": "t_77"},
  "outcome": "denied",
  "user_agent": "python-requests/2.31"
}`,
        output: `Detections built on events like this:
  > 20 authz.denied from one user in 5 min      -> IDOR probing
  > 500 distinct resources read by one account  -> scraping/mass access
  auth.failed across many accounts, one IP      -> credential stuffing
  admin.action out of hours from a new IP       -> account takeover

The APP knows who, which tenant, which object and the outcome -
context no network sensor or WAF has, especially under TLS.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a spike in authorization *denials* from a single user session a valuable detection signal?',
        options: [
          'It indicates a performance problem in the database',
          'Legitimate use rarely produces repeated denials, so a burst of them across objects the user does not own is a strong indicator of access-control probing (IDOR hunting) — an attack in progress that the application is currently repelling but should investigate',
          'Denials always mean the user forgot their password',
          'Because denials are the only events worth logging',
        ],
        answer: 1,
        explain:
          'Normal users follow links and act on objects they own, so sustained authorization failures are unusual. An attacker enumerating object references produces exactly that pattern: many denied attempts across identifiers belonging to others. Logging every denial with actor, resource and outcome turns this into a high-fidelity, low-noise detection — and it is information only the application has, since the requests are well-formed and indistinguishable to a WAF or network sensor. It signals probing that may succeed on some endpoint you have not yet fixed.',
        hint: 'How often do legitimate users get repeatedly denied access to objects they do not own?',
      },
    },

    {
      id: 'bweb-s-10',
      title: 'Securing the deployment',
      read: `An application is only as secure as what it runs on. Skilled web defence extends to the **deployment**: the platform, the pipeline and the infrastructure, which together form part of the application's attack surface.

## Harden the runtime

- **Run as an unprivileged user**, never root, with a **read-only filesystem** where possible and a writable path only where genuinely needed.
- **Containers**: minimal base images (distroless or slim) to shrink the attack surface, no secrets in layers, dropped capabilities, no privileged mode, and image scanning in CI (the container lessons from the Linux track).
- **Least privilege for the service identity** — the cloud role, database user and message-queue credentials should permit only what the application needs. This is what bounds the damage when the app is compromised.
- **Network isolation** — the database bound privately and reachable only from the application tier; outbound (egress) restrictions so a compromised app cannot freely reach the internet or internal services (this also blunts SSRF and data exfiltration).

## Separate environments properly

Development, staging and production need **separate credentials, keys and data**. Two recurring failures: production data copied into a less-protected staging environment (now a breach target with weaker controls), and a shared key that means a development compromise reaches production. Use synthetic or masked data outside production.

## Secure the pipeline itself

The CI/CD system deploys your code, so compromising it compromises everything downstream — an attractive target:

- **Least privilege for pipeline credentials**, short-lived and scoped, ideally using workload identity federation rather than long-lived static keys.
- **Protected branches and required review** so code reaches production only through the reviewed path.
- **Pin and verify build dependencies and actions/plugins** (a third-party CI action is code running with your pipeline's permissions).
- **Restrict who can trigger deployments** and to which environments, and log all deployments.
- **Sign artefacts and record provenance** (SLSA-style attestations) so you can verify what was built from what.

## Immutable, reproducible deployment

Deploy **immutable artefacts** (a built image) rather than mutating running servers, with configuration injected at runtime and infrastructure defined as code. This gives you repeatability, reviewable changes, easy rollback, and confidence that what you tested is what is running — and eliminates the configuration drift that produces misconfiguration.

## Keep it patched and observed

Update base images, runtimes and platform components on a schedule (the dependency lesson applied to infrastructure), monitor posture continuously for drift and misconfiguration, and ensure application, platform and infrastructure logs all reach the same place for correlation.

The application, its dependencies, its runtime and its pipeline are one system. Securing the code while leaving a root container, a wildcard cloud role, or an unprotected deploy pipeline simply relocates the weakest link.`,
      sample: {
        lang: 'text',
        caption: 'Hardened runtime and pipeline defaults',
        code: `RUNTIME
  image: distroless/slim, scanned in CI, pinned by digest
  user: non-root (uid 10001)     filesystem: read-only (+ tmpfs for /tmp)
  capabilities: drop ALL          privileged: false
  egress: deny by default (blunts SSRF + exfiltration)
  db: private network only, least-privilege user, no DDL rights
  secrets: injected at runtime from a manager (never in the image)

PIPELINE
  protected branch + required review + required status checks
  deploy credentials: short-lived workload identity, scoped to one env
  third-party actions pinned by commit SHA (they run with your perms)
  artefacts signed; provenance recorded; every deploy logged`,
        output: `The app's security includes its runtime and pipeline: non-root,
read-only, minimal image, least-privilege service identity,
private DB and restricted EGRESS; separate credentials per
environment; and a hardened CI/CD (protected branches, scoped
short-lived deploy creds, pinned third-party actions, signed
artefacts) - because compromising the pipeline compromises
everything it ships.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is restricting an application server’s outbound (egress) network access a valuable control for web application security specifically?',
        options: [
          'It speeds up responses to users',
          'It limits where a compromised application — or an SSRF flaw within it — can reach, blocking access to internal services and cloud metadata and cutting off command-and-control and data exfiltration channels, so the impact of a successful attack is contained',
          'It prevents SQL injection from executing',
          'It is required for TLS to function correctly',
        ],
        answer: 1,
        explain:
          'Egress control constrains the consequences of compromise rather than the initial flaw. An SSRF vulnerability is only as dangerous as the destinations the server can reach, so denying internal ranges and the cloud metadata endpoint removes its most valuable targets. Likewise, code execution achieved through any route still needs to fetch a payload, reach a command-and-control server, or push stolen data out — all of which default-deny egress blocks or forces through monitored paths. It is defence in depth that assumes the application may be breached and bounds what follows.',
        hint: 'If the attacker already has code running in your app, what do they need the network for next?',
      },
    },

    {
      id: 'bweb-s-11',
      title: 'Responding to web incidents',
      read: `When a web application is compromised or a flaw is exploited, the response has application-specific dimensions beyond generic incident handling — and a skilled defender should have thought them through before the day arrives.

## Immediate actions

1. **Preserve evidence first** — application logs, web server access logs, WAF logs, database audit logs, a snapshot of the instance/container and the database. Compromised systems get rebuilt quickly, so capture before you remediate.
2. **Contain** — the options range from blocking a source or a specific request pattern at the WAF/CDN, to disabling the affected feature (a feature flag is invaluable here), to taking the application into maintenance mode. Prefer targeted containment that preserves evidence and service, escalating only as needed.
3. **Revoke credentials broadly.** This is the web-specific step teams most often under-do: invalidate **all sessions**, rotate **API keys and tokens**, rotate **signing keys** (an attacker with your JWT signing key can mint valid tokens indefinitely), rotate **database and third-party credentials**, and force password resets if credential material may have been exposed. Assume anything reachable from the compromised component is compromised.

## Investigate

Reconstruct the attack from the logs you instrumented earlier: the entry point (which endpoint and parameter), the timeline (first exploitation to detection), what was accessed (which records, whose data, how many), whether persistence was established (a web shell, a rogue account, an added API key, a scheduled job, a modified template), and whether the attacker moved beyond the application into the infrastructure.

**Scope is the question the business must answer**, and it is usually about data: how many users or tenants, which fields, over what period. This is exactly why per-request, per-user, per-object logging matters — without it, you may be unable to bound the breach, and an unbounded breach must often be assumed to be a total one.

## Eradicate and recover

Fix the underlying vulnerability (not just the symptom), remove any persistence, rebuild from a known-good artefact rather than cleaning in place, and redeploy with the rotated credentials. Then watch closely: attackers return, and a second attempt against a now-instrumented application is a good opportunity to catch them.

## Obligations and communication

Web breaches usually involve personal data, so **regulatory notification** (GDPR's 72-hour window, and sector or state equivalents) and customer communication are part of the response, not an afterthought. Involve legal and communications early; the technical facts you establish — scope, data types, timeframe — drive those obligations.

## Afterwards

Run a blameless post-incident review and convert it into change: the code fix, the missing detection, the design flaw, the gap in logging that slowed you down. Vulnerability disclosure also belongs here — a published security contact and a **coordinated disclosure policy** (or bug bounty) means researchers report flaws to you rather than elsewhere, which is one of the cheapest sources of security value available.`,
      sample: {
        lang: 'text',
        caption: 'A web incident response sequence',
        code: `T+0    detection: authz-denial spike + mass record reads by one account
T+5m   PRESERVE: snapshot app + db, export app/access/WAF logs off-host
T+10m  CONTAIN: disable the affected endpoint (feature flag),
              block the source at the CDN/WAF
T+20m  REVOKE: invalidate ALL sessions; rotate API keys, JWT SIGNING key,
              db + third-party credentials  <- most-missed step
T+1h   INVESTIGATE: entry point = IDOR on /api/invoices/{id}
              scope = 4,182 invoices across 37 tenants, over 9 days
              persistence? -> rogue API key found and revoked
T+4h   ERADICATE: fix authorization (scope query by tenant), rebuild
              from clean artefact, redeploy, monitor closely
T+24h  NOTIFY: regulator + affected customers; post-incident review`,
        output: `Web IR specifics: preserve app/access/WAF/db logs first; contain
narrowly (feature flags, WAF); then REVOKE broadly - sessions,
API keys and especially SIGNING keys, or the attacker keeps
minting valid tokens. Scope the DATA accessed (your per-user,
per-object logging is what makes that answerable), fix the root
cause, rebuild clean, and meet notification obligations.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After a web application compromise, why is rotating the JWT signing key (not just resetting user passwords) essential?',
        options: [
          'Because signing keys expire automatically anyway',
          'An attacker who obtained the signing key can mint valid tokens for any user indefinitely, and those forged tokens are unaffected by password resets or session termination — only rotating the key invalidates them',
          'Because JWTs cannot be used after an incident',
          'Because rotating the key restores deleted data',
        ],
        answer: 1,
        explain:
          'The signing key is what makes a token trustworthy, so possession of it is equivalent to being able to authenticate as anyone, at will, for as long as the key remains in use. Password resets and session invalidation do not touch tokens the attacker forges themselves, because those tokens verify correctly against the unchanged key. Rotation invalidates every token signed with the old key and is the only remediation — an exact parallel to resetting krbtgt after a golden-ticket compromise. The same reasoning applies to API keys and any other credential the compromised component could reach.',
        hint: 'If the attacker can sign tokens themselves, does resetting user passwords stop them?',
      },
    },

    {
      id: 'bweb-s-12',
      title: 'Project: a secure application baseline',
      read: `Bring the level together into the artefact a skilled web defender is judged on: a **security baseline for an application** — the design, controls, pipeline and instrumentation that make security a property of the system rather than a series of fixes.

## The baseline

**Design**
- A threat model for each significant feature, kept current, with STRIDE walked at every trust boundary and the resulting security requirements written as testable statements and abuse cases.
- Secure-by-default architecture: deny by default, fail closed, least privilege, centralized authentication/authorization/crypto, tenant isolation enforced by RLS or an auto-scoping data layer.

**Identity and secrets**
- OIDC via a reputable provider, authorization code + PKCE, strict token validation, short-lived tokens with refresh rotation and reuse detection; MFA available and required for privileged roles.
- All secrets in a manager with workload identity, short-lived and scoped per environment, with rotation practised and repositories scanned.

**Application controls**
- Parameterized data access, context-correct output encoding, a nonce-based CSP and the full security-header baseline, strict input schemas, safe file handling, and CSRF protection on every state-changing route.

**Pipeline**
- Secret scanning and SAST/SCA on every pull request, full scans plus **security tests** (the authorization matrix, input-handling and cross-tenant tests) in CI, DAST in staging, IaC and image scanning, and a hardened, least-privilege deploy pipeline shipping immutable signed artefacts.

**Runtime and detection**
- Non-root, minimal, read-only containers with least-privilege service identities and restricted egress; a tuned WAF for virtual patching and commodity attacks; structured security logging shipped centrally, with detections for credential stuffing, access-control probing, mass data access and anomalous administrative actions — and an incident runbook that includes broad credential and signing-key rotation.

## Measure it

Track the things that show whether the baseline is real: percentage of features threat-modelled, authorization test coverage across endpoints, time to patch critical dependencies, secret-scanning findings, DAST/SAST findings by severity and age, and detection coverage for the application-layer attacks above.

## The measure of success

A junior fixes the vulnerabilities they are shown. A skilled web defender can say, with evidence: *"Security is designed into this application — threats are modelled, the dangerous patterns are impossible or awkward by default, authorization is centralized and tested, secrets are short-lived and rotatable, the pipeline blocks known-bad before it ships, the runtime is least-privileged and contained, and the application tells me when it is being attacked."*

> The level distilled: **stop treating security as a list of bugs and make it a property of the system.** Model the threats, design so flaws are hard to introduce, delegate identity properly, manage secrets and tenancy structurally, automate the repeatable checks in the pipeline, harden the runtime and the pipeline itself, and instrument the application so it can tell you it is under attack — then verify all of it with tests. That is application security engineered.`,
      sample: {
        lang: 'text',
        caption: 'The baseline as a reviewable, measured checklist',
        code: `Area          Control                                  Verified by
---------------------------------------------------------------------------
Design        threat model per feature, STRIDE          design review
              deny-by-default, fail-closed, centralized authz tests
Identity      OIDC + PKCE, strict token validation      integration tests
              MFA required for privileged roles         config assertion
Tenancy       RLS + session-derived tenant context      cross-tenant tests
Data access   parameterized everywhere                  SAST + code review
Output        context encoding + nonce CSP + headers    DAST + header scan
Secrets       manager, short-lived, per-env, rotatable  secret scanning
Pipeline      SAST/SCA/secrets on PR; security tests    CI gate (high sev)
Runtime       non-root, read-only, egress deny, min IAM image/IaC scan
Detection     structured events + 4 attack detections   emulated + fired
IR            runbook incl. session + SIGNING key rotation  drill`,
        output: `A baseline makes security a property of the system: modelled
threats, secure defaults, centralized and TESTED authorization,
structural tenant isolation, rotatable secrets, automated
pipeline gates, a hardened least-privilege runtime, and an
application that reports its own attacks - each item verified,
measured and reviewable rather than hoped for.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What most distinguishes a skilled web defender’s "secure application baseline" from simply fixing vulnerabilities as they are found?',
        options: [
          'It uses more scanning tools',
          'It makes security a property of the system — threat-modelled design with secure defaults so flaws are hard to introduce, centralized and tested authorization, structural tenant isolation and secrets management, automated pipeline gates, a hardened least-privilege runtime, and instrumentation that detects attacks — all verified and measured rather than remediated case by case',
          'It eliminates the need for code review',
          'It guarantees the application has no vulnerabilities',
        ],
        answer: 1,
        explain:
          'Fixing reported bugs is reactive and unbounded: the same classes recur because nothing changed about how the system is built. A baseline changes the conditions — the framework escapes and parameterizes by default, authorization is one reviewed layer that denies by default and is covered by tests, tenant isolation is enforced by the database, secrets are short-lived and rotatable, the pipeline blocks known-bad before shipping, the runtime is contained, and the application reports attacks. Flaws become hard to introduce and quick to detect, and the whole thing is measurable — which is what makes it durable as the application grows.',
        hint: 'Is the goal to fix each bug, or to change the system so the bug class is hard to create in the first place?',
      },
    },
  ],
}

export default level
