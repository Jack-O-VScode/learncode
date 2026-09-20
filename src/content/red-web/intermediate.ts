import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Deeper web attacks',
  summary:
    'Beyond the surface Top 10: blind and time-based SQL injection, authentication and business-logic bypasses, server-side request forgery, XML external entities, insecure deserialization, advanced and filter-bypassing XSS, mass assignment and privilege escalation, API and GraphQL testing, and JWT attacks — plus content discovery in depth. Each is taught with the mechanism that makes it work and the fix that closes it, practised only on deliberately vulnerable apps you run or targets you are authorized to test.',
  outcomes: [
    'Exploit blind and time-based SQL injection where there is no visible output',
    'Find server-side request forgery and reach internal resources',
    'Exploit XXE and insecure deserialization to read files or run code',
    'Bypass authentication and business logic, and escalate privileges',
    'Test REST and GraphQL APIs and attack JWTs',
    'Perform advanced XSS with filter and CSP bypasses',
  ],
  steps: [
    {
      id: 'rweb-i-01',
      title: 'Blind and time-based SQL injection',
      read: `Amateur SQLi assumed the app showed results or errors. Real apps often don't — but are still injectable. **Blind SQL injection** extracts data with *no visible output*, by asking the database yes/no questions and reading the answer from the app's *behaviour*.

## Why "blind"

The injection point affects a query, but the results (and errors) aren't returned to you. You can't UNION data onto a page you can't see. Instead you infer data one bit at a time by making the query's *side effects* observable.

## Boolean-based blind

Craft an injection that makes the query **true or false**, and find something in the response that *differs* between the two:

- \`... AND 1=1\` → page loads normally (true).
- \`... AND 1=2\` → page differs — an error, empty result, different length (false).

Now you can ask questions: \`AND (SELECT SUBSTRING(password,1,1) FROM users WHERE user='admin')='a'\`. If the page shows the "true" response, the first character is \`a\`. Iterate character by character, value by value, to extract data through a single true/false oracle. Tedious by hand, instant with automation.

## Time-based blind

When *nothing* in the response differs (fully blind), use **time** as the signal: make the database **sleep** when a condition is true.

- \`... AND IF((condition), SLEEP(5), 0)\` (MySQL) — if the condition is true, the response takes 5+ seconds; if false, it returns immediately.

The *response delay* becomes your true/false oracle, and you extract data exactly as with boolean blind — just reading time instead of content. Slower, but works when there is literally no other feedback.

## Out-of-band (OAST)

When neither content nor timing is reliable, make the database **initiate an external interaction** — e.g. a DNS or HTTP request to a server you control, with data encoded in it. Seeing that interaction confirms injection and can exfiltrate data. Burp Collaborator (or a similar OAST server) captures it. This also finds injection in contexts where the query runs asynchronously.

## Automation and the fix

**sqlmap** handles all these techniques automatically (\`--technique\`), which is why it's invaluable for blind SQLi — but understand the oracle concept so you can verify and handle edge cases. The fix is unchanged and total: **parameterised queries**. Blind or visible, the root cause and cure are identical. In the lab, exploit a boolean-blind and a time-based injection, extracting a few characters by hand before letting sqlmap finish.`,
      sample: {
        lang: 'sql',
        caption: 'Extracting data with no visible output: true/false oracles',
        code: `-- BOOLEAN-BLIND: find a response difference for true vs false
' AND 1=1--    -> normal page   (TRUE)
' AND 1=2--    -> different page (FALSE)
-- then ask questions bit by bit:
' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE user='admin')='a'--
   -> "true" response? first char is 'a'. Iterate.

-- TIME-BASED (nothing visible differs -> use delay as the signal):
' AND IF((SELECT SUBSTRING(password,1,1) FROM users LIMIT 1)='a',SLEEP(5),0)--
   -> 5s delay = true.`,
        output: `Blind SQLi extracts data with NO visible output, via a true/false
ORACLE: response content (boolean), response TIME (time-based), or
an external interaction (out-of-band/OAST). Iterate char by char.
sqlmap automates it. Fix (unchanged): parameterised queries.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An injectable parameter returns no data and no errors to the page. How can time-based blind SQL injection still extract data?',
        options: [
          'It cannot; blind injection requires visible output',
          'By making the database sleep when a condition is true (e.g. IF(condition, SLEEP(5), 0)), so the response delay becomes a true/false oracle — you ask questions about the data one piece at a time and read each answer from whether the response was slow or fast',
          'By causing a 500 error that prints the data',
          'By using UNION to append the data to the visible page',
        ],
        answer: 1,
        explain:
          'Blind injection extracts data through an oracle — some observable that differs between a true and a false condition — even when the results are never shown. When response content also does not differ (fully blind), time becomes the oracle: you inject a conditional sleep, such as `AND IF((condition), SLEEP(5), 0)`, so that when the condition is true the database pauses and the HTTP response is delayed, and when false it returns immediately. By phrasing conditions about the data (e.g. "is the first character of the admin password ‘a’?") and observing whether the response was slow, you extract the data one piece at a time. It is slower than boolean-blind (which reads a content difference) or out-of-band (which triggers an external interaction), but it works when there is literally no other feedback. UNION needs visible output, and you do not rely on errors. The fix remains parameterised queries.',
        hint: 'If you cannot see content differ, what other observable can a crafted query change — and how would you turn it into a yes/no answer?',
      },
    },

    {
      id: 'rweb-i-02',
      title: 'Server-side request forgery',
      read: `**SSRF** (server-side request forgery) is an OWASP Top 10 category and a modern favourite: you make the *server* issue HTTP (or other) requests to targets *you* choose. Because the request comes from the server, it can reach places you cannot — internal systems, cloud metadata, localhost.

## The setup

Any feature where the app **fetches a URL you supply** is a candidate: "import from URL", webhooks, PDF/image generators that fetch resources, URL previews, or an API that takes a \`url\`/\`callback\` parameter. If you control (part of) the address the server requests, you may have SSRF.

## Why it's powerful: the server's position

The server usually sits *inside* the network, trusted, behind the firewall. So SSRF lets you:

- **Reach internal services** unreachable from outside — \`http://192.168.0.10/admin\`, internal APIs, databases with HTTP interfaces.
- **Hit localhost** — \`http://127.0.0.1:port\` to reach admin interfaces bound only to loopback.
- **Read cloud metadata** — the killer case in cloud environments: \`http://169.254.169.254/...\` is the metadata service on AWS/GCP/Azure, which can hand out **temporary cloud credentials** and instance data. SSRF to the metadata endpoint has caused major breaches (recovering IAM credentials → cloud account access).
- **Port-scan the internal network** from the server, using response differences/timing.
- **Other schemes** — \`file://\` (read local files), \`gopher://\` (craft raw requests to other protocols) depending on the fetcher.

## Blind SSRF

If the response isn't returned to you, it's **blind SSRF** — confirm via out-of-band (make the server call a Collaborator/OAST host) and still leverage it against internal targets whose side effects you can infer.

## How to test

Point the URL parameter at something you control (OAST) to confirm the server fetches it, then try internal addresses (\`127.0.0.1\`, \`169.254.169.254\`, internal ranges). Watch for responses, timing, or out-of-band hits.

## The fix (the mirror)

- **Allowlist** permitted destinations (schemes, hosts) rather than blocklisting — blocklists are bypassed with encodings, redirects, DNS rebinding, and alternate IP formats.
- **Block access to internal ranges and the metadata IP**, disable unused URL schemes, and require the metadata service's hardened mode (e.g. IMDSv2).
- Validate and re-validate after redirects.

In the lab, find an SSRF (Juice Shop / a lab app), confirm it with OAST, and reach an internal-only resource.`,
      sample: {
        lang: 'text',
        caption: 'SSRF: make the server request targets you choose',
        code: `The app fetches a URL you supply (import/webhook/preview/url param):
  POST /import   url=https://example.com/data.json

Point it INWARD - the server's position lets it reach:
  http://127.0.0.1:8080/admin        internal-only admin
  http://192.168.0.10/               internal hosts
  http://169.254.169.254/latest/...  CLOUD METADATA -> temp creds!
  file:///etc/passwd                 local files (if file:// allowed)

Blind SSRF? confirm with OAST: url=http://<collaborator>`,
        output: `SSRF = the SERVER makes requests you choose, from its trusted
internal position: reach internal services, localhost, and cloud
metadata (169.254.169.254 -> IAM creds = major breaches). Fix:
ALLOWLIST destinations (not blocklist), block internal+metadata IPs,
disable unused schemes, re-validate after redirects, IMDSv2.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is SSRF (server-side request forgery) so impactful, especially in cloud environments?',
        options: [
          'Because it runs JavaScript in the victim’s browser',
          'Because the request originates from the server’s trusted internal position, letting an attacker reach internal-only services, localhost, and especially the cloud metadata endpoint (169.254.169.254), which can return temporary IAM credentials — turning SSRF into cloud account compromise',
          'Because it only affects static files',
          'Because it requires the attacker to already have admin access',
        ],
        answer: 1,
        explain:
          'SSRF coerces the server into making requests to attacker-chosen destinations. Its power comes from the server’s position: it usually sits inside the network, trusted and behind the firewall, so it can reach internal services, admin interfaces bound to localhost, and other resources an external attacker cannot touch. In cloud environments the standout target is the instance metadata service at 169.254.169.254, which can return instance data and, critically, temporary IAM credentials — so SSRF to that endpoint has produced major real-world breaches by yielding cloud account access. It is a server-side attack (not browser-side like XSS) and needs no prior admin. Defences allowlist permitted destinations (blocklists are bypassable with encodings, redirects, DNS rebinding), block internal and metadata IPs, disable unused schemes, re-validate after redirects, and use hardened metadata modes like IMDSv2.',
        hint: 'From where does the request originate, and what sensitive endpoint does that let it reach in the cloud?',
      },
    },

    {
      id: 'rweb-i-03',
      title: 'XML external entities (XXE)',
      read: `**XXE** (XML External Entity) injection exploits how XML parsers handle a legacy feature — **external entities** — to read files, perform SSRF, and more. It appears wherever an app parses attacker-supplied XML.

## The vulnerable feature

XML lets a document define **entities** (like variables), and, dangerously, **external entities** whose value is loaded from a URI — a file path or URL — when the document is parsed. If an app parses XML you supply with a parser that resolves external entities (many parse them by default historically), you can define an entity pointing at something sensitive and have the parser fetch it for you.

## What XXE can do

- **Read local files** — define an entity as \`file:///etc/passwd\` and get its contents reflected back where the entity is used. Direct server file disclosure (source code, config, secrets).
- **SSRF** — point an external entity at an internal URL (or the cloud metadata endpoint) — XXE is a common *vector* for SSRF.
- **Blind XXE / out-of-band** — if the value isn't reflected, exfiltrate it via an external entity that sends the data to a server you control (OAST), using parameter entities.
- **Denial of service** — the "billion laughs" entity-expansion attack.

## Where it hides

Anywhere XML is accepted: classic XML APIs, SOAP, file uploads that parse XML (\`.docx\`, \`.svg\`, \`.xml\` configs), and endpoints that accept XML even when the UI uses JSON (try switching the \`Content-Type\` to \`application/xml\` and sending XML — apps sometimes still parse it).

## How to test

Submit XML defining an external entity pointing at a local file (or an OAST URL) and see if the content comes back (or the OAST fires). Start with a harmless target to confirm parsing, then a benign file like \`/etc/hostname\`.

## The fix (the mirror)

- **Disable external entity resolution** (and DTDs) in the XML parser — the definitive fix, and the default in modern libraries. Configure the parser securely rather than relying on filtering.
- Prefer less complex data formats (JSON) where possible; validate/allowlist.

"XML parsed with external entities enabled" → "disable DTDs/external entities in the parser" is the finding. In the lab, use an XXE to read a local file and to trigger an out-of-band request.`,
      sample: {
        lang: 'text',
        caption: 'XXE: an external entity loads a file the parser returns',
        code: `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">   <!-- external entity -->
]>
<data>&xxe;</data>   <!-- parser loads the file into &xxe; -->

<!-- SSRF variant: -->
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/">
<!-- Blind/OAST variant: point it at a Collaborator host -->

<!-- Tip: try switching Content-Type to application/xml on a JSON
     endpoint - it may still parse XML. -->`,
        output: `XXE = attacker XML + a parser that resolves EXTERNAL ENTITIES ->
read local files (file://), SSRF (http:// incl. metadata), blind
exfil via OAST, or DoS (billion laughs). Hides in XML/SOAP/SVG/
docx/config uploads. Fix: DISABLE DTDs + external entities in the
parser (the definitive fix; modern default).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the definitive fix for XXE (XML external entity) vulnerabilities?',
        options: [
          'Rename all XML files to .json',
          'Configure the XML parser to disable DTD processing and external entity resolution — removing the very feature XXE abuses — rather than trying to filter malicious XML',
          'Encrypt the XML documents in transit',
          'Add a Content Security Policy header',
        ],
        answer: 1,
        explain:
          'XXE abuses a specific XML feature: external entities, which cause the parser to load content from a URI (a local file via file://, or a URL for SSRF) when the document is parsed. The definitive fix is to configure the XML parser to disable DTD processing and external entity resolution entirely — this removes the capability the attack depends on, and it is the default in modern XML libraries. Relying on filtering malicious XML is fragile (encodings, parameter entities, blind/OAST variants evade it), so secure parser configuration is the correct control, complemented by preferring simpler formats like JSON and validating input. Renaming files, transport encryption, or CSP (a browser control) do not address server-side XML parsing at all.',
        hint: 'XXE depends on one parser feature — what happens if you turn that feature off?',
      },
    },

    {
      id: 'rweb-i-04',
      title: 'Insecure deserialization',
      read: `**Insecure deserialization** is a subtle, high-severity class (part of OWASP Software and Data Integrity Failures): when an app converts attacker-controlled data back into objects unsafely, it can lead to remote code execution and more.

## Serialization vs deserialization

Apps **serialize** objects (turn them into a storable/transmittable format — a byte stream, JSON, etc.) and later **deserialize** them (reconstruct the objects). If an app deserializes data that an attacker can control — a serialized object in a cookie, a hidden field, an API body, a cache — and the deserialization process can be abused, you have a problem.

## Why it can mean RCE

The danger depends on the language/library, but the core idea: deserialization can **instantiate arbitrary objects and invoke their methods** as part of reconstruction. Attackers craft a malicious serialized payload — a **gadget chain** — that, when deserialized, chains together existing classes in the app's libraries to achieve code execution (or file access, SSRF, etc.). This is prominent in Java (\`ObjectInputStream\`), PHP (\`unserialize\`), Python (\`pickle\`), Ruby, and .NET. Tools like **ysoserial** (Java) and **phpggc** (PHP) generate gadget-chain payloads for known libraries.

## Spotting it

- **Recognisable formats** — Java serialized objects start with specific bytes (base64 often begins \`rO0AB\`); PHP serialized data looks like \`O:4:"User":...\`; Python pickle has its own markers. Seeing these in cookies, tokens, or parameters is a strong signal.
- **Tampering effects** — modifying a serialized blob and seeing type errors or changed behaviour suggests the app deserializes your input.

## The impact

Insecure deserialization is frequently **critical**: reliable RCE in many cases, plus privilege escalation (tampering with a serialized \`isAdmin\` field), auth bypass, and more. It has been behind numerous severe CVEs.

## The fix (the mirror)

- **Don't deserialize untrusted data** — the strongest rule. If you must, use formats and libraries that don't instantiate arbitrary types (plain JSON with a strict schema, not native object serialization).
- **Integrity-check** serialized data (sign it) so tampering is detected, **allowlist** permitted classes, run deserialization in least privilege, and patch libraries (gadget chains live in dependencies).

"App deserializes attacker-controlled data" → "don't deserialize untrusted input; use safe formats / signing / class allowlists" is the finding. In the lab, tamper with a serialized cookie to change an attribute, and (on a purpose-built target) run a ysoserial/phpggc payload to understand gadget chains.`,
      sample: {
        lang: 'text',
        caption: 'Recognising and abusing serialized data',
        code: `RECOGNISE serialized data in cookies/fields/tokens:
  Java   : base64 often starts rO0AB...  (ObjectInputStream)
  PHP    : O:4:"User":2:{s:4:"name";s:5:"alice";s:7:"isAdmin";b:0;}
  Python : pickle markers

ABUSE:
  tamper an attribute:  isAdmin";b:0  ->  isAdmin";b:1  (priv esc)
  gadget chain (RCE):   ysoserial (Java) / phpggc (PHP) craft a
                        payload that chains library classes on
                        deserialize -> code execution.`,
        output: `Insecure deserialization = app rebuilds objects from attacker
data -> often RCE (gadget chains in libraries) + priv esc / auth
bypass. Recognise the formats (rO0AB, O:4:"...). Fix: DON'T
deserialize untrusted data; use JSON+schema, sign for integrity,
allowlist classes, patch libs.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can insecure deserialization lead to remote code execution, and what is the strongest fix?',
        options: [
          'Because deserialization decrypts the attacker’s traffic; the fix is TLS',
          'Because reconstructing objects from attacker-controlled data can instantiate arbitrary types and invoke their methods, letting a crafted "gadget chain" of existing library classes achieve code execution — and the strongest fix is to not deserialize untrusted data (use safe formats like JSON with a strict schema, plus integrity signing and class allowlists)',
          'Because it always exposes the database password in plaintext',
          'Because it only affects client-side JavaScript',
        ],
        answer: 1,
        explain:
          'Native deserialization reconstructs objects from a serialized representation, and in many languages that process can instantiate arbitrary classes and trigger their methods (constructors, magic methods, callbacks) as part of rebuilding the object graph. An attacker who controls the serialized input can craft a "gadget chain" — a sequence of existing classes already present in the app’s libraries — that, when deserialized, chains those behaviours into remote code execution (tools like ysoserial for Java and phpggc for PHP generate such payloads). Beyond RCE, tampering with serialized attributes enables privilege escalation and auth bypass. The strongest fix is architectural: do not deserialize untrusted data at all; where object exchange is needed, use safe formats such as JSON with a strict schema (which do not instantiate arbitrary types), and add integrity signing, class allowlists, least privilege, and library patching. It is a server-side issue, unrelated to TLS or being client-side.',
        hint: 'What does reconstructing an object from attacker data let the attacker cause to be instantiated and executed?',
      },
    },

    {
      id: 'rweb-i-05',
      title: 'Access control, escalation, mass assignment',
      read: `Amateur covered IDOR; intermediate deepens **broken access control** — the #1 risk — with privilege escalation and a subtle modern flaw: **mass assignment**.

## Privilege escalation via access control

Beyond reading another user's data, testers look to *gain higher privilege*:

- **Vertical escalation** — reach admin functionality as a normal user because function-level access isn't enforced. Find admin endpoints (mapping!) and call them directly; check if the *API* enforces what the *UI* hides.
- **Parameter-based role** — the app trusts a client-supplied role/level: a \`role=user\` field, an \`isAdmin=false\` flag, a \`userLevel\` cookie. Change it and see if the server believes you. Servers must derive privilege from the *session*, never from client input.

## Mass assignment (autobinding)

Modern frameworks conveniently **bind request parameters directly to object fields**. Handy, but dangerous: if an endpoint updates a \`User\` object from the request body, and you add a field the developer didn't intend to expose — like \`isAdmin\` or \`balance\` or \`role\` — the framework may set it. You update your profile with \`{"name":"me","isAdmin":true}\` and, if the object binds \`isAdmin\`, you just made yourself admin. Also called autobinding or object injection. Test by adding sensitive-looking fields (guessed from the object model, error messages, or GET responses) to update requests.

## Other access-control depth

- **Horizontal → vertical chains** — access an admin's object via IDOR, then use it to escalate.
- **Multi-step process flaws** — skip a step (e.g. go straight to the "confirm" endpoint), or replay an action out of order.
- **Referer/UI-based checks** — access control that relies on the \`Referer\` header or client-side routing is trivially bypassed.
- **Inconsistent enforcement** — one endpoint checks, a sibling endpoint (v1 vs v2, mobile API) doesn't.

## How to test

Be multiple users; for every action, try it as a lower-privileged user and by tampering with roles/ids/fields. For mass assignment, look at what fields the object has (GET responses reveal them) and try setting the sensitive ones you shouldn't control.

## The fix (the mirror)

- **Enforce authorization server-side on every function and object**, deny by default, derive identity/role from the session.
- **For mass assignment**: allowlist which fields a request may set (bind only intended fields), never blindly bind request bodies to internal objects.

In the lab, escalate to admin via a tampered role or a mass-assignment \`isAdmin\` field, and reach an admin function whose check is missing at the API level.`,
      sample: {
        lang: 'json',
        caption: 'Mass assignment: set a field you were never meant to control',
        code: `// You update your profile. The UI sends:
{ "name": "alice", "email": "alice@x.com" }

// You add a field the object has but the UI never shows:
{ "name": "alice", "email": "alice@x.com", "isAdmin": true }

// If the framework binds the whole body to the User object,
// isAdmin is now true -> privilege escalation.
// (Discover fields from GET responses, errors, the object model.)`,
        output: `Broken access control depth: vertical escalation (call admin
endpoints directly; API not enforcing what UI hides), client-
trusted roles (role=/isAdmin= in the request), and MASS ASSIGNMENT
(framework binds unintended fields). Fix: enforce authz server-side
per function/object; derive role from SESSION; ALLOWLIST bindable
fields.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is a mass assignment (autobinding) vulnerability, and how is it fixed?',
        options: [
          'Assigning too many servers to one application; fix by scaling down',
          'When a framework binds request parameters directly to object fields, an attacker can include unintended fields (e.g. isAdmin, role, balance) in a request and have the server set them — the fix is to allowlist which fields a request may set, binding only intended fields rather than the whole body',
          'A type of SQL injection that assigns many rows; fix with parameterisation',
          'A denial-of-service from large uploads; fix with size limits',
        ],
        answer: 1,
        explain:
          'Mass assignment (also called autobinding or object injection) happens when a framework conveniently maps incoming request parameters straight onto the fields of an internal object. If an update endpoint binds the whole request body to, say, a User object, an attacker can add a field the developer never intended to expose — such as isAdmin, role, or balance — and the framework dutifully sets it, granting privilege escalation or other unauthorized changes. Attackers discover such fields from GET responses, error messages, or the known object model. The fix is to allowlist exactly which fields a given request is permitted to set (binding only the intended fields), never blindly binding request bodies to internal objects; more broadly, derive privilege from the session and enforce authorization server-side. It is a form of broken access control, unrelated to scaling, SQL injection, or uploads.',
        hint: 'What happens if the framework maps every field in your JSON body onto the object, including ones the UI never sends?',
      },
    },

    {
      id: 'rweb-i-06',
      title: 'Advanced XSS and filter bypass',
      read: `Amateur found basic XSS; real apps try to *stop* it, so intermediate XSS is about **bypassing filters and CSP**, and understanding **context** deeply. (Authorized targets only.)

## Context is everything

Where your input lands dictates the payload. The same input is harmless in one place and executes in another:

- **In HTML body** — \`<script>...\`/\`<img onerror=...>\` work.
- **In an HTML attribute** — you must first *break out*: \`" onmouseover="alert(1)\` (close the attribute, add an event handler).
- **Inside existing JavaScript** — you inject into a JS string/context: \`';alert(1);//\` to break out of a string and add code.
- **In a URL/href** — \`javascript:alert(1)\`.
- **In DOM sinks** — depends on the sink (\`innerHTML\` vs \`textContent\`).

Reading the exact reflection context and crafting the matching break-out is the core advanced skill.

## Filter and WAF bypass

Apps and WAFs filter payloads; testers bypass them:

- **Alternate tags/events** — blocked \`<script>\`? Use \`<img onerror>\`, \`<svg onload>\`, \`<body onload>\`, \`<details ontoggle>\`.
- **Case and encoding** — \`<ScRiPt>\`, HTML entities, URL/double-URL encoding, unicode, to slip past naive string matching.
- **Broken/obfuscated payloads** — split keywords, use \`eval\`/\`Function\`, template literals, or attribute tricks the filter didn't anticipate.
- **Mutation XSS (mXSS)** — payloads that are safe until the browser's HTML parser *re-serialises* them into something executable.

The mindset: a filter is a blocklist, and blocklists have gaps. You probe what's filtered, then find a construct that achieves script execution outside the filter's coverage.

## CSP bypass

A **Content Security Policy** restricts what scripts run (defence in depth). But misconfigured CSPs are bypassable: overly permissive sources (\`unsafe-inline\`, \`unsafe-eval\`, a wildcard, or a trusted CDN hosting exploitable scripts/JSONP), missing \`object-src\`/\`base-uri\`, or nonce/hash mistakes. A strict, well-configured CSP genuinely blunts XSS; a loose one gives false comfort — and identifying *which* is a real finding.

## Exploitation beyond alert(1)

\`alert(1)\` proves execution; real impact is what you *report*: stealing the session (if not HttpOnly), performing actions as the victim (CSRF-like, but same-origin so tokens don't help), keylogging, or a full account-takeover chain. In a report you demonstrate realistic impact with the least-intrusive proof.

## The fix (the mirror)

- **Context-aware output encoding** (the primary fix) — encode for HTML/attribute/JS/URL context correctly.
- **A strict CSP** as defence in depth; framework auto-escaping; avoid dangerous sinks (\`innerHTML\`, \`eval\`).

In the lab, exploit XSS in an attribute and a JavaScript context (crafting break-outs), bypass a naive filter with an alternate event handler, and assess a CSP for weaknesses.`,
      sample: {
        lang: 'html',
        caption: 'Context-specific payloads and filter bypasses',
        code: `<!-- CONTEXT dictates the break-out: -->
HTML body:   <img src=x onerror=alert(1)>
attribute:   " onmouseover="alert(1)          (close the attribute first)
in JS string: ';alert(1);//                   (break out of the string)
href/URL:    javascript:alert(1)

<!-- FILTER BYPASS (blocked <script>): -->
<svg onload=alert(1)>   <BoDy OnLoad=alert(1)>   <details open ontoggle=alert(1)>
case/encoding: <ScRiPt>, &#x3c;, %3Cscript%3E, double-encoding`,
        output: `Advanced XSS = CONTEXT (craft the matching break-out) + FILTER/WAF
bypass (alternate tags/events, case/encoding, mXSS) + CSP bypass
(unsafe-inline, wildcards, JSONP on a trusted CDN). Prove real
impact, least-intrusive. Fix: CONTEXT-AWARE output encoding + a
STRICT CSP + avoid innerHTML/eval.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does the "context" of a reflection determine the XSS payload you need, rather than one payload working everywhere?',
        options: [
          'Because different browsers require different payloads',
          'Because where the input lands (HTML body, an HTML attribute, inside existing JavaScript, a URL, a DOM sink) dictates what you must do to reach an executable position — e.g. breaking out of an attribute with `" onmouseover=` or out of a JS string with `\';` — so the payload must match that context, which also drives the correct fix: context-aware output encoding',
          'Because payloads only work at night',
          'Because context only matters for stored XSS, not reflected',
        ],
        answer: 1,
        explain:
          'A reflected value sits in a specific syntactic context, and script only executes if your input reaches an executable position within that context. In the HTML body, an `<img onerror>` or `<svg onload>` executes directly; inside an HTML attribute you must first close the attribute (e.g. `" onmouseover="alert(1)`) to add an event handler; inside existing JavaScript you break out of the string/statement (e.g. `\';alert(1);//`); in a URL context you use `javascript:`; in a DOM sink it depends on the sink. So the same input is inert in one place and executes in another, and crafting the matching break-out is the core advanced skill. This is also why the correct fix is context-aware output encoding — encoding appropriately for HTML vs attribute vs JS vs URL — rather than a single blanket filter. It applies to both reflected and stored XSS and is not browser- or time-dependent.',
        hint: 'To run script, your input must reach an executable spot — what differs about doing that inside an attribute vs inside a JavaScript string?',
      },
    },

    {
      id: 'rweb-i-07',
      title: 'Business logic vulnerabilities',
      read: `Not every vulnerability is a technical injection. **Business logic flaws** are failures in the *rules and assumptions* of how the application is supposed to work — and they are invisible to scanners because the code is functioning "correctly," just not securely.

## What they are

A business logic vulnerability is when an attacker uses the app's legitimate features in an unintended way the designers didn't anticipate. There's no malformed input; you're abusing the *logic*. Because they're specific to each app, they require *understanding what the app does* and thinking about how its assumptions can be violated.

## Common patterns

- **Negative or extreme values** — a quantity field accepts \`-1\`, refunding money instead of charging; a transfer accepts a negative amount, reversing direction; huge values overflow or bypass limits.
- **Skipping or reordering steps** — a multi-step flow (cart → payment → confirm) where you jump straight to "confirm" without paying, or apply a discount after the total is calculated.
- **Abusing discounts/limits** — applying a coupon multiple times, stacking codes, or exploiting a "one per customer" that isn't enforced.
- **Trusting client-side values** — the price sent from the client (\`price=0.01\`), a total computed in the browser, a "free trial" flag the client controls.
- **Race conditions** — doing something faster than the app expects (a skilled topic): redeeming a gift card twice simultaneously, withdrawing the same balance in parallel.
- **Assumption violations** — the app assumes a value is always positive, a step always precedes another, or a user can't hold two states at once — and you break that assumption.

## Why scanners miss them

Automated tools test for *known technical patterns* (a quote for SQLi, a tag for XSS). Logic flaws have no signature — a \`-1\` in a quantity field is valid input; only *understanding the business meaning* reveals it's an exploit. This is why manual, thinking-driven testing by someone who understands the application is irreplaceable, and why logic flaws are a favourite of skilled testers and bug bounty hunters.

## How to test

Understand each feature's *intended* rules, then ask "what if I break this assumption?": negative/zero/huge values, out-of-order steps, repeated actions, client-supplied values the server should compute, and states the app doesn't expect. Map the workflow and probe each assumption.

## The fix (the mirror)

- **Enforce all business rules server-side** — validate quantities, prices, and state transitions on the server; never trust client-computed values.
- **Design with abuse in mind** — consider negative/extreme inputs, out-of-order requests, and concurrency for every workflow; enforce limits atomically.

In the lab, find a logic flaw in Juice Shop (e.g. manipulating a price/quantity or applying a coupon improperly) and describe the assumption it violates.`,
      sample: {
        lang: 'text',
        caption: 'Business logic flaws: abusing the rules, not the parser',
        code: `NEGATIVE VALUE:  quantity = -1   -> total goes DOWN / refund
CLIENT PRICE:    price = 0.01     -> server trusts client total
SKIP A STEP:     POST /checkout/confirm  (never paid)
STACK COUPONS:   apply SAVE50 x3  -> 150% off
RACE:            redeem one gift card twice at the same instant

No malformed input - all "valid". Only understanding the app's
INTENDED rules reveals the abuse. Scanners have no signature for it.`,
        output: `Business logic flaws = abusing the app's rules/assumptions with
legitimate features. Invisible to scanners (no signature); need
manual, app-understanding testing. Fix: enforce ALL rules
server-side (quantities, prices, state, limits, concurrency);
never trust client-computed values; design for abuse.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do automated scanners typically miss business logic vulnerabilities?',
        options: [
          'Because scanners are too slow to reach the checkout page',
          'Because logic flaws involve abusing the application’s intended rules with otherwise-valid input (e.g. a quantity of -1, skipping a payment step) and have no technical signature to match — only understanding what the app is supposed to do reveals the abuse, so manual, app-aware testing is required',
          'Because business logic flaws do not really exist',
          'Because scanners only test HTTPS sites',
        ],
        answer: 1,
        explain:
          'Automated scanners detect known technical patterns — a single quote for SQL injection, a script tag for XSS — because those have recognisable signatures. Business logic vulnerabilities have none: the input is valid and the code runs "correctly," but the attacker uses legitimate features in a way the designers never intended (a negative quantity that triggers a refund, a client-supplied price, skipping the payment step, stacking a one-use coupon, a race condition). Recognising these requires understanding the application’s intended rules and assumptions and asking what happens when they are violated — something only a human who comprehends the business context can do reliably. That is why manual, thinking-driven testing is irreplaceable for logic flaws, and why they are prized by skilled testers and bug bounty hunters. The fix is to enforce every business rule server-side and design each workflow anticipating abuse.',
        hint: 'What does a scanner look for, and does "quantity = -1" look malformed to it even though it is an exploit?',
      },
    },

    {
      id: 'rweb-i-08',
      title: 'API and GraphQL security',
      read: `Modern apps are increasingly **APIs** — REST and GraphQL backends that mobile apps and single-page frontends talk to. APIs have their own OWASP Top 10 and their own testing approach, and they often expose more than the UI suggests.

## Why APIs are a rich target

The frontend you see is just one client; the API often supports more operations, parameters, and data than any single UI screen shows. And because APIs are built for programmatic use, developers sometimes assume "only our app calls this" — a false assumption you exploit. The **OWASP API Security Top 10** highlights the recurring issues:

- **Broken Object Level Authorization (BOLA)** — API-flavoured IDOR, the #1 API risk: \`GET /api/orders/4021\` without checking ownership. APIs are full of object ids, so BOLA is everywhere.
- **Broken authentication** — weak/missing API auth, leaked keys, flawed token handling.
- **Broken Object Property Level Authorization** — mass assignment (setting fields you shouldn't) and excessive data exposure (the API returns more fields than the UI shows — read the raw JSON!).
- **Broken Function Level Authorization** — calling admin/other-role endpoints directly.
- **Unrestricted resource consumption** — no rate limiting → brute force, DoS, cost abuse.

## Testing REST APIs

Enumerate endpoints (from the app's JS, mobile app, docs, or \`/api\` discovery), inspect the raw responses (excessive data?), tamper with object ids (BOLA) and fields (mass assignment), try different methods and other roles' endpoints, and check for rate limiting. Everything you learned about access control applies, amplified.

## GraphQL specifics

**GraphQL** exposes a single endpoint with a flexible query language, which brings distinct issues:

- **Introspection** — GraphQL can describe its own entire schema; if introspection is enabled, you get a full map of every type, query, and mutation (the whole API surface handed to you). Query it first.
- **Excessive data / nested queries** — you can request exactly (and too much) data, and deeply nested queries can cause **denial of service** (query-depth/complexity abuse).
- **Authorization per field/resolver** — access control must be enforced on each resolver; gaps let you query data you shouldn't.
- **Mutations** — the state-changing operations; test them like any privileged action.

## The fix (the mirror)

- **Enforce object- and function-level authorization on every API call** (server-side), for every id and operation.
- **Return only necessary data**; allowlist writable fields (no mass assignment); rate-limit.
- **GraphQL**: disable introspection in production, limit query depth/complexity, enforce per-resolver authz.

In the lab, run GraphQL introspection to map an API, then find a BOLA by tampering with an object id, and note an endpoint returning excessive data.`,
      sample: {
        lang: 'text',
        caption: 'API testing: BOLA, excessive data, GraphQL introspection',
        code: `REST:
  GET /api/orders/4021   -> change to 4022 = someone else's order (BOLA)
  raw JSON returns password_hash, SSN... (excessive data exposure)
  POST with {"isAdmin":true} (mass assignment) ; try admin endpoints

GRAPHQL (single endpoint, flexible queries):
  { __schema { types { name } } }   <- INTROSPECTION = full API map
  deeply nested query -> DoS (complexity abuse)
  authz must be per-RESOLVER, or you query data you shouldn't`,
        output: `APIs expose MORE than the UI. #1 risk = BOLA (API IDOR: object ids
without ownership checks). Also excessive data (read raw JSON!),
mass assignment, function-level authz, no rate limiting. GraphQL:
introspection maps everything, nesting -> DoS. Fix: per-object +
per-function authz on EVERY call; minimal data; disable
introspection in prod; limit query depth.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What does GraphQL introspection give an attacker, and what is the corresponding defence?',
        options: [
          'It decrypts the API traffic; the defence is TLS',
          'When enabled, introspection lets anyone query the API’s own schema and obtain a complete map of every type, query and mutation — the whole API surface — so the defence is to disable introspection in production (alongside per-resolver authorization and query-depth limits)',
          'It grants admin access automatically; the defence is a password',
          'It is required for GraphQL to function and cannot be disabled',
        ],
        answer: 1,
        explain:
          'GraphQL supports introspection — the ability to query the API about its own schema. When it is left enabled, an attacker can retrieve a full description of every type, field, query, and mutation the API offers, effectively getting a complete map of the entire API surface handed to them, which greatly accelerates finding sensitive operations and data. The corresponding defence is to disable introspection in production environments so the schema is not freely exposed, complemented by enforcing authorization on each resolver (so hidden operations are still protected) and limiting query depth/complexity to prevent denial-of-service from deeply nested queries. Introspection does not decrypt traffic or grant access by itself, and it can absolutely be disabled — it is a development convenience, not a runtime necessity.',
        hint: 'What can you learn by asking a GraphQL endpoint to describe itself, and should that be available in production?',
      },
    },

    {
      id: 'rweb-i-09',
      title: 'Attacking JSON Web Tokens',
      read: `**JWTs** (JSON Web Tokens) are everywhere in modern auth — stateless tokens carrying claims like your user id and role. They're powerful but frequently misimplemented, and JWT attacks are a staple of API testing.

## What a JWT is

A JWT has three base64url parts separated by dots: **header.payload.signature**. The header names the algorithm; the **payload** holds claims (\`sub\`, \`role\`, \`exp\`, etc.) — **readable by anyone** (base64, not encrypted); the **signature** is what makes it tamper-evident: the server signs header+payload with a secret (HMAC) or a private key (RSA/ECDSA), and verifies that signature to trust the claims.

The security rests entirely on the signature. If you can forge a valid signature (or make the server skip checking it), you can set any claims you like — \`"role":"admin"\` — and become anyone.

## The classic JWT attacks

- **alg: none** — the header specifies the algorithm; some libraries historically accepted \`"alg":"none"\`, meaning *no signature required*. Set \`alg\` to \`none\`, strip the signature, change the payload to \`admin\` — accepted. A devastating, well-known flaw.
- **Weak HMAC secret** — if the token is signed with HMAC (HS256) using a weak/guessable secret, you can **crack it offline** (hashcat) and then forge valid tokens with any claims. Test secret strength.
- **Algorithm confusion (RS256 → HS256)** — if the server uses RSA (RS256) but can be tricked into verifying an HS256 token, an attacker signs a token using the *public* key (which is public) as the HMAC secret; a naive verifier accepts it. A classic key-confusion bug.
- **Not verifying the signature at all** — some apps decode the payload but never verify — trivial forgery.
- **Missing/ignored expiry or claims** — tokens that never expire, or \`exp\`/audience not checked; replay and reuse.
- **Sensitive data in the payload** — since it's readable, secrets in the JWT leak.

## How to test

Decode the token (it's just base64 — read the claims). Try \`alg:none\`, try cracking an HS256 secret, test algorithm confusion, tamper with claims and see if changes are accepted, check expiry handling. Burp's JWT extensions automate much of this.

## The fix (the mirror)

- **Verify the signature, always**, with a strong algorithm and a strong secret/key; **reject \`alg:none\`** and pin the expected algorithm (don't let the token choose).
- **Validate all claims** — expiry, issuer, audience; keep tokens short-lived; don't put secrets in the payload.

In the lab, decode a JWT, forge an admin token via \`alg:none\` (on a vulnerable target), and crack a weak HS256 secret to sign your own token.`,
      sample: {
        lang: 'text',
        caption: 'A JWT and the attacks against its signature',
        code: `JWT = header . payload . signature   (all base64url)
  header : {"alg":"HS256","typ":"JWT"}
  payload: {"sub":"alice","role":"user","exp":...}  <- READABLE
  signature: HMAC/RSA over header+payload with a secret/key

ATTACKS (all target signature trust):
  alg:none      -> set "alg":"none", drop signature, edit payload
  weak HS256    -> crack the secret offline -> forge any token
  RS256->HS256  -> sign with the PUBLIC key as HMAC secret (confusion)
  no verify     -> app decodes but never checks signature
  edit role:user -> role:admin  and see if it's accepted`,
        output: `A JWT's payload is READABLE (base64, not encrypted); its security
is ONLY the signature. Attacks: alg:none, weak/crackable HS256
secret, RS256->HS256 confusion, no verification, ignored expiry.
Fix: ALWAYS verify signature; PIN the algorithm; reject alg:none;
strong secret/key; validate exp/iss/aud; no secrets in payload.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the "alg: none" JWT attack so dangerous, and what fix prevents it?',
        options: [
          'It encrypts the token so the server cannot read it; fix with TLS',
          'The JWT header names the signing algorithm, and libraries that accept "alg":"none" require no signature — so an attacker strips the signature and edits the payload (e.g. role to admin) and the token is accepted; the fix is to reject "none" and pin the expected algorithm server-side rather than trusting the token’s header',
          'It only reveals the payload, which is already public, so it is harmless',
          'It works only if the attacker already knows the signing key',
        ],
        answer: 1,
        explain:
          'A JWT’s trustworthiness rests entirely on its signature — the server signs header+payload and verifies that signature before trusting the claims. The header itself declares which algorithm to use, and some libraries historically honoured "alg":"none", meaning no signature is required at all. An attacker sets the header’s algorithm to none, removes the signature, and freely edits the payload (for example changing role from user to admin); a vulnerable verifier accepts it, granting full impersonation. The danger is that it needs no key and no cracking. The fix is to never accept "none" and to pin the expected algorithm on the server side rather than letting the attacker-controlled token dictate how it is verified — plus using strong keys and validating claims. It is not about encryption (the payload is already readable base64), and it specifically does not require knowing the key.',
        hint: 'Who chooses the algorithm named in the header, and what happens if the server trusts a header that says "no signature needed"?',
      },
    },

    {
      id: 'rweb-i-10',
      title: 'Content discovery and enumeration',
      read: `Beginner introduced content discovery; intermediate makes it a **deep, systematic** discipline, because the more of an app's real surface you uncover, the more you can test. Hidden endpoints, parameters, and versions are where much of the juicy attack surface lives.

## Deep directory and file discovery

Go beyond a basic wordlist run:

- **Good wordlists** — use quality lists (SecLists) tuned to the tech stack; a PHP app and a Java app hide different things.
- **Recursion** — discovered directories have their own contents; recurse into them (\`ffuf\` recursion, \`feroxbuster\`).
- **Extensions** — fuzz with the right extensions (\`.php\`, \`.bak\`, \`.old\`, \`.zip\`, \`.json\`) to find backups and source.
- **Interpret status/size** — 200 vs 403 (exists but forbidden — still a signal), 401, redirects; sort by response size to spot the real hits among 404-alikes (some apps return 200 for everything — calibrate).

## Parameter discovery

Endpoints often accept **parameters that aren't in any form or link** — hidden features, debug flags, legacy params. Tools like **Arjun** or Burp's param miner **fuzz parameter names** and detect which ones change the response. A hidden \`?debug=true\`, \`?admin=1\`, or an undocumented parameter can unlock functionality or vulnerabilities the visible app never exposes.

## Virtual hosts and subdomains

- **Subdomain enumeration** — an app is rarely alone; \`dev.\`, \`staging.\`, \`api.\`, \`admin.\` subdomains (found via DNS brute force, certificate transparency logs, tools like amass/subfinder) often host less-hardened or forgotten apps.
- **Virtual hosts (vhosts)** — one IP serving multiple sites by \`Host\` header; fuzzing the \`Host\` header can reveal internal/unlinked vhosts.

## Other surface

- **JavaScript analysis** — modern JS bundles reference endpoints, parameters, and secrets; parse them (LinkFinder-style) for API routes the app calls.
- **Archived content** — the Wayback Machine and similar reveal old endpoints and parameters that may still work.
- **Version/backup files** — \`/.git\`, \`.svn\`, \`~\` backups, \`swp\` files.

## Why depth pays

Real engagements and bounties are frequently won on the *forgotten* surface: a staging subdomain with debug on, a legacy API version without the new access controls, a hidden parameter, an old endpoint that survived a refactor. Thorough enumeration is the single highest-yield habit in web testing — the vulnerabilities are disproportionately on the surface no one remembered.

## The mirror

Defensively: minimise attack surface (remove old endpoints, backups, debug params, unused subdomains), don't leave \`.git\`/backups exposed, enforce the *same* access controls across all versions and subdomains, and monitor for exposed assets. In the lab, run recursive content discovery, param-fuzz an endpoint, and enumerate subdomains of a target you're authorized to test.`,
      sample: {
        lang: 'bash',
        caption: 'Deep content, parameter, and subdomain discovery',
        code: `# Recursive dir/file discovery with extensions (calibrated):
feroxbuster -u https://target -w seclists.txt -x php,bak,zip,json

# Hidden PARAMETER discovery (params not in any form/link):
arjun -u https://target/api/user     # finds ?debug=, ?admin=, ...

# Subdomain enumeration (dev/staging/api/admin often less hardened):
subfinder -d target.com | httpx      # + certificate transparency

# Mine the app's JavaScript for endpoints and secrets.`,
        output: `Depth wins: recurse dirs, fuzz extensions (backups/source),
discover HIDDEN parameters (?debug/?admin), enumerate SUBDOMAINS
(dev/staging/api - less hardened) and vhosts, mine JS + Wayback.
Vulns cluster on the FORGOTTEN surface. Mirror: minimise surface,
same controls across all versions/subdomains, no exposed .git/backups.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is thorough content and subdomain enumeration one of the highest-yield habits in web testing?',
        options: [
          'Because it exploits vulnerabilities automatically',
          'Because vulnerabilities disproportionately cluster on the forgotten or hidden surface — staging/dev subdomains with debug enabled, legacy API versions lacking new access controls, hidden parameters, backups, and old endpoints that survived refactors — which are only found by systematic discovery, not by using the visible app',
          'Because it is faster than testing the main application',
          'Because subdomains are always more secure than the main site',
        ],
        answer: 1,
        explain:
          'The visible application is only part of the real attack surface. Systematic enumeration uncovers the parts no one remembers: development and staging subdomains that are less hardened or have debugging enabled, legacy API versions that never received the access-control fixes the current version has, hidden parameters (like ?debug=true or ?admin=1) not present in any form, exposed backups and .git directories, and old endpoints that survived a refactor. Vulnerabilities cluster disproportionately on exactly this forgotten surface, so uncovering it directly multiplies what you can find and test — which is why deep directory/parameter/subdomain/JS/archive discovery is the single highest-yield habit, and a mainstay of engagements and bug bounties. It does not exploit anything by itself, and forgotten subdomains are typically less secure, not more.',
        hint: 'Where do vulnerabilities tend to hide — on the polished main app, or on the surface everyone forgot about?',
      },
    },

    {
      id: 'rweb-i-11',
      title: 'Chaining vulnerabilities',
      read: `The highest-impact findings often come not from one bug but from **chaining** several — each individually modest, together critical. Thinking in chains is the shift from finding bugs to demonstrating real-world compromise.

## Why chaining matters

A single low/medium finding may be dismissed ("only self-XSS", "IDOR on non-sensitive data"). But combined, modest bugs cascade into severe impact — and the *chain* is what proves the true risk to the business. Skilled testers and top bug bounty reports are largely about chains. It's also honest: real attackers chain, so a realistic assessment does too.

## Classic chains

- **Self-XSS + CSRF → stored XSS** — an XSS that only fires on your own account (low), plus a CSRF that sets a field on the victim's account, becomes XSS on the victim.
- **IDOR + info disclosure → account takeover** — an IDOR that leaks a password-reset token, or user details that answer security questions, leads to taking over accounts.
- **SSRF + cloud metadata → cloud compromise** — SSRF (medium alone) reaching \`169.254.169.254\` yields IAM credentials → the cloud account (critical). The canonical chain.
- **XSS → CSRF-token theft → account actions** — same-origin XSS reads the anti-CSRF token, defeating CSRF protection, enabling state-changing actions as the victim.
- **File upload + path traversal → RCE** — an upload that doesn't execute, plus traversal to place it in an executable dir.
- **Open redirect + OAuth → token theft** — an open redirect in an OAuth flow leaks the authorization code/token.
- **Subdomain takeover + cookie scope → session theft** — claim an abandoned subdomain, then abuse cookies scoped to the parent domain.

## The mindset

For every finding, ask: **what does this enable?** A leaked id → feed an IDOR. A reflected value → combine with a way to deliver it. A weak redirect → part of an auth chain. Map the app's *trust relationships* and *data flows*, then look for a path where one weakness unlocks the next. The final impact — "account takeover", "cloud compromise", "RCE" — is the story you build and report.

## Reporting a chain

Present the chain as a clear, step-by-step path with the *combined* impact and severity (which exceeds any single link), and note that fixing *any* link breaks the chain — giving defenders multiple remediation points. Each individual bug still gets its own fix.

## The mirror

Defence in depth is the antidote: because a chain needs every link, robust controls at each layer (no self-XSS, SameSite cookies, per-object authz, hardened metadata, safe uploads) mean a single lapse doesn't cascade. In the lab, chain two findings (e.g. IDOR revealing data that enables another attack) and write the combined-impact story.`,
      sample: {
        lang: 'text',
        caption: 'Modest bugs chained into critical impact',
        code: `SSRF (medium) --> http://169.254.169.254 --> IAM creds
              --> CLOUD ACCOUNT COMPROMISE (critical)

self-XSS (low) + CSRF --> STORED XSS on the victim
IDOR (leaks reset token) + reset flow --> ACCOUNT TAKEOVER
upload (non-exec) + path traversal --> web shell --> RCE
XSS (same-origin) --> steal CSRF token --> actions as victim

For EVERY finding ask: "what does this ENABLE?"`,
        output: `Chaining turns modest bugs into critical impact - and proves the
REAL risk. Map trust relationships + data flows; find where one
weakness unlocks the next. Report the chain as a step-by-step path
with COMBINED severity; fixing ANY link breaks it. Mirror: defence
in depth so one lapse doesn't cascade.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is thinking in terms of vulnerability chains important, and what does it imply for remediation?',
        options: [
          'Chaining is only a theoretical exercise with no real impact',
          'Individually modest bugs (e.g. SSRF, an IDOR, a self-XSS) can combine into critical impact like cloud compromise or account takeover, which proves the true business risk — and because a chain needs every link, fixing any single link breaks it, giving defenders multiple remediation points (each bug still warranting its own fix)',
          'Chaining means running many scanners at once',
          'Chains only matter for network attacks, not web',
        ],
        answer: 1,
        explain:
          'Real-world compromise usually comes from combining several weaknesses, each modest on its own, into a path with severe impact — SSRF reaching cloud metadata yields IAM credentials and thus cloud account compromise; an IDOR leaking a reset token plus the reset flow yields account takeover; self-XSS plus CSRF yields stored XSS on victims. Thinking in chains is what elevates a list of low/medium findings into a demonstration of the actual business risk (and mirrors how genuine attackers operate). For remediation it has a useful implication: since a chain requires every link to work, fixing any one link breaks the whole chain — so defenders have multiple points at which to intervene, and defence in depth means a single lapse does not cascade. Each individual vulnerability should still receive its own fix. It is very much a web (and general) concern, not merely theoretical or network-only.',
        hint: 'What do a low SSRF and a metadata endpoint become together — and if a chain needs all its links, what does fixing one link do?',
      },
    },

    {
      id: 'rweb-i-12',
      title: 'Project: a chained web attack',
      read: `Your intermediate capstone goes beyond single bugs: find several deeper vulnerabilities on a lab app and **chain** them into a demonstrated, high-impact compromise, with an API and modern-flaw component. Local lab / authorized only.

## The brief

On a suitable target (Juice Shop is ideal, or a PortSwigger Academy lab set, or a purpose-built vulnerable app), work the deeper classes from this level and connect at least two into a chain that proves real impact (account takeover, data breach, or RCE).

## Target classes (cover several, including a chain)

1. **Advanced injection** — a blind/time-based SQLi (extract data via an oracle), or SSRF/XXE.
2. **Access control depth** — a BOLA/IDOR, mass assignment, or privilege escalation to admin.
3. **A modern-auth flaw** — a JWT attack (\`alg:none\`, weak secret, or confusion) or a business-logic bypass.
4. **API / GraphQL** — enumerate an API (introspection or discovery), find excessive data or a BOLA.
5. **The chain** — connect at least two findings so one enables the next (e.g. content discovery → hidden endpoint → IDOR leaking a token → account takeover; or SSRF → metadata → credentials).

## Steps

- **Enumerate deeply** — content/parameter/subdomain discovery and API mapping first (the surface drives everything).
- **Find and prove** each vulnerability with a least-intrusive demonstration, understanding the mechanism.
- **Build the chain** — identify where one finding enables another; execute and document the full path.
- **Report** — individual findings *plus* the chain as a step-by-step attack narrative with combined impact/severity, and remediation for each link.

## The standard

You pass when you have: several deeper vulnerabilities found and *proven* (including at least one advanced injection or SSRF/XXE and one access-control/auth flaw); a *working chain* of at least two findings demonstrating critical real-world impact; and a professional report presenting both the individual findings and the chain narrative, with per-link remediation and the observation that breaking any link stops the chain. All in the local lab, nothing destructive, no real data exfiltrated.

## Where next

Skilled covers the cutting edge: SSTI, advanced SSRF and deserialization to RCE, race conditions, request smuggling, cache poisoning, OAuth/SAML attacks, client-side (prototype pollution, postMessage), and WAF evasion — and a full web-app pentest end to end. Everything there builds on the deeper vulnerabilities and chaining mindset you just practised.`,
      sample: {
        lang: 'text',
        caption: 'The intermediate project: prove deeper bugs, then chain them',
        code: `ENUMERATE deeply (content/param/subdomain/API + GraphQL introspection)
FIND & PROVE (several):
  blind/time SQLi  or  SSRF/XXE
  BOLA/IDOR / mass assignment / priv-esc
  JWT attack  or  business-logic bypass
CHAIN >= 2 into critical impact, e.g.:
  discovery -> hidden endpoint -> IDOR leaks reset token -> ATO
  SSRF -> 169.254.169.254 -> IAM creds -> cloud compromise
REPORT: findings + the CHAIN narrative + per-link fixes`,
        output: `Pass = several deeper vulns PROVEN (>=1 advanced injection or
SSRF/XXE, >=1 access-control/auth flaw) + a WORKING chain of >=2
showing critical impact + a pro report (findings + chain narrative
+ per-link remediation; breaking any link stops it). Local lab,
nothing destructive, no real data taken.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What must the intermediate capstone demonstrate beyond finding individual deeper vulnerabilities?',
        options: [
          'The single most destructive exploit possible',
          'A working chain of at least two findings connected so one enables the next, demonstrating critical real-world impact (e.g. account takeover or cloud compromise), reported as a step-by-step narrative with combined severity and per-link remediation — all in the local lab, nothing destructive',
          'The largest number of subdomains enumerated',
          'That a scanner can reproduce every finding automatically',
        ],
        answer: 1,
        explain:
          'The intermediate capstone’s distinguishing requirement is chaining. Beyond proving several deeper vulnerabilities (at least one advanced injection or SSRF/XXE and one access-control/auth flaw), you must connect at least two of them so that one finding enables the next, producing a demonstrated critical impact such as account takeover, data breach, or cloud compromise. This is reported as a clear step-by-step attack narrative with the combined severity (which exceeds any single link) and remediation for each link, noting that fixing any one link breaks the chain. It proves the true business risk the way real attackers do — and it is done in the local lab with least-intrusive proofs, nothing destructive, and no real data exfiltrated. Raw destructiveness, subdomain counts, or scanner reproducibility are not the standard.',
        hint: 'The word is in the title — what must you connect together, and how do you report the combined result?',
      },
    },
  ],
}

export default level
