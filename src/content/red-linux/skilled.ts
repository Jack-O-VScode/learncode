import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Advanced technique and professional operation',
  summary:
    'Operating as a professional: engagement types and scoping, adapting and troubleshooting exploits, the fundamentals of memory-corruption exploitation, advanced escalation and traversal, red-team OPSEC, cloud and CI/CD attack surface, credential attacks at scale, workflow automation, and reporting that drives remediation — always within authorization.',
  outcomes: [
    'Scope and run different engagement types correctly',
    'Adapt, troubleshoot and understand exploits, including memory-corruption basics',
    'Chain advanced escalation and traverse complex networks',
    'Operate cleanly with red-team OPSEC and deconfliction',
    'Test cloud IAM and CI/CD supply-chain attack surface',
    'Automate workflow and report to drive remediation',
  ],
  steps: [
    {
      id: 'rlin-s-01',
      title: 'Engagement types and scoping',
      read: `Professional offensive work comes in distinct **engagement types**, each with different goals, rules and deliverables. Choosing and scoping the right one — and operating within its rules — is a skilled defender-attacker's foundation, because it governs everything you're allowed to do.

## The main types

- **Vulnerability assessment** — breadth-first identification of vulnerabilities (often largely automated scanning plus validation). Goal: a comprehensive list of weaknesses. Less about deep exploitation, more about coverage.
- **Penetration test** — goes further: actually exploiting vulnerabilities to demonstrate impact, usually against a defined scope, often with the client's knowledge. Variants by knowledge level: **black box** (no prior information — models an external attacker), **white box** (full information, source, credentials — maximises coverage efficiently), **grey box** (partial — a realistic "compromised user" starting point). Goal: demonstrate exploitable risk and how to fix it.
- **Red team engagement** — objective-based and adversary-emulating: a specific goal (reach the crown jewels, prove domain compromise) pursued the way a real threat actor would, testing the organisation's **detection and response** as much as its vulnerabilities. Often stealthy, broader scope (sometimes including social engineering and physical), and the blue team may not know it's happening. Goal: test the whole security program end to end.
- **Purple team** — red and blue working together, collaboratively, to improve detection (the loop from the defensive tracks).
- **Bug bounty** — continuous, crowd-sourced testing within a published scope and rules, paid per valid finding.

## Scoping and rules of engagement

Whatever the type, the engagement is defined by documents that bound it — and staying inside them is professional and legal necessity:

- **Scope** — exactly which systems/IPs/apps/accounts are in and out of bounds. You never touch out-of-scope assets, even if reachable.
- **Rules of engagement (RoE)** — permitted techniques (is DoS allowed? social engineering? physical? production systems or only staging?), the testing window (hours, dates), data-handling rules (no exfiltration of real data), and escalation/emergency contacts.
- **Authorization** — signed by someone with authority over the systems.
- **Deconfliction and safety** — how to pause if something breaks, who to call, and how the client distinguishes your activity from a real attack.

## Why this matters at the skilled level

As you gain capability, the constraints matter *more*, not less: a skilled tester can cause real damage, reach further than intended, and stumble into out-of-scope or third-party systems. The discipline of scoping — knowing precisely what you may do, stopping at the boundary, handling data correctly, and communicating — is what separates a professional from a liability. Many real incidents involving testers came from scope violations, not technical failures: a scan that hit a third-party's shared infrastructure, an exploit that took down production, data that shouldn't have been copied.

The type and scope also shape *technique*: a stealthy red team avoids the loud scanning a penetration test uses freely; a black-box test enumerates from scratch while a white-box test starts with source. Understanding the engagement you're on tells you not just what's allowed, but how to work — and the report you produce is shaped by the type's goals (a vuln list, an impact narrative, or a detection-and-response assessment). Getting the frame right is the first professional skill.`,
      sample: {
        lang: 'text',
        caption: 'Engagement types: goal, knowledge, stealth, and deliverable',
        code: `Type                Goal                     Knowledge   Stealth   Deliverable
---------------------------------------------------------------------------------
Vuln assessment     find weaknesses (breadth) usually white  none     vuln list
Penetration test    demonstrate exploitable   black/grey/    low      impact +
                    risk                       white                   remediation
Red team            test detection & response objective-based HIGH     detect/respond
                    (emulate a real actor)                             assessment
Purple team         improve detection together collaborative  n/a     tuned detections
Bug bounty          continuous crowd testing   scoped         varies   per-finding

Everything is bounded by SCOPE + RULES OF ENGAGEMENT + AUTHORIZATION.
Skilled testers can do real damage - the constraints matter MORE, not less.`,
        output: `Each engagement type has a different goal, knowledge level,
stealth requirement and deliverable, and each is bounded by
scope, rules of engagement and authorization. The type shapes
both what you may do and HOW you work (loud pentest vs stealthy
red team). Staying inside the boundary is the first professional
skill - most tester incidents are scope violations, not technical.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does a red team engagement fundamentally differ in goal from a standard penetration test?',
        options: [
          'A red team only uses automated scanners',
          'A penetration test aims to find and demonstrate exploitable vulnerabilities across a scope, usually with the client’s knowledge; a red team is objective-based and emulates a real adversary (often stealthily, sometimes unknown to the blue team) to test the organisation’s detection and response — its whole security program — not just its vulnerabilities',
          'A red team is not bound by scope or authorization',
          'They are identical; the terms are interchangeable',
        ],
        answer: 1,
        explain:
          'A penetration test is vulnerability-focused: enumerate a defined scope, exploit what is found, and report the exploitable risks and their fixes, usually openly. A red team is objective- and adversary-focused: pursue a specific goal (reach the crown jewels) the way a real threat actor would, typically stealthily and often without the blue team’s knowledge, so that the exercise measures the organisation’s ability to *detect and respond*, not only the presence of bugs. This changes technique (stealth over loud thoroughness) and deliverable (a detection-and-response assessment, feeding the purple-team loop). Both remain strictly bounded by scope, rules of engagement and authorization — the constraints apply to every engagement type.',
        hint: 'Is the red team measuring the presence of bugs, or the organisation’s ability to notice and stop an attacker?',
      },
    },

    {
      id: 'rlin-s-02',
      title: 'When exploits fail — adapting them',
      read: `Public exploits often don't work first time against a real target. A skilled tester's edge is the ability to **diagnose why an exploit failed and adapt it** — the difference between "the exploit didn't work, target's secure" and "the exploit needed adjusting, here's the foothold."

## Why exploits fail

- **Version/configuration mismatch** — the target isn't quite the vulnerable version, or the vulnerable feature is disabled, or a backported patch fixed it while leaving the version string (the CVE-applicability judgement from earlier).
- **Environmental differences** — the exploit was written against a specific OS, architecture, language version, or default config, and the target differs.
- **Hardcoded values** — offsets, addresses, paths, ports, or IPs baked into the PoC that need changing for your target and setup (a very common fix: the exploit has the author's IP or a target-specific memory offset).
- **Payload issues** — the payload doesn't match the target (wrong architecture, needs a different shell type), or is caught/mangled (bad characters, size limits, encoding).
- **Network conditions** — the reverse connection is blocked (need a different port/direction), or timing is off.
- **Mitigations** — modern protections (ASLR, DEP, stack canaries — next step) defeat a naive exploit.

## The diagnostic approach

1. **Read the exploit thoroughly** — understand what it does, what it expects, and every value it uses. (You should never run an unread exploit anyway.)
2. **Verify the precondition** — is the target really vulnerable, in the right configuration? Confirm before blaming the exploit.
3. **Check the obvious hardcoded values** — IPs, ports, paths, offsets, target versions. Set them for your environment.
4. **Watch what actually happens** — capture the traffic (tcpdump/Wireshark), read the target's response, check your listener. Where exactly does it fail? A refused connection, an error, a crash, silence?
5. **Adjust incrementally** — change one thing, test, observe. Match the payload to the target, handle bad characters, adjust offsets.
6. **Understand the vulnerability, not just the script** — if you understand *why* the flaw exists, you can often exploit it manually when the canned exploit can't be salvaged.

## Manual exploitation

Sometimes the PoC is unsalvageable and you exploit the vulnerability by hand — crafting the malicious request or input yourself, based on understanding the flaw. This is where deep understanding pays off: a documented vulnerability plus comprehension of the mechanism lets you build a working exploit even without reliable public code. For web flaws especially (the offensive web track), manual exploitation is routine.

## The professional value

Real targets rarely match a canned exploit exactly, so the tester who can only run scripts hits a wall while the one who understands and adapts finds the foothold. And this understanding is what lets you write an accurate report: not "ran exploit X" but "the target runs vulnerable version Y in configuration Z; the public PoC required adjusting the offset for this build; here's the reliable path and the fix." Adapting exploits is where mechanical skill becomes real capability — and it rests entirely on understanding over copy-pasting.`,
      sample: {
        lang: 'text',
        caption: 'Diagnosing and adapting a failing exploit',
        code: `Exploit "works" in the write-up but fails on your target. Diagnose:

  1. read it: what version/config/arch does it assume? what values?
  2. confirm the target IS vulnerable (right version, feature enabled?)
  3. hardcoded values? -> author's LHOST 10.0.0.5, a fixed offset,
     target path /var/www -> change ALL for your environment
  4. watch: tcpdump shows the reverse shell connecting to the AUTHOR's
     old IP, not yours -> fix LHOST/LPORT
  5. payload arch mismatch (x86 vs x64) -> regenerate with msfvenom
  6. bad characters mangling the payload -> encode / choose a clean one

Unsalvageable PoC + understanding the flaw -> exploit it MANUALLY.`,
        output: `Exploits fail from version/config mismatch, hardcoded values,
payload/arch issues, blocked connections, or mitigations. The
skilled fix: read it, confirm the vuln, correct hardcoded values,
WATCH where it fails, adjust one thing at a time - or exploit the
flaw manually from understanding. "It didn't work" often means
"it needed adapting", not "the target is secure".`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A public exploit fails against a target that enumeration strongly suggests is vulnerable. Why is "the target must be secure" often the wrong conclusion?',
        options: [
          'Because exploits always work on vulnerable targets',
          'Because public exploits frequently fail on real targets due to fixable environmental issues — hardcoded IPs/ports/paths/offsets, payload or architecture mismatches, blocked reverse connections, or minor version/config differences — so a skilled tester diagnoses and adapts the exploit (or exploits the flaw manually from understanding) rather than assuming the vulnerability isn’t there',
          'Because vulnerable targets cannot be exploited twice',
          'Because failing exploits prove the CVE is false',
        ],
        answer: 1,
        explain:
          'Proof-of-concept code is written against the author’s specific environment and commonly bakes in values (their IP and port, file paths, memory offsets, a target version) and assumptions (architecture, default config, payload type) that don’t match your target — so it fails for reasons that have nothing to do with whether the vulnerability exists. The skilled response is to read the exploit, confirm the precondition, correct the hardcoded values, observe exactly where it breaks (capture the traffic, read the responses), adjust incrementally, and — if the PoC is unsalvageable — exploit the flaw by hand from understanding. Concluding "secure" from a failed canned exploit is the same mistake as concluding "empty" from a shallow scan.',
        hint: 'Is a PoC written for the author’s exact environment, or for yours — and what values does it likely hardcode?',
      },
    },

    {
      id: 'rlin-s-03',
      title: 'Memory-corruption exploitation, in principle',
      read: `Some vulnerabilities aren't logic flaws or misconfigurations but **memory-corruption bugs** in compiled software — buffer overflows and their relatives. Understanding the mechanism (conceptually) is a skilled milestone: it explains a whole class of exploits, and it explains the mitigations you'll meet and the modern difficulty of exploitation.

## The classic buffer overflow

A program allocates a fixed-size buffer (say 64 bytes) and copies input into it *without checking the length*. Send 100 bytes and the extra 36 overflow the buffer, overwriting adjacent memory. On the stack, that adjacent memory includes the **return address** — where the CPU jumps when the current function finishes. An attacker who overflows precisely can **overwrite the return address** with an address of their choosing, redirecting execution to code they control (historically, shellcode placed in the buffer). The result is arbitrary code execution.

This is the archetype; related bugs include heap overflows, use-after-free, format-string bugs, and integer overflows leading to undersized allocations — all corrupting memory to hijack execution.

## Why it matters to understand

- It explains **why** many critical CVEs exist and why "run this input and get code execution" is possible in C/C++ software.
- It's the basis of the classic exploit-development skill set (taught in OSCP-style courses and CTF pwn challenges).
- It clarifies the **mitigations** you constantly encounter.

## The mitigations (and why exploitation got hard)

Modern systems layer defences that make naive overflows fail — the same protections the defensive tracks recommended enabling:

- **DEP/NX (No-eXecute)** — memory that holds data (the stack) is marked non-executable, so shellcode placed there won't run. Attackers responded with **ROP (Return-Oriented Programming)** — chaining existing executable code fragments ("gadgets") instead of injecting new code.
- **ASLR** — randomises memory addresses each run, so the attacker can't know where to jump. Defeating it requires an **information leak** (another bug that reveals an address).
- **Stack canaries** — a random value placed before the return address; if an overflow overwrites it, the program detects the corruption and aborts before returning. Defeating it requires leaking or avoiding the canary.
- **PIE, RELRO, CFI, and more** — further layers.

Because of these, reliable modern memory-corruption exploitation is **hard** — often requiring an info-leak bug plus a corruption bug, chained (a "2-bug chain"), plus ROP. This is why memory-corruption exploitation is an advanced specialism, and why most engagement footholds come from the easier routes (misconfig, known vulns with public exploits, web flaws, credentials) rather than fresh binary exploitation.

## The level of understanding you need

You don't need to write ROP chains to be a strong tester, but you *should* understand: what a buffer overflow is, how it hijacks execution, why the mitigations exist and what each stops, and therefore why a given exploit works or fails and how modern software resists this class. That conceptual grasp lets you assess memory-corruption CVEs, understand exploit write-ups, recognise the mitigations on a target, and — for those who go deeper (the pro level) — begin real exploit development. It also directly informs defence: knowing how overflows work is exactly why defenders enable DEP, ASLR, canaries and the rest.`,
      sample: {
        lang: 'text',
        caption: 'A stack buffer overflow, and the mitigations that stop it',
        code: `char buf[64];  strcpy(buf, input);   // no length check!

[ buf (64 bytes) ][ saved regs ][ RETURN ADDRESS ][ ... ]
  input longer than 64 overflows -----> overwrites the return address
  -> when the function returns, the CPU jumps where the ATTACKER chose
  -> arbitrary code execution.

MITIGATIONS (why modern exploitation is hard):
  DEP/NX        stack is non-executable -> shellcode won't run (-> use ROP)
  ASLR          addresses randomised     -> can't know where to jump (-> need a leak)
  stack canary  random value before RET  -> overflow detected, program aborts
  PIE/RELRO/CFI further layers
Result: reliable exploitation often needs a LEAK bug + a corruption bug, chained.`,
        output: `A buffer overflow overwrites the return address to hijack
execution. Understand the mechanism, and why DEP/NX, ASLR, stack
canaries and PIE make it hard (often needing an info-leak plus a
corruption bug plus ROP). You needn't write ROP chains to be a
strong tester, but understanding this explains a whole CVE class,
why exploits work or fail, and why defenders enable these very
mitigations.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Modern mitigations like DEP/NX, ASLR and stack canaries make classic buffer-overflow exploitation much harder. What does each primarily stop?',
        options: [
          'They all encrypt the program’s memory',
          'DEP/NX marks data memory (like the stack) non-executable so injected shellcode won’t run; ASLR randomises addresses so the attacker can’t know where to jump; and a stack canary is a random value before the return address whose corruption is detected before the function returns — so reliable exploitation often now needs an information leak plus a corruption bug, chained',
          'They prevent the buffer from being overflowed at all',
          'They only slow the program down without adding security',
        ],
        answer: 1,
        explain:
          'Each mitigation targets a step of the classic attack. DEP/NX makes the stack non-executable, so shellcode placed in the overflowed buffer cannot execute (prompting attackers to reuse existing code via ROP). ASLR randomises where code and data live each run, so the attacker cannot reliably choose a jump target without first leaking an address. A stack canary places a random guard value before the saved return address; an overflow that reaches the return address also corrupts the canary, which the program checks and aborts on before returning. Together they mean naive overflows fail and reliable modern exploitation typically requires chaining an information-leak bug with a memory-corruption bug plus ROP — which is exactly why these are the protections the defensive tracks recommend enabling.',
        hint: 'One stops injected code running, one hides where to jump, one detects the overwrite before the jump happens.',
      },
    },

    {
      id: 'rlin-s-04',
      title: 'Advanced escalation and chaining',
      read: `At the skilled level, privilege escalation goes beyond running LinPEAS and matching a single misconfiguration: it's about finding **obscure vectors**, **chaining** several conditions into a path, and escalating where the obvious routes are closed.

## Beyond the standard checklist

The amateur/intermediate levels covered the main categories. Advanced escalation adds depth:

- **Chained conditions** — no single misconfiguration grants root, but a combination does: a writable file that a sudo-able script reads; a capability plus a writable config; a group membership that grants access to a resource that then enables escalation. The path is built from multiple small findings, each insufficient alone.
- **Application-specific escalation** — a specific service running as root with a flaw or a plugin/extension mechanism; a database running as a privileged user with a way to execute OS commands (\`COPY ... TO PROGRAM\` in PostgreSQL, UDFs in MySQL); a backup/monitoring agent running as root with an injectable configuration.
- **Custom scripts and cron** — real systems have bespoke root-run scripts (backup, deploy, maintenance) with subtle flaws: an injectable parameter, a followed symlink, a race condition, a bare-name command (PATH hijack).
- **Environment and configuration abuse** — an interpreter honouring an attacker-controlled environment variable, a config search path including a writable directory, a plugin directory you can write to.
- **Race conditions (TOCTOU)** — a root process that checks-then-acts on a file you can swap in the window (symlink races), yielding privileged file writes.
- **Reading versus writing** — sometimes you can't get a shell but you *can* read \`/etc/shadow\` (via a capability, a group, or an arbitrary-read primitive) and crack it, or *write* one file (add a root user to \`/etc/passwd\`, drop an authorized_key for root, write a cron job). An arbitrary read or write is often as good as a shell.

## The method: think in primitives

Skilled escalation is about recognising **primitives** — the fundamental capabilities a finding grants — and combining them:

- "I can write any file as root" → write to \`/etc/passwd\`, or root's authorized_keys, or a cron job.
- "I can read any file" → read \`/etc/shadow\`, SSH keys, credentials.
- "I can run one command as root" → GTFOBins it into a shell, or use it to read/write.
- "I can influence what root runs" → cron/PATH/wildcard injection.

You look at each finding and ask "what primitive does this give me, and what can I do with that primitive?" Then chain primitives toward root. This abstraction is what lets you escalate on unusual systems where no canned technique applies — you reason from the capability, not from a checklist entry.

## When the obvious paths are closed

Well-hardened targets won't have an easy sudo/SUID win. Then you go deeper: bespoke scripts, application-level escalation, subtle chains, races, and the reading/writing primitives above. This is where understanding beats tooling — LinPEAS flags the common cases, but the chained or application-specific path requires you to reason about the system.

## The defensive mirror

Every advanced vector is a subtler defensive finding — a race condition in a backup script, a database service running as root with command execution, a writable plugin directory, a chain of individually-minor permissions. When you escalate through a chain on an authorized test, the report shows the client that defence in depth failed across several small gaps, and that fixing any one link breaks the path — the choke-point thinking from the last level, applied to a single host's escalation chain.`,
      sample: {
        lang: 'text',
        caption: 'Thinking in primitives, and chaining them to root',
        code: `Ask of each finding: "what PRIMITIVE does this give me?"

  writable /etc/cron.d + root cron    -> "influence what root runs"
  cap_dac_override on a binary        -> "read/write any file"
  postgres running as root + I have DB access -> "run OS commands as root"
  a symlink race in a root backup script -> "write a file as root"

Then combine primitives toward root:
  "read any file"  -> read /etc/shadow -> crack -> root password
  "write any file" -> add UID-0 line to /etc/passwd, OR root authorized_keys
  "run one cmd as root" -> GTFOBins -> shell
No single finding was root; the CHAIN is. Reason from capability,
not a checklist - that's how you escalate on hardened, unusual systems.`,
        output: `Advanced escalation: obscure vectors (app-specific, race
conditions, bespoke scripts), and CHAINING several small findings
none of which alone grants root. Think in PRIMITIVES - "read any
file", "write any file", "run one command", "influence what root
runs" - and combine them. This reasoning escalates where canned
techniques fail, and each chain is a defence-in-depth finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "thinking in primitives" (read-any-file, write-any-file, run-one-command, influence-what-root-runs) more powerful than matching findings against a fixed escalation checklist?',
        options: [
          'Because primitives are faster to type',
          'Because it lets you reason from the fundamental capability a finding grants and combine several capabilities into a path — so you can escalate on hardened or unusual systems where no canned checklist technique applies, and recognise that an arbitrary read or write is often as good as a shell',
          'Because checklists are always wrong',
          'Because primitives avoid the need to understand the system',
        ],
        answer: 1,
        explain:
          'A checklist matches known specific configurations, but well-hardened or unusual systems often lack any single obvious win; escalation there comes from chaining conditions that are individually insufficient. Abstracting each finding to the primitive it provides — the ability to read any file, write any file, run one command as root, or influence what root executes — lets you reason about what you can *do* rather than pattern-matching a template, and combine primitives toward root (read `/etc/shadow` and crack it; write a UID-0 line to `/etc/passwd` or a root authorized_key; turn one command into a shell via GTFOBins). This capability-based reasoning is what enables escalation where tooling and checklists fail, and it reflects that an arbitrary read or write is frequently equivalent to a shell.',
        hint: 'On a hardened box with no obvious sudo/SUID win, do you need a bigger checklist, or a way to reason from what each finding lets you do?',
      },
    },

    {
      id: 'rlin-s-05',
      title: 'Traversing complex networks',
      read: `The intermediate level introduced pivoting; skilled network traversal handles **complex, segmented, multi-layer** environments — the reality of enterprise networks — where reaching the objective requires chaining pivots through several zones and using the full range of forwarding techniques.

## The forwarding toolkit, mastered

You need fluency in the forwarding types and when each applies:

- **Local port forward** — bring a single remote service to your machine.
- **Remote port forward** — expose a service on the pivot back to you (or push a listener into a network).
- **Dynamic/SOCKS forward** — route arbitrary tools into a network (the flexible workhorse).
- **Reverse tunnels** — when the pivot can't accept inbound connections, it connects *out* to you and you tunnel back through it (essential when the compromised host is behind a firewall that blocks inbound but allows outbound — the reverse-shell asymmetry, applied to tunnels).

## Multi-hop (chained) pivoting

Real networks are layered: DMZ → app tier → database tier → management, each segmented from the last. You compromise a host in one zone, pivot through it to the next, compromise a host *there*, and pivot again — a **chain of tunnels**, each nested inside the previous. Managing this cleanly is a skill:

- Tools like **ligolo-ng** shine here — presenting each reachable network as a local interface and supporting chained agents, so multi-hop traversal is far cleaner than nested SSH/proxychains.
- **Chisel** and SSH chains work too but get fiddly at depth.
- You maintain a mental (and written) map of which tunnel reaches which network, and which host is your pivot into each zone.

## Working through the constraints

Tunnelled traffic has real limitations you plan around: proxied scans must be full-connect (no SYN scans) and are slow; some tools don't proxy cleanly; bandwidth and latency degrade with each hop; UDP is harder to tunnel than TCP. A skilled tester scans efficiently through pivots (targeted, not full-range sweeps of huge subnets), uses the right tool for the constraint, and knows when to push a static tool onto a pivot host to run locally there instead of tunnelling everything back.

## Finding the routes

Traversal depends on internal reconnaissance (the last level) done at each hop: from each compromised host, discover what *new* networks it can reach (interfaces, routes, ARP, connections) that the previous host couldn't. The path to the objective is a sequence of "this host can reach that zone" links you discover and chain. A host with a second interface into an otherwise-isolated segment is the bridge you need — finding those bridges is the traversal puzzle.

## The defensive mirror

Complex traversal is precisely what **network segmentation, micro-segmentation and zero-trust** are built to stop, and what makes them worth the effort. When you chain four pivots to reach the crown jewels, you're demonstrating that the segmentation either wasn't there or had gaps (a host bridging two zones that shouldn't be bridged, missing egress control allowing tunnels). The report's attack-path diagram shows each zone crossing and the choke points — and the fix is tighter segmentation at exactly those crossings. Conversely, a truly well-segmented, zero-trust network makes this traversal genuinely hard, which is the whole defensive point: every zone boundary the attacker must cross is a chance to stop or detect them.`,
      sample: {
        lang: 'text',
        caption: 'Chained pivots across a segmented, multi-zone network',
        code: `[attacker]
   | ext
[web01  DMZ]  ---- can also reach ----> app-tier 172.16.0.0/24
   | pivot 1 (ligolo agent / ssh -D)
[app01  app-tier]  ---- can also reach ----> db-tier 10.0.0.0/24
   | pivot 2 (chain through app01)
[db01   db-tier]  ---- can also reach ----> mgmt 10.10.0.0/24
   | pivot 3
[OBJECTIVE  mgmt zone]

Each hop: internal recon finds the NEXT reachable zone; chain a
tunnel through the new host; scan targeted (not full sweeps) via
the pivot. Reverse tunnels when a host blocks inbound.`,
        output: `Skilled traversal chains pivots through segmented zones (DMZ ->
app -> db -> mgmt), using the full forwarding toolkit (local/
remote/dynamic/reverse) and multi-hop tools like ligolo-ng, while
planning around tunnel constraints (no SYN scans, slow, targeted).
Each hop needs internal recon to find the next bridge. It's
exactly what segmentation/zero-trust defends - each crossing a
choke point to stop or detect the attacker.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Reaching a deeply internal objective often requires chaining several pivots through segmented network zones. What does needing to do so demonstrate, defensively?',
        options: [
          'That the objective is unreachable and the network is secure',
          'That segmentation either had gaps or was absent — each zone the tester crosses is a boundary that should have blocked or detected the movement, so the attack-path diagram of the crossings shows exactly where tighter segmentation, micro-segmentation or zero-trust controls would break the chain',
          'That pivoting tools are unreliable',
          'That the tester lacked authorization',
        ],
        answer: 1,
        explain:
          'Chained pivoting works only because each compromised host can reach the next zone and can open a tunnel — precisely the conditions that segmentation, micro-segmentation and egress control are designed to prevent. Every zone boundary the tester crosses is a place where a properly segmented, zero-trust network should have stopped or at least detected the movement, so the sequence of crossings in the attack-path diagram maps directly to where the defensive controls were missing or gapped (a host bridging two zones that shouldn’t be bridged, unrestricted outbound allowing tunnels). The fix is tighter controls at those crossings, and a genuinely well-segmented network makes this traversal hard — which is the defensive point of all that segmentation effort.',
        hint: 'Every zone the tester crosses is a boundary that should have stopped them. What does crossing many of them reveal about the controls there?',
      },
    },

    {
      id: 'rlin-s-06',
      title: 'Operating cleanly: red-team OPSEC',
      read: `In stealthy engagements (red team, adversary emulation), *how* you operate matters as much as *what* you achieve. **Operational security (OPSEC)** for the tester means operating in a controlled, deliberate, low-footprint way — to realistically test detection, to avoid disruption, and to stay within the rules. This is discipline for authorized testing, and understanding it also teaches defenders what careful adversaries do.

## Why OPSEC matters on an engagement

- **To test detection realistically** — a red team's job is to see whether the blue team catches a careful adversary; being needlessly loud tests nothing (the blue team catches noise, not skill).
- **To avoid disruption** — controlled operation reduces the chance of breaking a production system (a crashed service, a locked-out account).
- **To stay in scope and safe** — deliberate action prevents straying out of bounds or causing collateral damage.
- **Deconfliction** — the client can distinguish your activity from a real attack (you coordinate, log your actions with timestamps, and often use agreed indicators so the blue team can tell "is this the red team or a real intruder?").

## The elements of clean operation

- **Deliberate, minimal actions** — do what the objective needs, not everything possible. Every action has a footprint; unnecessary actions add risk and noise.
- **Prefer quiet techniques** — valid credentials over exploits, targeted enumeration over broad scans, living-off-the-land over dropping tools (the LOTL concept), common ports/protocols over unusual ones.
- **Timing** — spread activity, avoid patterns that scream automation, operate in a controlled tempo.
- **Careful tool use** — understand what each tool does on the target (files written, processes spawned, connections made) so you're not surprised by your own footprint; clean up what you introduce.
- **Meticulous logging of your own actions** — for the report, for cleanup, and for deconfliction. Ironically, the tester keeps *better* records than a real attacker, because the whole point is documentation.

## The deconfliction protocol

A professional red team agrees in advance how the client can check whether observed activity is theirs: a point of contact, a log of actions with timestamps, sometimes a canary or identifier. If the blue team detects something and isn't sure, they can ask; if a real attacker shows up during the engagement, this lets everyone tell the difference. This is a safety and professionalism mechanism, not evasion.

## The honest frame

Red-team OPSEC is about **realistic, controlled, documented** operation on an authorized engagement — testing detection and avoiding harm — not about defeating defences for malicious ends. The knowledge is genuinely dual-use (a real adversary practises OPSEC too), which is exactly why understanding it helps defenders: knowing that a careful attacker uses valid credentials, LOTL, controlled timing and quiet channels tells the blue team what subtle behaviours to hunt for, beyond the loud stuff. The purple-team output — "here's how quietly we operated, here's what you still caught and missed" — is what makes the engagement valuable. Clean operation on the red side is what tests and improves the detection on the blue side.`,
      sample: {
        lang: 'text',
        caption: 'Clean operation and deconfliction (authorized red team)',
        code: `Loud (a normal pentest)         Clean (a stealth red-team op)
-----------------------------------------------------------------
full-range nmap sweeps          targeted, minimal enumeration
throw exploits                  prefer VALID CREDENTIALS
drop tools on disk              live off the land (built-in tools)
constant activity               controlled timing, spread out
unusual ports                   blend with normal traffic

Deconfliction (professionalism + safety):
  agreed point of contact; timestamped log of YOUR actions;
  optional canary/identifier -> blue team can ask "red team or real?"
  and tell a REAL intruder apart during the engagement.`,
        output: `Red-team OPSEC = realistic, controlled, DOCUMENTED operation to
test detection and avoid harm - not evasion for its own sake.
Quiet techniques (valid creds, LOTL, controlled timing), minimal
deliberate actions, and DECONFLICTION so the client tells your
activity from a real attack. Understanding it teaches defenders
what careful adversaries do - the subtle behaviours to hunt.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In an authorized stealthy red-team engagement, why does operating with good OPSEC (minimal, quiet, deliberate actions) matter, and what is "deconfliction"?',
        options: [
          'OPSEC lets the team break the law without consequences',
          'Realistic quiet operation is what genuinely tests whether the blue team can detect a careful adversary (being needlessly loud tests nothing) and reduces disruption; deconfliction is the agreed protocol — a contact, a timestamped log of the team’s actions, sometimes an identifier — that lets the client distinguish the red team’s activity from a real attacker',
          'OPSEC means destroying all logs to avoid detection',
          'Deconfliction means attacking multiple targets at once',
        ],
        answer: 1,
        explain:
          'A red team’s purpose is to measure detection and response against a realistic adversary, so operating quietly and deliberately is what actually exercises the blue team — flooding the network with noise only tests whether they can catch noise, and needlessly aggressive actions risk breaking production. Deconfliction is the professional safety mechanism that keeps this controlled: an agreed point of contact and a timestamped record of the team’s own actions (and often a canary or identifier) so the client can confirm whether observed activity is the red team and, crucially, can tell a genuine intruder apart if one appears during the engagement. None of this involves law-breaking or destroying the client’s logs; the tester in fact documents more than a real attacker would.',
        hint: 'What does being loud actually test, and how does the client tell your activity from a real attacker mid-engagement?',
      },
    },

    {
      id: 'rlin-s-07',
      title: 'Cloud penetration testing',
      read: `Modern targets are largely **cloud** (AWS, Azure, GCP), where the attack surface shifts from hosts and networks to **identity, permissions and services**. Cloud pentesting is a distinct skilled specialism, and it mirrors the cloud-hardening from the defensive tracks.

## What changes in the cloud

- **Identity is the perimeter** — cloud access is governed by IAM (roles, policies, keys), so the primary attack surface is **credentials and permissions**, not open ports. Compromising a credential or exploiting an over-permissioned role is often the whole game.
- **The management plane** — the cloud API/console is a network-independent control plane. Compromised cloud credentials can reconfigure everything, create resources, read data stores, and escalate — without touching a single host.
- **Shared responsibility** — you test the *customer's* configuration and code, not the provider's infrastructure (and provider rules govern what testing is permitted — authorization includes the cloud provider's policies).

## The cloud attack surface

- **Credential exposure** — cloud keys in code, configs, repositories, CI logs, instance metadata (the IMDS lesson), or on compromised hosts. Finding a cloud key often beats any host exploit.
- **IAM misconfiguration and privilege escalation** — over-broad policies, wildcard permissions, roles that can assume other roles, or permissions that allow self-escalation (e.g. a policy letting a user attach a more powerful policy to themselves, or pass a privileged role to a new resource). Cloud IAM privesc is a rich, well-catalogued area (tools like **Pacu** for AWS enumerate and exploit these).
- **Exposed storage** — public S3/blob buckets (a perennial breach source), misconfigured databases, exposed snapshots.
- **Serverless and container services** — functions with over-broad roles, container escapes to the node, over-privileged Kubernetes service accounts (the intermediate lesson).
- **Network misconfiguration** — over-permissive security groups (RDP/SSH/databases open to the internet), the cloud analogue of firewall gaps.

## The methodology, cloud-flavoured

1. **Obtain credentials** — via host compromise (IMDS, credential files), exposed keys (recon, repos), or a phishing/initial-access route on an authorized engagement.
2. **Enumerate permissions** — what can these credentials do? Tools enumerate the identity's permissions, accessible resources, and the IAM structure. This is the cloud enumeration phase — as decisive here as service enumeration is on hosts.
3. **Escalate within IAM** — find a permission path from the current identity to a more privileged one (assume a role, attach a policy, exploit a misconfigured trust relationship).
4. **Access resources and data** — reach data stores, other resources, and demonstrate impact within scope.
5. **Move across the environment** — from one account/resource to others via trust relationships, cross-account roles, and shared infrastructure.

## The defensive mirror

Everything maps to cloud hardening: least-privilege IAM (no wildcards, no self-escalation paths), no credentials in code (secrets managers, short-lived credentials), IMDSv2, private storage with no public buckets, tight security groups, and monitoring the management plane (the ITDR/cloud lessons). When you escalate through an over-permissioned IAM role or pull data from a public bucket on an authorized test, you're demonstrating exactly those failures — and the report's fixes are the defensive cloud controls. Cloud pentesting is increasingly where engagements live, and identity — not the host — is the battleground.`,
      sample: {
        lang: 'bash',
        caption: 'Cloud testing: enumerate the identity’s permissions, then escalate',
        code: `# who am I, and what can these credentials do? (AWS example, authorized)
aws sts get-caller-identity
aws iam list-attached-user-policies --user-name appuser
# enumerate permissions / escalation paths (e.g. with Pacu)
#   -> can I attach policies to myself? assume a privileged role? pass a role?`,
        output: `Account: 1234... user/appuser
Attached: PowerUserAccess + iam:AttachUserPolicy   <- self-escalation!
  -> attach AdministratorAccess to myself -> full admin
# Cloud attack surface is IDENTITY, not ports: over-broad IAM (self-
# escalation, role assumption, passrole), exposed keys, public buckets,
# open security groups. Defences: least-privilege IAM, no creds in code,
# IMDSv2, private storage, tight SGs - the exact mirror.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "identity" often described as the primary attack surface in cloud penetration testing, unlike traditional host-and-network testing?',
        options: [
          'Because cloud hosts have no vulnerabilities',
          'Because cloud access is governed by IAM (credentials, roles, policies), so the decisive attack surface is credentials and permissions — an exposed key or an over-permissioned role can read data and reconfigure everything via the management plane without ever touching a host — making credential exposure and IAM privilege escalation central',
          'Because cloud networks cannot be scanned',
          'Because identity only matters in on-premises environments',
        ],
        answer: 1,
        explain:
          'In the cloud, what you can do is determined by IAM rather than by open ports: the management plane lets any sufficiently-privileged credential create resources, read data stores, and reconfigure the environment over the API, independent of the network. So the highest-value targets are credentials (exposed in code, configs, repos, CI logs, or instance metadata) and permission misconfigurations (wildcard policies, self-escalation paths, role assumption, passrole abuse) that let one identity become a more privileged one. Enumerating an identity’s permissions is as decisive as service enumeration is on a host, and the defences are precisely least-privilege IAM, no credentials in code, IMDSv2, private storage and tight security groups — the cloud-hardening mirror.',
        hint: 'In the cloud, what determines what you can do — open ports, or the permissions attached to your credentials?',
      },
    },

    {
      id: 'rlin-s-08',
      title: 'CI/CD and supply-chain attack surface',
      read: `Development and deployment pipelines are high-value targets: they hold credentials, build and ship code to production, and are often less hardened than production itself. Testing this surface (on authorized engagements) is an important skilled specialism — and mirrors the supply-chain defence from the defensive tracks.

## Why the pipeline is a prize

- **It has credentials to everything** — deploy keys, cloud credentials, registry tokens, signing keys — so compromising the pipeline can grant access to production, cloud, and artefact distribution.
- **It ships code to production** — an attacker who can alter the build injects code into what gets deployed, reaching production (and, for software vendors, customers) with trusted, signed artefacts.
- **It's often softer than production** — CI runners, source repos, and build systems frequently have weaker controls than the production they feed.

## The attack surface

- **Source repositories** — access to source (via a leaked token, an over-permissioned account, or a public repo) reveals code, secrets committed to history (the recurring secrets-in-git finding), and the pipeline configuration itself.
- **CI/CD configuration** — pipeline definitions (\`.gitlab-ci.yml\`, GitHub Actions workflows, Jenkinsfiles) that, if writable (e.g. via a pull request from a fork, or a compromised account), let an attacker run arbitrary code *in the pipeline* — with the pipeline's credentials and access. "Poisoned pipeline execution" is a known class.
- **Build dependencies** — the software supply chain: a malicious or compromised dependency (typosquat, hijacked package, dependency confusion) executes in the build and in production (the defensive supply-chain lesson, from the attacker's side).
- **CI runners** — the machines that execute builds; compromising one (or escaping its container) yields the credentials and network access of the build environment, often reaching internal networks.
- **Artefact registries and signing** — access to push malicious artefacts or, worst, to signing keys that make malicious artefacts trusted.
- **Secrets in the pipeline** — build logs and environment variables leaking credentials.

## The methodology

1. **Find access** — a leaked CI/repo token, an over-permissioned account, a writable pipeline config, a public repo revealing structure and secrets.
2. **Execute in the pipeline** — get code to run in the CI context (a poisoned config, a malicious dependency, a malicious PR), inheriting its credentials.
3. **Harvest and pivot** — extract the pipeline's credentials (cloud, deploy, registry) and use them to reach production, cloud, or the artefact stream.
4. **Demonstrate supply-chain impact** — show (within scope) that code could be injected into production or artefacts — a severe finding.

## The defensive mirror

This maps directly to secure-SDLC and supply-chain hardening: least-privilege, short-lived pipeline credentials; protected branches and required review so config changes are gated; pinned and verified dependencies and actions; isolated, ephemeral runners; artefact signing with protected keys; and secret scanning. When you achieve pipeline execution and harvest credentials on an authorized test, you're demonstrating exactly the failures the defensive pipeline-hardening addresses — and because a pipeline compromise can reach production and customers, it's often among the most severe findings in a report. The pipeline is part of the attack surface, and securing it is as important as securing production.`,
      sample: {
        lang: 'text',
        caption: 'Poisoned pipeline execution reaching production credentials',
        code: `1. access: a repo where PRs trigger CI, or a leaked CI token, or a
   writable workflow file (over-permissioned account / fork PR)
2. execute in CI: add a step / malicious dependency that runs in the
   pipeline context - inheriting ITS credentials:
     - run: echo "$AWS_SECRET_ACCESS_KEY $DEPLOY_KEY $REGISTRY_TOKEN"
3. harvest: the pipeline's cloud/deploy/registry credentials
4. pivot: use them to reach PRODUCTION, cloud, or push a malicious
   (signed!) artefact -> supply-chain impact reaching customers`,
        output: `The pipeline holds credentials to everything and ships code to
production, yet is often softer than production. Attack surface:
repos + secrets in history, WRITABLE CI configs (poisoned pipeline
execution), malicious dependencies, CI runners, and signing keys.
Defences: least-priv short-lived pipeline creds, protected
branches/review, pinned+verified deps, ephemeral runners, protected
signing keys, secret scanning - the secure-SDLC mirror. Often the
most severe finding, as it reaches production and customers.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is compromising a CI/CD pipeline often one of the most severe findings in an engagement?',
        options: [
          'Because pipelines are slow and inconvenient',
          'Because the pipeline holds credentials to production, cloud and artefact registries and ships code to production, so code execution in the pipeline (via a writable config, a malicious dependency, or a leaked token) can harvest those credentials and inject trusted, signed code into production and even into customers — a supply-chain impact — and pipelines are frequently less hardened than production',
          'Because pipelines cannot be tested legally',
          'Because CI runners are always air-gapped',
        ],
        answer: 1,
        explain:
          'A build pipeline sits at a uniquely powerful and often under-protected point: it stores the credentials needed to deploy (cloud, deploy keys, registry and signing tokens) and it produces the code that runs in production. Achieving execution in the pipeline context — through a writable workflow, a poisoned dependency, a malicious pull request, or a leaked CI token — lets an attacker inherit those credentials and reach production, cloud, and the artefact stream, potentially shipping trusted, signed malicious code to customers (a supply-chain compromise). Combined with the fact that CI systems are frequently softer than the production they feed, this makes pipeline compromise a top-severity finding, and its defences are exactly the secure-SDLC controls: least-privilege short-lived credentials, protected branches and review, pinned/verified dependencies, ephemeral runners, and protected signing keys.',
        hint: 'What does the pipeline hold, and what does it ship — and to whom does its output ultimately go?',
      },
    },

    {
      id: 'rlin-s-09',
      title: 'Credential attacks at scale',
      read: `As engagements grow, credential attacks scale up: cracking large hash sets efficiently, exploiting credential material across many systems, and using credentials as the primary movement mechanism. Doing this effectively — and efficiently — is a skilled capability.

## Efficient hash cracking

You'll capture many hashes (from databases, \`/etc/shadow\`, key files). Cracking them well means:

- **Identify the algorithm correctly** — the mode determines everything (fast MD5/NTLM vs slow bcrypt/Argon2), and using the wrong mode wastes time.
- **Use GPU acceleration** — **Hashcat** on GPUs cracks fast hashes at enormous rates; a rig or cloud GPUs crack at scale.
- **Strategy over brute force** — start with wordlists (rockyou and larger), then **rules** (transformations matching how people build passwords), then targeted masks (known patterns), and combinator/hybrid attacks. Rule-based cracking of a good wordlist is dramatically more effective than raw brute force.
- **Custom wordlists** — build them from the target: company name, products, local terms, and words scraped from the target's website (\`cewl\`), plus known password patterns. Targeted wordlists crack far more than generic ones.
- **Know when to stop** — slow hashes (bcrypt/Argon2) with strong passwords may be uncrackable in the engagement window; recognise this and note it (the hash strength is itself a finding).

## Credential material beyond passwords

- **SSH keys** — cracked passphrases (weak ones fall), and keys reused across the estate.
- **Kerberos** (on domain-joined Linux and in mixed environments) — tickets and keytabs; the Kerberos attacks from the defensive Windows track (Kerberoasting, AS-REP roasting) apply where Linux integrates with AD.
- **Hashes for reuse** — where a hash can be used directly (pass-the-hash on Windows targets reached from Linux), you may not need to crack it at all.

## Password spraying and reuse at scale

- **Spraying** — trying one common password across many accounts avoids per-account lockout (the technique defenders detect); across a large estate it frequently finds several weak accounts.
- **Reuse mapping** — once you crack or find credentials, systematically try them across every host, service and account in scope. A single credential often works in many places; mapping where each credential is valid is high-yield and directly demonstrates the reuse problem.
- **Credential-to-access graph** — at scale, track which credentials open which systems (like the BloodHound thinking): the graph of credentials and access reveals paths to objectives.

## The defensive mirror, amplified

At scale, credential attacks demonstrate the aggregate risk of weak and reused credentials across an organisation: "we cracked 40% of the password hashes in under an hour", "this one password works on 30 hosts", "these service accounts have weak, reused passwords". These findings drive the defensive controls — strong slow hashing, no reuse, MFA, unique per-host credentials (LAPS on Windows), and credential monitoring — at an organisational level. The scale is the point: individually a weak password is a minor finding; across an estate, weak and reused credentials are frequently the single biggest systemic risk, and demonstrating it at scale is what motivates the fix.`,
      sample: {
        lang: 'bash',
        caption: 'Efficient cracking strategy and reuse mapping',
        code: `# identify, then crack with strategy (wordlist -> rules -> mask), GPU
hashcat -m 1800 shadow.hashes rockyou.txt -r rules/best64.rule   # $6$ + rules
# targeted wordlist built from the target's own site
cewl https://acme.example -w acme-words.txt
# then MAP reuse: try each cracked credential across the estate
#   for host in $hosts; do try cred against ssh/services; done`,
        output: `Recovered 40% of hashes in < 1h (weak + reused passwords).
'Spr1ng2024!' -> valid on 30 hosts (reuse mapping)               <- systemic!
strong bcrypt accounts: uncracked (the defensive goal)
# At scale, weak+reused credentials are often the BIGGEST systemic
# risk. Findings: "40% cracked", "1 password opens 30 hosts" drive
# strong slow hashing, no reuse, MFA, unique per-host creds.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When cracking a large set of password hashes, why is a strategy of wordlists plus rules (and targeted, target-derived wordlists) far more effective than raw brute force?',
        options: [
          'Because brute force is illegal',
          'Because people choose predictable passwords and modify them in predictable ways, so wordlists (especially ones built from the target) combined with transformation rules match real human passwords efficiently — whereas raw brute force is infeasible for anything but very short passwords',
          'Because rules make the GPU run faster',
          'Because brute force cannot crack any hash',
        ],
        answer: 1,
        explain:
          'Password cracking succeeds because humans pick memorable, predictable passwords and alter them in predictable ways (capitalise, append a year, substitute a symbol). Wordlists capture the common choices, rules apply exactly those human transformations to multiply coverage cheaply, and wordlists built from the target itself (company name, products, terms scraped from its site) capture organisation-specific choices — together cracking far more, far faster, than trying every combination. Raw brute force is only feasible for very short or simple passwords because the keyspace explodes exponentially with length. Choosing the correct hash mode and GPU acceleration then determine throughput, and slow strong hashes with good passwords may remain uncrackable — itself a finding.',
        hint: 'Do people choose random passwords, or predictable ones they modify predictably — and which approach exploits that?',
      },
    },

    {
      id: 'rlin-s-10',
      title: 'Automating your workflow',
      read: `As engagements grow in scale and repetition, a skilled tester **automates** the repetitive parts — enumeration, data collection, and routine checks — to work faster and more thoroughly, while reserving judgement for what only a human can do. This is a force multiplier, done carefully.

## What to automate

The repetitive, well-defined tasks:

- **Enumeration pipelines** — chaining recon and scanning: discover hosts, scan them, run service-specific enumeration, and collect the output into an organised form. Frameworks like **AutoRecon** orchestrate this — kick off comprehensive enumeration of a target and get structured results, so you don't manually run the same twenty commands each time.
- **Data collection and parsing** — scripting the gathering and normalising of output (parsing Nmap XML, extracting findings, building host inventories) so you can query and correlate rather than scroll through raw logs.
- **Repetitive checks** — trying a credential across many hosts, checking many targets for a specific condition, sweeping for a known issue.
- **Reporting support** — scripts that collate evidence, screenshots, and findings into report-ready form.

## Scripting skill

Automation rests on scripting — **Bash** for gluing tools and quick loops, **Python** for anything structured (parsing, APIs, custom tooling). A skilled tester writes small tools constantly: a script to try credentials across a host list, to parse and diff scan results, to check an internal subnet through a pivot, to extract and organise loot. This scripting ability is what lets you scale and adapt beyond what off-the-shelf tools do.

## The judgement boundary

The crucial discipline: **automate collection and routine checks, not judgement.** Automation is excellent at gathering data comprehensively and fast; it is poor at deciding what matters, chaining findings, understanding context, or exploiting a subtle logic flaw. So:

- **Automate to enumerate broadly and consistently** — so nothing is missed and you're not doing tedious work by hand.
- **Then apply human analysis** — interpret the results, spot the meaningful finding, chain discoveries, and decide the path. The tester's value is the thinking, which automation feeds with data.

Over-automating — trusting a script to *decide* — reproduces the "run the tool blindly" failure at a larger scale, chasing false positives and missing context-specific paths. The right model is automation as a data-gathering accelerator under human judgement.

## Efficiency and consistency

Automation also brings **consistency** — the same thorough enumeration on every target, so quality doesn't depend on remembering every command under time pressure — and lets you cover **larger scopes** (many hosts, many services) that would be impractical by hand. On a large engagement, automated broad enumeration plus focused human analysis of the results is far more effective than manual work alone.

## The professional frame

Build a personal toolkit of scripts and use orchestration frameworks, but understand every tool in it (the recurring lesson) and keep the human in the loop for judgement. And on authorized engagements, ensure your automation respects scope and rules of engagement — an over-eager script that scans out of bounds or hammers a fragile service is a scope/safety violation. Automation, wielded with judgement and care, is what turns a skilled individual into one who can thoroughly test at scale.`,
      sample: {
        lang: 'bash',
        caption: 'Automate collection and routine checks; keep judgement human',
        code: `# a small tool: try a found credential across a host list (routine check)
for h in $(cat hosts.txt); do
  sshpass -p "$PASS" ssh -o BatchMode=no -o ConnectTimeout=3 "$USER@$h" id \\
    2>/dev/null && echo "[+] $USER works on $h"
done

# orchestrate thorough enumeration (so nothing is missed, consistently)
#   autorecon 10.10.10.0/24   -> structured per-host results to analyse
# THEN: human reads results, spots what matters, chains findings, decides path.`,
        output: `[+] admin works on 10.0.0.5
[+] admin works on 10.0.0.12    <- reuse mapped by a routine script
# Automate COLLECTION and routine checks (enumeration, cred sweeps,
# parsing) for speed, thoroughness and consistency at scale. Keep
# JUDGEMENT human - interpreting results, chaining findings, choosing
# the path. Automating judgement reproduces "run the tool blindly"
# at scale. And automation must respect scope/RoE.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the right dividing line when automating a penetration-testing workflow?',
        options: [
          'Automate everything, including which findings to pursue',
          'Automate data collection and routine checks — enumeration, parsing, credential sweeps — for speed, thoroughness and consistency, but keep human judgement for interpreting results, chaining findings, understanding context and choosing the path, because automation gathers data well but decides poorly',
          'Never automate anything; do all work manually',
          'Automate only the final report',
        ],
        answer: 1,
        explain:
          'Automation excels at the repetitive, well-defined work — running comprehensive enumeration the same way every time, parsing and normalising output, sweeping a credential across many hosts — which brings speed, coverage and consistency that manual work under time pressure cannot match. But it is poor at judgement: deciding which finding matters, connecting discoveries into a chain, understanding context, and exploiting subtle logic flaws all require a human. Automating judgement reproduces the "run the tool blindly" failure at larger scale, chasing false positives and missing context-specific paths. The effective model is automation as a data-gathering accelerator feeding focused human analysis — and, on authorized work, automation that respects scope and rules of engagement.',
        hint: 'Which is automation good at — gathering data comprehensively, or deciding what the data means and what to do next?',
      },
    },

    {
      id: 'rlin-s-11',
      title: 'Reporting that drives remediation',
      read: `The report is the product (the beginner lesson); at the skilled level, reporting becomes a craft of **communication** — turning technical findings into action across different audiences, and following through so the fixes actually happen. A brilliant compromise poorly reported delivers little value; a clearly reported one drives real security improvement.

## Writing for multiple audiences

A good report serves distinct readers with different needs:

- **The executive summary** — for leadership: the overall risk picture, business impact, and priorities, in plain language without jargon. This is what decision-makers read and fund remediation from. "A single external vulnerability allowed full compromise of the internal network and access to customer data" lands; a CVE number does not.
- **The technical findings** — for engineers who fix them: each finding with a clear description, severity, evidence, reproduction steps, and — most importantly — **specific, actionable remediation**. Enough detail to verify and fix, not so much it's unreadable.
- **The attack narrative / path** — the story of the compromise (the intermediate-level path documentation), which conveys real impact and context better than isolated findings.

## Severity and prioritisation

Rate findings by real **risk** (impact × likelihood/exploitability), not just technical severity, and account for context — a "medium" flaw that's the linchpin of a critical attack chain is effectively critical. Prioritise so the client fixes the most important things first, and highlight **choke points** where one fix breaks multiple attack paths. Actionable prioritisation is more valuable than an undifferentiated list of dozens of findings.

## Remediation that's actually usable

The most valuable part of each finding is the fix, and good remediation is:

- **Specific** — "parameterize this query" / "remove the NOPASSWD sudo entry for find" / "restrict this IAM policy to these actions", not "improve input validation" / "follow best practices".
- **Root-cause-focused** — fix the underlying issue, and where a class of issue recurs, recommend the systemic fix (a secure default, a paved road).
- **Realistic** — aware of the client's constraints, with interim mitigations where a full fix takes time.

## Communication beyond the document

- **Debriefs and readouts** — presenting findings to technical and executive audiences, answering questions, and ensuring the risk is understood. Often more impactful than the written report.
- **Retesting** — after the client remediates, verifying the fixes actually work (re-running the attacks that succeeded — the prove-it discipline). Retest closes the loop and is a distinct, valuable deliverable.
- **Working with the blue team** (purple teaming) — sharing not just findings but *how* you operated, so the defenders can build detection for the techniques used.

## The professional frame

Skilled testers understand that their job isn't to *find* vulnerabilities but to *drive their remediation* — the finding only matters if it gets fixed. That reframes reporting from a formality into the core skill: communicate the risk so clearly and actionably that the organisation actually improves. The best testers are valued as much for their reports and communication as for their technical ability, because that is what converts a compromise into a more secure organisation — which is the entire point of authorized offensive security.`,
      sample: {
        lang: 'text',
        caption: 'One finding, written for both audiences, with usable remediation',
        code: `EXECUTIVE (for leadership, plain language):
  A weakness in the customer portal let us take full control of the
  internal network and reach the customer database. Highest priority.

TECHNICAL (for engineers, actionable):
  Finding: SQL injection in /login (username field) -> auth bypass + DB read
  Severity: Critical (Impact: High x Exploitability: High)
  Reproduce: username = ' OR '1'='1' --   -> logged in as admin
  Remediation: use a parameterized query (example provided); this is
    the linchpin of the attack chain - fixing it AND the reused DB
    password (Finding 3) breaks the path to the internal network.
  Then: RETEST to confirm the fix; brief the team; help build detection.`,
        output: `Reporting is communication: an executive summary (risk, impact,
priorities, plain language), technical findings (evidence,
reproduction, SPECIFIC remediation), and the attack narrative.
Prioritise by real risk and choke points. Then debrief, RETEST to
verify fixes, and share technique with the blue team. The job is
to DRIVE remediation - a finding only matters if it gets fixed.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do skilled testers regard reporting and communication as core skills equal to technical ability, rather than a formality after the "real" work?',
        options: [
          'Because reports are legally required to be long',
          'Because the purpose of authorized testing is to improve the organisation’s security, which only happens when findings are actually remediated — so clearly communicating risk to each audience (executive and technical), prioritising by real risk and choke points, giving specific remediation, and retesting to verify fixes is what converts a compromise into an improvement; a finding that isn’t understood or fixed delivers no value',
          'Because clients never read the technical findings',
          'Because reporting replaces the need to find vulnerabilities',
        ],
        answer: 1,
        explain:
          'The entire point of authorized offensive security is defensive improvement, and improvement requires the findings to be understood, prioritised and fixed. That depends on communication: an executive summary that conveys business risk in plain language so leadership funds the work, technical findings with evidence, reproduction and specific root-cause remediation so engineers can fix them, prioritisation by real risk (with choke points that break multiple attack paths), and retesting to confirm the fixes actually hold. A technically brilliant compromise that is reported unclearly changes nothing, which is why the best testers are valued for their reports and readouts as much as their exploitation — the report is where the work becomes a more secure organisation.',
        hint: 'What is the actual goal of the engagement, and what has to happen to the findings for that goal to be met?',
      },
    },

    {
      id: 'rlin-s-12',
      title: 'Project: a scoped end-to-end engagement',
      read: `Bring the level together by running a complete engagement **the professional way**: defined scope, disciplined execution, and a proper report — simulating a real authorized penetration test against your lab or an authorized platform environment.

## The exercise

Treat a multi-host lab environment (or a platform pro-lab / an authorized target) as a client engagement:

1. **Scope and plan** — write yourself a scope and rules of engagement: which systems are in bounds, what techniques are permitted, the goal (e.g. reach a specific "crown jewel" and demonstrate impact). Choose an engagement type (black/grey/white box) and operate accordingly. Treat the scope as inviolable.
2. **Execute the methodology** — recon, enumerate thoroughly, gain a foothold (adapting exploits as needed), escalate (thinking in primitives, chaining where necessary), post-exploit, pivot through the network, move laterally, and reach the objective — looping the methodology at each host. If it's cloud/CI-inclusive, test those surfaces too.
3. **Operate professionally** — take meticulous notes throughout, understand every step, stay strictly in scope, handle any data correctly (prove access, don't exfiltrate), and clean up anything you introduce.
4. **Analyse and prioritise** — from your notes, identify the findings, rate them by real risk, map the attack path and its choke points.
5. **Report** — write a proper report: executive summary, attack narrative with a path diagram, technical findings each with evidence, reproduction and specific remediation, prioritised, with choke points highlighted.
6. **(Ideally) retest** — after "fixing" a finding in the lab, re-run the attack to verify the fix.

## The measure of success

You can run a complete, scoped, professional engagement — from planning through disciplined execution to a report that would drive real remediation — demonstrating not just the technical capability to compromise the environment but the professionalism to do it within bounds and communicate it effectively.

> The level distilled: skilled offensive work is **professional operation** — the right engagement type scoped correctly, the ability to **adapt** technique (troubleshoot exploits, understand memory corruption, chain advanced escalation, traverse complex networks), disciplined **OPSEC** and data handling, coverage of modern surfaces (**cloud, CI/CD**), **credential attacks at scale**, **automation under judgement**, and **reporting that drives remediation** — all within authorization. The technical skill is necessary but not sufficient; what makes a professional is doing it within bounds, understanding every step, and turning the compromise into a report that makes the organisation more secure. The pro level goes to the frontier — exploit development depth, full red-team operations, adversary emulation, and vulnerability research — but this scoped, disciplined, well-reported engagement is the skilled offensive core, and it is the shape of the real job.`,
      sample: {
        lang: 'text',
        caption: 'A scoped engagement, run and reported the professional way',
        code: `SCOPE: 10.10.10.0/24 + the cloud account acme-dev; goal: reach the
  customer DB and demonstrate access. NO exfiltration. Window: this week.
  Out of scope: production cloud, anything outside 10.10.10.0/24.

EXECUTE (in scope, noted throughout):
  enum -> web foothold -> escalate (chain) -> pivot -> lateral ->
  cloud creds via IMDS -> IAM enum -> reach DB. Objective met.

DELIVER:
  exec summary (risk + priorities, plain language)
  attack-path diagram + choke points
  findings: each with evidence, reproduction, SPECIFIC remediation, risk-rated
  retest plan. Cleaned up everything introduced.`,
        output: `A complete engagement done professionally: scoped and bounded,
executed with discipline and notes, data handled correctly,
cleaned up, and reported to DRIVE remediation (exec + technical +
path + prioritised fixes + retest). Technical compromise plus the
professionalism to stay in bounds and communicate - the shape of
the real job, and the skilled offensive core.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What most distinguishes a skilled professional engagement from simply being technically able to compromise the environment?',
        options: [
          'Using more advanced exploits',
          'Operating professionally within a defined scope and rules of engagement — disciplined execution, correct data handling, cleanup, meticulous notes, and above all a clear, prioritised report that drives remediation — so the technical compromise is converted into an actual improvement in the organisation’s security, within authorization',
          'Compromising the environment faster than anyone else',
          'Avoiding any documentation to save time',
        ],
        answer: 1,
        explain:
          'Technical capability to compromise a network is necessary but not sufficient; the profession is defined by doing it correctly. That means scoping the engagement and staying strictly within bounds, executing with discipline (understanding every step, keeping meticulous notes, handling data properly, cleaning up), and — decisively — producing a report that communicates the risk clearly to each audience, prioritises by real risk and choke points, and gives specific remediation, followed by retesting. This is what converts a compromise into a more secure organisation, which is the entire purpose of authorized offensive security. A brilliant but out-of-scope, undocumented, or poorly-reported compromise delivers little value and may be a liability.',
        hint: 'The compromise is the means. What turns it into the actual goal — a more secure organisation — while staying within authorization?',
      },
    },
  ],
}

export default level
