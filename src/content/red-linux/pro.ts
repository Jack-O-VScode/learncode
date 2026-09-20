import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'The deep end: red-team operations and research',
  summary:
    'The frontier of offensive Linux: full red-team operations and adversary emulation, exploit development at depth, evasion and detection understood for improving defence, threat-informed emulation and purple teaming, vulnerability research and responsible disclosure, and the ethics, career and leadership that make it a profession. Always authorized.',
  outcomes: [
    'Plan and lead a full red-team operation',
    'Understand exploit development, evasion and detection at depth',
    'Run threat-informed adversary emulation and purple teaming',
    'Conduct vulnerability research and responsible disclosure',
    'Lead engagements and communicate at a program level',
    'Ground it all in ethics, law and professional development',
  ],
  steps: [
    {
      id: 'rlin-p-01',
      title: 'Red-team operations end to end',
      read: `A full **red-team operation** is the most complete form of offensive engagement: a goal-oriented, adversary-emulating campaign that tests an organisation's entire security posture — people, process and technology — the way a real threat actor would. Leading one is the culmination of offensive skill.

## What makes it different

Unlike a penetration test (find and demonstrate vulnerabilities across a scope), a red-team operation:

- **Is objective-based** — a concrete goal ("obtain the CEO's email", "reach the payment system", "prove domain compromise"), pursued by whatever authorized means, not a comprehensive vulnerability sweep.
- **Emulates a real adversary** — using realistic tradecraft (initial access via phishing, C2, stealthy movement) rather than loud scanning, so the exercise reflects a genuine attack.
- **Tests detection and response** — the primary measure is often not "could we get in?" (usually yes, given time) but "did the blue team detect and respond, and how fast?" — the assume-breach reality.
- **Spans the full kill chain** — reconnaissance, initial access, execution, persistence, privilege escalation, credential access, lateral movement, collection, and actions on objectives.
- **May include multiple vectors** — network, but also social engineering and sometimes physical, within scope.

## The phases of an operation

1. **Planning and scoping** — objectives, rules of engagement, the threat to emulate, timelines, deconfliction, and legal authorization. Red-team ops need especially careful RoE because of their breadth and stealth.
2. **Reconnaissance** — extensive OSINT on the organisation, people, and technology (passive recon at depth).
3. **Initial access** — gaining the first foothold, realistically (often phishing on authorized engagements, or an external vulnerability).
4. **Establishing C2 and persistence** — a resilient foothold (the C2 concepts), maintained carefully within RoE.
5. **Post-exploitation campaign** — escalate, harvest credentials, move laterally toward the objective, operating with OPSEC.
6. **Actions on objectives** — achieve and demonstrate the goal (within scope, without harm).
7. **Reporting and debrief** — the findings, the attack narrative, and critically the **detection-and-response assessment**: what the blue team saw, missed, and how to improve.

## The team and the coordination

Real red-team ops are team efforts with roles (operators, an engagement lead, infrastructure), careful **infrastructure** (C2 servers, redirectors — set up to be realistic and deconflictable), and constant coordination with the client's trusted agents (a small group who know the op is happening, for safety and deconfliction) even while the broader blue team does not.

## The value and the frame

A red-team operation answers the question a vulnerability list can't: **"if a real, capable adversary targeted us, would we detect and stop them?"** Its output — the full attack narrative plus the honest detection-and-response assessment — drives improvement across the whole security program, feeding directly into purple teaming. It is authorized, carefully bounded, meticulously documented emulation of a real threat, whose entire purpose is to make the organisation more resilient by testing it against a realistic adversary. Leading one requires all the technical skill of the earlier levels *plus* the planning, OPSEC, coordination, and communication to run a realistic campaign safely and turn it into organisational improvement.`,
      sample: {
        lang: 'text',
        caption: 'A red-team operation across the kill chain (authorized)',
        code: `Objective: reach the payment system + test detection/response.
Emulating: a financially-motivated intrusion set (threat-informed).

  recon (OSINT) -> initial access (authorized phishing) -> C2 established
    -> escalate -> credential access -> lateral movement (stealthy, OPSEC)
    -> reach payment system -> demonstrate (no harm) -> report

Measured: NOT just "did we get in?" but -
  Did the blue team DETECT each stage? How fast? Did they RESPOND?
  -> detection-and-response assessment (the real deliverable)

Bounded by: RoE, deconfliction with trusted agents, legal authorization.`,
        output: `A red-team operation is objective-based adversary EMULATION across
the full kill chain (recon -> access -> C2 -> escalate -> move ->
objective), testing the whole program - especially DETECTION and
RESPONSE - not just vulnerabilities. Careful planning, OPSEC,
infrastructure, and deconfliction. Its output answers "would we
detect and stop a real adversary?" - driving program improvement.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the primary question a red-team operation answers that a vulnerability-focused penetration test does not?',
        options: [
          'How many vulnerabilities exist in the scope',
          'Whether the organisation would detect and respond to a realistic, capable adversary pursuing an objective across the full kill chain — testing people, process and technology (especially detection and response) rather than just enumerating and demonstrating vulnerabilities',
          'Which software versions are out of date',
          'Whether the network is fast enough',
        ],
        answer: 1,
        explain:
          'A penetration test measures the presence and exploitability of vulnerabilities across a defined scope. A red-team operation is objective-based adversary emulation: it pursues a concrete goal the way a real threat actor would, across the entire kill chain and often multiple vectors, and its central measure is usually not "could we get in?" (given time and assume-breach, often yes) but "did the blue team detect the intrusion, and respond effectively, and how quickly?" It therefore tests the whole security program — people, process and technology, especially detection and response — and its key deliverable is the detection-and-response assessment that drives program-wide improvement, all under careful scoping, OPSEC and deconfliction.',
        hint: 'Is the red team counting bugs, or testing whether a real attacker would be noticed and stopped?',
      },
    },

    {
      id: 'rlin-p-02',
      title: 'Exploit development at depth',
      read: `The skilled level introduced memory corruption conceptually; the pro specialism is **exploit development** — building working exploits for memory-corruption vulnerabilities, defeating modern mitigations. This is a deep, distinct discipline (the "pwn" of CTFs, the substance of advanced courses like OSED); understanding its depth completes your picture of how the hardest exploits are built and why software resists them.

## The development process

Building an exploit for a memory-corruption bug typically involves:

1. **Finding/understanding the bug** — a crash on certain input, analysed to determine the flaw (buffer overflow, use-after-free, etc.) and whether it's exploitable.
2. **Controlling execution** — determining how to influence what the corruption overwrites (the return address, a function pointer, a heap structure) to redirect execution — the crux of turning a crash into control.
3. **Finding the offset** — precisely where in your input the critical value (e.g. the return address) sits, using pattern generation and debugging.
4. **Placing/reaching your code** — getting attacker-controlled code (shellcode) or a code-reuse chain to execute, working within memory constraints (bad characters, size limits).
5. **Making it reliable** — an exploit that works once in ten is often not enough; reliability across conditions is real engineering.

## Defeating the mitigations (the hard part)

The skilled level named the mitigations; exploit development is largely about **bypassing** them, which is why it's advanced:

- **DEP/NX** → **ROP (Return-Oriented Programming)** — chain small snippets of existing executable code ("gadgets"), each ending in \`ret\`, to perform arbitrary operations without injecting executable code. Building a ROP chain (often to call a function that makes memory executable, or to invoke a syscall) is a core exploit-dev skill.
- **ASLR** → an **information leak** — a second vulnerability (or a feature) that reveals a memory address, from which you compute where everything is. Reliable modern exploits usually need a *leak primitive* plus a *corruption primitive* — a **two-bug chain**.
- **Stack canaries** → leak or avoid the canary (overwrite a target that doesn't cross the canary, or leak its value first).
- **PIE, CFI, and more** → further, sometimes each requiring its own bypass.

The result: a modern exploit is often a carefully engineered chain — leak an address to defeat ASLR, use a corruption bug to hijack control, ROP to defeat DEP, all reliably. This is why fresh binary exploitation is hard, specialised work, and why most engagement footholds come from easier routes.

## The tools and practice

Debuggers (**GDB**, with enhancements like **pwndbg**/**GEF**), disassemblers/decompilers (**Ghidra**, IDA), ROP-gadget finders, and pattern tools. CTF "pwn" challenges are the standard, legal training ground; **VulnServer** and deliberately vulnerable binaries let you practise the classic techniques in your lab.

## Why understand it at depth (even if you don't specialise)

Not every pro tester writes exploits, but understanding exploit development deeply lets you: assess the true severity and exploitability of memory-corruption CVEs, understand and adapt advanced exploits, appreciate why mitigations matter and which combinations are strong, and — for those who go there — do vulnerability research and write exploits for novel bugs. It also completes the defensive picture: knowing exactly how ROP defeats DEP and why an info-leak defeats ASLR is precisely why defenders layer all these mitigations (and add CFI, and keep software patched) — because each raises the bar and the combination makes exploitation genuinely hard.`,
      sample: {
        lang: 'text',
        caption: 'A modern exploit as a chain that defeats the mitigations',
        code: `Vulnerable binary with DEP + ASLR + stack canary. A reliable exploit:

  1. LEAK a memory address (via a 2nd bug/feature)   -> defeats ASLR
        (now you know where the code/libraries live)
  2. LEAK or avoid the stack canary                  -> defeats the canary
  3. overflow -> overwrite the return address        -> hijack control
  4. build a ROP CHAIN from existing gadgets         -> defeats DEP/NX
        (e.g. call mprotect to make memory executable, then run shellcode,
         or invoke execve via a syscall gadget)
  = a two-bug chain (leak + corruption) + ROP, made RELIABLE.

Tools: gdb+pwndbg, Ghidra, ROP-gadget finders. Practice: CTF pwn, VulnServer.`,
        output: `Exploit development builds working exploits for memory-corruption
bugs and is mostly about DEFEATING mitigations: ROP for DEP/NX, an
info-leak for ASLR, leaking/avoiding the canary - often a two-bug
chain made reliable. It's a deep specialism (CTF pwn, OSED).
Understanding it at depth lets you assess CVE exploitability,
adapt advanced exploits, and see exactly why defenders layer these
mitigations - because the combination makes exploitation hard.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do reliable modern memory-corruption exploits typically require a "two-bug chain" (an information leak plus a memory-corruption bug) rather than a single overflow?',
        options: [
          'Because one bug is never enough to crash a program',
          'Because ASLR randomises memory addresses, so the attacker needs an information-leak bug to discover where code and data live before a corruption bug can reliably redirect execution — and DEP/NX further forces the use of ROP (reusing existing code) rather than injected shellcode; the mitigations together mean a single naive overflow no longer works',
          'Because two bugs run faster than one',
          'Because modern software has exactly two vulnerabilities',
        ],
        answer: 1,
        explain:
          'The mitigations layer to defeat the classic single-overflow exploit. ASLR randomises where everything is loaded each run, so even if you can overwrite a return address you don’t know a valid address to point it at — you first need an information leak (often a separate vulnerability) to reveal an address and compute the rest. DEP/NX then prevents executing injected shellcode, forcing you to reuse existing executable code via a ROP chain. Stack canaries and PIE add further hurdles. So a reliable modern exploit becomes an engineered chain — leak to defeat ASLR, corruption to hijack control, ROP to defeat DEP — which is exactly why binary exploitation is hard specialised work and why defenders enable all these mitigations together.',
        hint: 'What does ASLR hide, and what kind of bug do you need to find it before a corruption bug can be aimed reliably?',
      },
    },

    {
      id: 'rlin-p-03',
      title: 'Evasion and detection, at depth',
      read: `A capable adversary operates against active defences — EDR, monitoring, hunting — and pro-level testers understand the depth of **evasion** to emulate real threats and, crucially, to advise defenders on detection. This is knowledge for realistic authorized testing and for improving defence, not a recipe for defeating protections maliciously; the frame throughout is understanding, so both sides improve.

## What modern defences see, and what evasion targets

Recall the defensive tracks — EDR and monitoring observe process execution, ancestry, file and registry activity, network connections, and behavioural patterns. Evasion targets each observation:

- **Avoiding on-disk detection** — **living off the land** (using built-in trusted tools so there's no malicious file), in-memory execution (running code without writing it to disk), and fileless techniques. The defensive answer: behavioural and memory detection, since there's no file to scan.
- **Avoiding behavioural detection** — mimicking normal activity, controlled timing, avoiding the tell-tale patterns (Office spawning a shell, service accounts running interpreters) — which is why defenders detect on anomalous ancestry and behaviour.
- **Blinding the sensors** — the EDR-evasion category from the defensive Windows track (AMSI/ETW patching, unhooking, BYOVD on Windows; on Linux, tampering with auditd/eBPF-based tooling). The defensive answer: the act of blinding is itself detectable (a service stopping, telemetry going dark), and you harden the sensors.
- **Encrypted and blending C2** — the advanced-C2 concepts (domain fronting, C2 over legit services, DoH), detected behaviourally rather than by content.

## The arms race, understood

Evasion and detection co-evolve: a technique works, defenders build detection for it, attackers adapt, defenders adapt. Understanding this dynamic — rather than any single technique — is the pro insight. It means:

- **No evasion is permanent** — detection catches up, so real adversaries continually adapt, and defenders must keep improving.
- **Behaviour is harder to evade than signatures** — you can change a file hash trivially but not the fact that you must execute processes, open files, and make connections. This is why the Pyramid of Pain puts TTP-based detection at the top and why behavioural detection is the durable defence.
- **Blinding is noisy** — turning off a sensor is an action defenders can detect, so evasion trades one signal for another.

## The purple-team payoff (the point)

The pro value of understanding evasion in depth is **improving detection**. On an authorized engagement, a tester who can emulate an evasive adversary tests whether the blue team's detection holds against realistic tradecraft — and the report says exactly which techniques were caught, which slipped past, and how to detect the ones that slipped. This is the offensive half of the purple-team loop: the tester's evasion is the input that reveals and closes the blue team's blind spots.

## The honest frame

This depth of knowledge is genuinely dual-use — real adversaries evade too — which is precisely why defenders must understand it, and why testers who understand it are so valuable to defence. The purpose here is emulation to measure and improve detection, not to defeat protections for harm. The most valuable pro tester can tell an organisation, with evidence: "here is how a capable adversary would operate against your defences, here is what you would and wouldn't catch, and here is how to close the gaps" — which is worth far more than any single exploit.`,
      sample: {
        lang: 'text',
        caption: 'The evasion/detection arms race, and its purple-team output',
        code: `Evasion technique              Why detection still wins (eventually)
-----------------------------------------------------------------------
living off the land (no file)  behavioural + memory detection (no file to scan)
mimic normal behaviour         anomaly detection vs the host's baseline
blind the sensor (stop it)     the sensor STOPPING is itself detectable
encrypted / blending C2        beaconing timing + TLS fingerprints (behaviour)

Key insight: you can change a hash trivially, but you can't avoid
EXECUTING processes, opening files, making connections -> behaviour
is the durable detection (Pyramid of Pain).

Purple output: "here's how a capable adversary operates vs your
defences; here's what you caught and MISSED; here's how to close it."`,
        output: `Pro-level evasion understanding = emulate a realistic evasive
adversary to TEST and IMPROVE detection. Evasion and detection
co-evolve; behaviour is harder to evade than signatures; blinding
a sensor is itself a signal. The point is the purple-team output -
what the blue team caught, missed, and how to fix it - not
defeating defences for harm. Dual-use knowledge is exactly why
both sides must understand it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is behaviour-based detection considered more durable against a capable adversary than signature-based detection?',
        options: [
          'Because signatures are illegal to use',
          'Because an attacker can trivially change artefacts like file hashes to evade signatures, but cannot avoid the underlying behaviours required to act — executing processes, opening files, making connections — so detecting on behaviour (and anomalies from baseline) catches techniques even as their specific artefacts change, which is why it sits at the top of the Pyramid of Pain',
          'Because behaviour never changes at all',
          'Because behaviour-based detection produces no false positives',
        ],
        answer: 1,
        explain:
          'Signatures match specific artefacts — a hash, a string, an IP — which an attacker alters cheaply, so signature-only detection is brittle against a capable adversary. Behaviour is different: to accomplish anything, the attacker must still spawn processes, access files, escalate, and communicate, and those actions (and their deviation from a host’s normal baseline) are far harder to change or hide. That is why the Pyramid of Pain ranks TTP/behavioural detection highest and why the durable defensive investment is behavioural. The corollary for a tester is that emulating evasion tests exactly this — and even blinding a sensor is itself a detectable behaviour — so the purple-team output is which behaviours the blue team caught, which it missed, and how to close the gaps.',
        hint: 'What can an attacker change with no effort (a hash) versus what they cannot avoid doing (executing, connecting)?',
      },
    },

    {
      id: 'rlin-p-04',
      title: 'Threat-informed adversary emulation',
      read: `The most valuable red-team work is **threat-informed**: rather than attacking "however", you emulate the **specific adversaries** that actually threaten the organisation, using their real techniques. This makes the exercise directly relevant and its results directly actionable — and it's the offensive expression of the ATT&CK-driven defence from the blue tracks.

## From generic testing to intelligence-driven emulation

- **Choose a relevant adversary** — based on threat intelligence: which threat actors target this organisation's sector, region, or profile? A financial firm emulates financially-motivated intrusion sets; a defence contractor emulates relevant APTs. Sources: threat-intel reports, ISAC sharing, CISA advisories, and **MITRE ATT&CK Groups** (which catalogue real actors and their techniques).
- **Extract their TTPs** — the specific tactics, techniques and procedures that actor uses, in the order they use them, mapped to ATT&CK. Public **adversary emulation plans** (from MITRE's Center for Threat-Informed Defense and others) document real actors' full playbooks.
- **Emulate faithfully** — reproduce that actor's tradecraft: their initial-access methods, their C2 style, their escalation and lateral-movement techniques, their persistence and exfiltration approach — so the test reflects a threat the organisation genuinely faces.

## Why this is more valuable than generic red teaming

- **Relevance** — testing against the adversaries that actually threaten you answers "are we defended against *our* threats?", not "against some generic attacker".
- **Actionable coverage** — the results map to a specific, prioritised list of that actor's techniques: which you detect, which you're blind to. That's a concrete detection backlog aimed at real threats.
- **Realistic tradecraft** — emulating a real actor's specific TTPs (not just generic tools) tests detection under realistic conditions, including the actor's evasion style.

## Emulation vs simulation

- **Simulation** — approximating adversary behaviour abstractly (e.g. running a tool that "acts like" ransomware).
- **Emulation** — faithfully reproducing a *specific* actor's actual TTPs. Emulation is more rigorous and more valuable, because it tests against the real thing.

Tools support this: **Atomic Red Team** (per-technique tests mapped to ATT&CK), **Caldera** (automated adversary emulation, can chain an actor's TTPs), and the emulation plans that script real actors' full campaigns.

## The measurement: ATT&CK coverage

The output is an **ATT&CK coverage assessment** for the emulated adversary: a heatmap of that actor's techniques showing which the organisation prevents, detects, or is blind to. This is the same ATT&CK Navigator artefact the defensive tracks used — produced now by *testing*, so the coverage is evidence-based rather than assumed. Gaps become the prioritised detection-engineering backlog.

## The full purple loop

Threat-informed emulation is the heart of mature purple teaming: emulate the relevant adversary's chain, measure detection at each technique, close the gaps, and re-emulate to verify — the loop from the defensive pro levels, driven from the offensive side. The pro red-teamer doesn't just break in; they answer, with evidence mapped to real threats, "against the adversaries that target us, here is our detection coverage, here are the gaps, and here is how they improved after we closed them." That intelligence-driven, measured, iterative improvement is offensive security delivering maximum defensive value.`,
      sample: {
        lang: 'text',
        caption: 'Threat-informed emulation producing an ATT&CK coverage map',
        code: `1. intel: which actors target our sector? -> pick a relevant group (ATT&CK Groups)
2. extract its TTPs (from its ATT&CK profile / an emulation plan), in order
3. emulate that actor's chain faithfully (Atomic Red Team / Caldera):

   Technique (ATT&CK)             Prevented?  Detected?  MTTD
   ------------------------------------------------------------
   T1566 phishing (their style)   no          yes        4m
   T1059 their execution method   ASR-equiv   yes         -
   T1003 credential access        no          NO          -   <- gap
   T1021 lateral movement         seg         yes        6m
   T1048 exfil (their channel)    no          NO          -   <- gap

4. gaps -> detection backlog; close them; RE-EMULATE to verify.`,
        output: `Threat-informed emulation reproduces the SPECIFIC adversaries that
threaten YOU (via ATT&CK Groups + emulation plans), not a generic
attacker - so results are relevant and actionable. Output: an
evidence-based ATT&CK coverage map (prevent/detect/blind) with the
gaps as a prioritised backlog. Emulate -> measure -> close -> re-
emulate: the purple loop from the offensive side, delivering
maximum defensive value.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is threat-informed adversary emulation (reproducing specific relevant actors’ TTPs) more valuable than generic red teaming?',
        options: [
          'Because it uses more expensive tools',
          'Because emulating the specific adversaries that actually threaten the organisation, with their real TTPs mapped to ATT&CK, tests defences against genuine threats under realistic conditions and produces an evidence-based, prioritised coverage assessment (which of that actor’s techniques are prevented, detected, or blind) that maps directly to actionable detection improvements',
          'Because generic attackers do not exist',
          'Because it avoids needing authorization',
        ],
        answer: 1,
        explain:
          'Generic red teaming answers "could some attacker get in?"; threat-informed emulation answers the more useful question "are we defended against the adversaries that actually target organisations like us?" By selecting relevant actors from threat intelligence and ATT&CK Groups and faithfully reproducing their specific TTPs (via emulation plans and tools like Caldera/Atomic Red Team), the test reflects genuine threats under realistic conditions, including the actor’s evasion style. Its output is an evidence-based ATT&CK coverage map — which of that actor’s techniques you prevent, detect, or are blind to — that becomes a prioritised detection backlog, and re-emulating after fixes closes the purple-team loop. Relevance and actionable, measured coverage are what make it more valuable.',
        hint: 'Does it test against "some attacker" or against the actors that specifically threaten this organisation — and what measurable output does that produce?',
      },
    },

    {
      id: 'rlin-p-05',
      title: 'Vulnerability research and disclosure',
      read: `At the frontier, offensive practitioners don't just use known vulnerabilities — they **find new ones**. Vulnerability research (discovering previously-unknown flaws) and **responsible disclosure** (getting them fixed) are how the security community's collective defence advances, and understanding the process is part of the pro picture.

## Finding new vulnerabilities

Research methods for discovering unknown flaws:

- **Source code review** — reading code (open-source, or code you're authorized to review) for security flaws: injection points, logic errors, memory-corruption bugs, unsafe patterns. Deep, human-driven, and effective for finding subtle logic and design flaws no tool catches.
- **Fuzzing** — automatically feeding a program malformed/random inputs to trigger crashes, which are then analysed for exploitability. Modern **coverage-guided fuzzers** (AFL++, libFuzzer, and continuous fuzzing like OSS-Fuzz) find enormous numbers of memory-corruption bugs in real software; fuzzing is one of the most productive research techniques.
- **Reverse engineering** — analysing compiled binaries (Ghidra, IDA) to understand and find flaws in software without source — for proprietary software, firmware, and malware.
- **Protocol and specification analysis** — studying how a protocol or format is implemented for parsing and state-machine flaws.

Vulnerability research is a deep specialism; the point here is understanding *how* new vulnerabilities are found, and that it's rigorous, often tool-assisted (fuzzing) but ultimately human-driven work.

## Responsible (coordinated) disclosure

Finding a vulnerability creates a responsibility: getting it fixed without enabling harm. **Coordinated disclosure** is the ethical process:

1. **Report privately to the vendor/owner** first, with enough detail to reproduce and fix.
2. **Give reasonable time to fix** — a disclosure deadline (commonly ~90 days, negotiable) balances giving the vendor time against not leaving users exposed indefinitely.
3. **Coordinate public disclosure** — after a fix (or the deadline), publish responsibly, often with a **CVE** assigned, so the community can learn and defend, and other affected parties can act.
4. **Don't exploit it in the wild** or sell it to those who will — that crosses from research into harm.

The tension: **full disclosure** (publish immediately, forcing fast fixes but exposing users) vs **coordinated disclosure** (private first, giving time) — the community consensus favours coordinated disclosure as the responsible balance. **Bug bounty programs** formalise this: a sanctioned channel to report flaws for reward, within scope and rules (the defensive VDP, from the researcher's side).

## Where research is legal

Vulnerability research is legal on: your own software, open-source (respecting licences), software you're authorized to test, and within bug-bounty scopes. Researching software you don't own or have permission for — including probing live services without authorization — can be a crime, so research targets are chosen carefully (your own instances, downloadable software, sanctioned programs). Safe-harbour provisions in bug-bounty/VDP policies protect good-faith research within their scope.

## Why it matters to the pro

Even if you don't specialise in research, understanding it completes the picture: it's how the CVEs you exploit come to exist, how the community's defences advance, and how a found vulnerability is handled ethically. And it connects the two sides — a researcher who finds a flaw and discloses it responsibly is doing the most fundamentally defensive thing possible: getting a real weakness fixed for everyone before it can be abused. That is offensive skill in its purest service of defence.`,
      sample: {
        lang: 'text',
        caption: 'Finding a new vulnerability, then disclosing it responsibly',
        code: `FINDING (on your own / authorized / open-source targets):
  source review   -> spot an unsafe pattern a human notices
  fuzzing (AFL++) -> feed malformed input, find crashes, triage exploitability
  reverse eng.    -> analyse a binary (Ghidra) for flaws without source

DISCLOSING (coordinated / responsible):
  1. report PRIVATELY to the vendor, with reproduction details
  2. give reasonable time to fix (~90 days, negotiable)
  3. coordinate public disclosure after the fix; CVE assigned
  4. do NOT exploit in the wild or sell to those who will
  (bug bounties formalise this with scope, rules, and safe harbour)`,
        output: `Vulnerability research FINDS new flaws (source review, fuzzing,
reverse engineering) - rigorous, often tool-assisted, human-driven.
Responsible/coordinated disclosure gets them FIXED: report
privately, allow time, coordinate public release + CVE, never
exploit or sell. Legal only on your own/authorized/open-source
targets and within bounty scopes. A responsibly-disclosed flaw is
offensive skill in the purest service of defence - fixed for all.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A researcher discovers a previously-unknown vulnerability in widely-used software. What does responsible (coordinated) disclosure require?',
        options: [
          'Publishing full exploit details immediately for maximum awareness',
          'Reporting the flaw privately to the vendor first with enough detail to fix it, allowing reasonable time to remediate (a negotiable deadline), coordinating public disclosure (often with a CVE) after a fix or the deadline, and never exploiting it in the wild or selling it to those who would — balancing getting it fixed against not exposing users',
          'Selling the vulnerability to the highest bidder',
          'Exploiting it quietly to prove it is real',
        ],
        answer: 1,
        explain:
          'Finding a flaw creates a duty to get it fixed without enabling harm, which coordinated disclosure achieves: report privately to the vendor with reproduction details so they can remediate, give a reasonable (negotiable, commonly ~90-day) window that balances the vendor’s need to fix against users’ exposure, then coordinate public disclosure after a fix or the deadline — usually with a CVE so the community can defend — and crucially never exploit the flaw in the wild or sell it to those who will. Publishing full details immediately (full disclosure) forces fast fixes but exposes users in the interim, which is why the community consensus favours the coordinated balance; bug-bounty and VDP programs formalise this channel with scope, rules and safe harbour.',
        hint: 'Whom do you tell first, how long do you wait, and what must you never do with the flaw in the meantime?',
      },
    },

    {
      id: 'rlin-p-06',
      title: 'Custom tooling and adapting',
      read: `At the frontier, off-the-shelf tools aren't always enough — they're detected, they don't fit the target, or the technique you need doesn't have a tool. Pro operators **build and adapt tooling**, understanding their tools deeply enough to modify them and to create what doesn't exist. This is capability beyond running frameworks.

## Why custom tooling

- **Evading detection** — well-known tools (default Metasploit payloads, unmodified C2 agents) have signatures that defenders detect readily. Emulating a capable adversary sometimes requires custom or modified tooling that doesn't match known signatures (understood, again, for testing detection realistically, not for malicious evasion).
- **Fitting the target** — a specific environment, architecture, or constraint may need a bespoke solution no general tool provides.
- **New techniques** — implementing a technique that has no ready tool, or a novel chain.
- **Efficiency** — a small custom script that does exactly what you need, better than a heavyweight general tool (the automation lesson, extended).

## The skills involved

- **Programming** — Python, Go, C, and others, to build tools: custom enumeration, exploitation, post-exploitation, and (for red teams) tailored implants/loaders. Go and Rust have become popular for offensive tooling (cross-compilation, static binaries).
- **Understanding your tools deeply** — reading and modifying existing tools' source (open-source frameworks are code you can adapt), so you can change behaviour, evade a specific detection, or extend functionality. This rests on the recurring principle: understand your tools, don't just run them.
- **Understanding the target platform** — OS internals, APIs, and how detection works, so your tooling operates and is shaped appropriately.

## Living off the land as "tooling"

Often the most effective and stealthy "tool" is **no custom tool at all** — using the target's built-in, trusted utilities (the LOTL concept). A pro operator frequently prefers built-in tools and small scripts over dropping recognisable tooling, because there's less to detect. So "tooling" spans a spectrum: built-in tools → small custom scripts → modified frameworks → bespoke implants, chosen for the situation.

## The discipline and frame

- **Understand what you build and run** — bespoke tooling must be reliable and safe on an authorized engagement; a buggy custom tool can crash a production system.
- **Authorized context** — custom offensive tooling is built and used for authorized engagements and research. The knowledge of how to build it is dual-use (real adversaries build custom tooling, which is why defenders study it), and the frame is realistic emulation and capability for authorized work, not creating malware for harm.
- **The value** — the ability to build and adapt is what separates an operator who can only run existing tools (and hits a wall when they're detected or don't fit) from one who can accomplish the objective under any conditions and emulate a capable adversary who would do the same.

Custom tooling completes the technical progression: from running tools (beginner), to understanding and adapting them (skilled), to building what's needed (pro) — always under authorization, always understood, in service of testing and improving defence.`,
      sample: {
        lang: 'text',
        caption: 'The tooling spectrum: prefer the stealthiest that fits',
        code: `Least footprint  <----------------------------------->  Most capable/detectable
  built-in tools  ->  small custom  ->  modified      ->  bespoke
  (LOTL: no file)     scripts           frameworks         implant/loader
  hardest to detect                     known signatures   custom, must be reliable

Pro operators:
  - understand tools deeply enough to MODIFY them (they're code)
  - build small tools when nothing fits (Python/Go/Rust)
  - often prefer LOTL: the best "tool" is frequently no tool at all
  - all for AUTHORIZED engagements/research; understood, reliable, safe`,
        output: `Off-the-shelf tools get detected or don't fit, so pro operators
ADAPT and BUILD tooling - from preferring built-in tools (LOTL,
least footprint) to small custom scripts to modified frameworks to
bespoke implants. It rests on understanding tools deeply (they're
code to modify) and the target platform. Dual-use knowledge for
authorized emulation and capability - understood, reliable, safe,
not malware for harm. Run -> adapt -> build is the progression.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do pro operators build and adapt their own tooling rather than relying solely on off-the-shelf frameworks?',
        options: [
          'Because off-the-shelf tools are always illegal',
          'Because well-known tools carry signatures defenders detect, may not fit a specific target, and may not implement a needed technique — so emulating a capable adversary and accomplishing objectives under real conditions requires understanding tools deeply enough to modify them and building bespoke ones (or preferring built-in tools/LOTL for the least footprint), all under authorization',
          'Because building tools avoids the need for authorization',
          'Because custom tools never need to be understood',
        ],
        answer: 1,
        explain:
          'Default framework payloads and unmodified agents have recognisable signatures, a specific environment may need a bespoke solution, and some techniques have no ready tool — so an operator who can only run existing tools hits a wall when they are detected or do not fit. Emulating a capable adversary (who would build custom tooling) and reliably meeting objectives requires understanding tools deeply enough to modify their source, building small tools when nothing fits, and often preferring the target’s built-in utilities (living off the land) for the least footprint. This is the run → adapt → build progression, done for authorized engagements and research, with the tooling understood, reliable and safe — dual-use knowledge that is exactly why defenders study custom tradecraft too.',
        hint: 'What happens to an operator who can only run known tools when those tools are detected or don’t fit the target?',
      },
    },

    {
      id: 'rlin-p-07',
      title: 'Social engineering and initial access',
      read: `In real intrusions and red-team operations, the first foothold often comes not through a technical exploit but through **people** — social engineering. Understanding it is essential to emulating real adversaries and to advising defenders, since humans are consistently the most-targeted attack surface.

## Why social engineering matters

Most real breaches begin with a human element — a phishing email, a stolen credential entered on a fake page, a malicious attachment opened. Technical defences have improved, so attackers increasingly target people, who are harder to "patch". For red-team operations emulating real adversaries, social engineering is frequently the realistic initial-access vector, so testing it (with explicit authorization) reflects genuine risk.

## The main techniques (understood for authorized testing and defence)

- **Phishing** — deceptive emails at scale, luring targets to enter credentials on a fake site, open a malicious attachment, or click a link. **Spear phishing** targets specific individuals with tailored, convincing pretexts (informed by OSINT). This is the dominant initial-access vector.
- **Pretexting** — a fabricated scenario to build trust and extract information or access (impersonating IT support, a vendor, a colleague).
- **Vishing / smishing** — social engineering by phone or SMS.
- **Physical** (where in scope) — tailgating into a building, dropping malicious USB devices, impersonation on-site.
- **Watering hole** — compromising a site the targets visit.

The mechanism underlying all of them is **exploiting human psychology** — authority, urgency, trust, fear, helpfulness, curiosity — rather than a software flaw.

## In an authorized engagement

Social engineering testing requires **especially careful authorization and ethics**, because it involves real people (employees):

- **Explicit authorization** and clear rules — what's permitted, who's in/out of scope (often no targeting of certain individuals), and how findings are handled.
- **Handle people ethically** — the goal is to test and improve, not to shame; results are reported in aggregate and constructively, never to punish individuals.
- **Data care** — credentials captured in a phishing test are handled securely and reported, not misused.
- **Realistic but safe** — pretexts realistic enough to test genuinely, without causing genuine distress or harm.

## The defensive mirror

Social-engineering testing directly informs defence: **security-awareness training**, phishing-resistant MFA (which defeats credential phishing even when the human is fooled — the defensive lesson), email security controls, and processes that resist pretexting (verification procedures). When a phishing test succeeds, the finding drives training and technical controls; when phishing-resistant MFA blocks the captured credential from being useful, it demonstrates that control's value. The most important defensive insight: since humans will sometimes be fooled, the durable defence is **technical controls that limit the damage** (MFA, least privilege, segmentation) plus **detection and response**, not solely trying to make humans never click.

## The frame

Understanding social engineering is essential to realistic adversary emulation and to defending the human attack surface. It is used only with explicit authorization, handled ethically with respect for the people involved, and aimed at improving both awareness and — more durably — the technical controls and processes that limit the impact when someone is inevitably deceived. It is the clearest reminder that security is socio-technical: the strongest technical stack can be bypassed by a convincing email, and the best defence combines training with controls that assume the human will sometimes fail.`,
      sample: {
        lang: 'text',
        caption: 'Human-focused initial access, and the durable defences',
        code: `Most breaches start with PEOPLE, not exploits:
  spear phishing (OSINT-tailored) -> credential on a fake page / malicious attachment
  pretexting (impersonate IT/vendor) -> extract access or info
  vishing/smishing, physical (tailgating, USB drops) - where in scope

Mechanism: human psychology (authority, urgency, trust, curiosity), not a bug.

Authorized testing: explicit authz, ethical handling of real people
(aggregate + constructive, never punitive), secure data handling.

Durable defence (since humans WILL sometimes be fooled):
  phishing-resistant MFA (stolen credential is useless), least privilege,
  segmentation, detection + response - PLUS awareness training.`,
        output: `Social engineering targets PEOPLE - the most-targeted surface -
and is often the real initial-access vector, so red teams emulate
it (with careful authorization + ethics). The key defensive
insight: humans will sometimes be fooled, so the durable defence
is TECHNICAL controls that limit damage (phishing-resistant MFA,
least privilege, segmentation) plus detection - not only trying
to make people never click. Security is socio-technical.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Given that social engineering (like phishing) will sometimes succeed in fooling a human, what is the most durable defensive posture?',
        options: [
          'Rely entirely on training so that no employee ever clicks',
          'Combine awareness training with technical controls that limit the damage when someone is inevitably deceived — phishing-resistant MFA (so a stolen credential is useless), least privilege, segmentation, and detection and response — because assuming humans will occasionally fail and containing the impact is more reliable than expecting perfect human behaviour',
          'Ban email entirely',
          'Punish employees who fall for phishing tests',
        ],
        answer: 1,
        explain:
          'Humans are the most-targeted attack surface and cannot be perfectly "patched" — sufficiently convincing pretexts will occasionally succeed, so a defence that depends solely on nobody ever clicking is fragile. The durable posture assumes human failure and limits its consequences with technical controls: phishing-resistant MFA renders a phished credential unusable, least privilege and segmentation bound what a compromised account can reach, and detection and response catch the follow-on activity. Awareness training still helps reduce the rate of success and should be constructive rather than punitive, but the reliable defence is training plus controls that contain the impact — the socio-technical reality that the strongest technical stack can be bypassed by a convincing email.',
        hint: 'Can you make humans never fail — or should you assume they sometimes will and limit what that failure yields?',
      },
    },

    {
      id: 'rlin-p-08',
      title: 'Advanced cloud and container attacks',
      read: `The skilled level introduced cloud pentesting; at the pro level, cloud and container/Kubernetes attacks go deep — reflecting that modern infrastructure is where high-value targets increasingly live, and mirroring the advanced cloud/container defence from the blue tracks.

## Advanced cloud attack paths

- **IAM privilege-escalation chains** — beyond a single misconfigured policy, chaining permissions: an identity that can create a role, pass it to a service, and have that service act with more privilege; assuming a chain of roles across accounts; abusing service-linked roles. Cloud IAM privesc is a rich graph problem (like BloodHound for the cloud), and tools map these paths.
- **Cross-account and organisation attacks** — exploiting trust relationships between cloud accounts (cross-account role assumption, shared resources), and in AWS Organizations, reaching the management account (the cloud "domain admin").
- **Serverless attacks** — functions with over-broad roles, event-injection into serverless triggers, and abusing the execution environment.
- **Cloud persistence** — creating backdoor IAM users/roles/keys, modifying trust policies, and other cloud-native persistence (which cloud-focused detection hunts).
- **Data-service attacks** — reaching managed databases, storage, and secrets services via the permissions gained.

## Kubernetes attacks in depth

Kubernetes is a major attack surface with its own escalation graph:

- **From a pod** — an over-privileged **service account token** granting cluster-API access; escaping the container to the **node** (privileged pods, host mounts, the container-escape techniques); reaching the **kubelet** and other pods.
- **RBAC escalation** — abusing over-broad Kubernetes RBAC (permissions to create pods, read secrets cluster-wide, impersonate, or escalate) to move from a limited service account to cluster-admin. Like cloud IAM, k8s RBAC is a graph with escalation paths.
- **Cluster-wide compromise** — from a foothold to controlling the cluster: reading all secrets, scheduling privileged pods on any node, reaching the control plane.
- **Supply chain into the cluster** — a malicious image, a compromised registry, or a poisoned admission path.

## The methodology, cloud/k8s-flavoured

The same loop, in this environment: obtain credentials/access → enumerate permissions (the decisive phase — what can this identity/token do?) → escalate within IAM/RBAC (find the permission path) → move across resources/accounts/namespaces via trust → reach objectives (data, control plane). Enumeration of *permissions* is as central here as service enumeration is on hosts.

## The defensive mirror

Every path maps to advanced cloud/k8s hardening from the defensive tracks: least-privilege IAM with no escalation chains (audit the permission graph), least-privilege Kubernetes RBAC with scoped service accounts, no privileged pods or host mounts, network policies, protected control plane and registries, and monitoring the management plane (cloud) and the audit log (k8s). When you chain an IAM privesc to the management account, or ride an over-privileged service account to cluster-admin, you're demonstrating exactly those failures — and the report's fixes are the advanced cloud/container controls. As infrastructure moves to cloud and Kubernetes, this is increasingly where engagements are won, and the battleground is, once again, **permissions and identity** more than traditional exploitation.`,
      sample: {
        lang: 'text',
        caption: 'Cloud IAM and Kubernetes RBAC as escalation graphs',
        code: `CLOUD (IAM privesc chain, not a single misconfig):
  appuser: iam:PassRole + lambda:CreateFunction
    -> create a Lambda, pass it a privileged role, invoke it
    -> the function runs with admin -> cross-account role -> mgmt account

KUBERNETES (RBAC escalation from a pod):
  pod service account: can create pods + read secrets in the namespace
    -> read a more-privileged service account's token from a secret
    -> or schedule a privileged pod on a node -> escape to the node
    -> reach cluster-admin -> read ALL secrets, control the cluster

Enumerate PERMISSIONS -> find the escalation path -> chain to control.`,
        output: `Advanced cloud/k8s attacks are ESCALATION GRAPHS: IAM privesc
chains (passrole, role assumption, cross-account -> mgmt account)
and Kubernetes RBAC escalation (over-broad service accounts ->
cluster-admin), plus container escape to the node. The decisive
phase is enumerating PERMISSIONS. Defences: least-privilege IAM/
RBAC with no escalation chains, no privileged pods/host mounts,
network policies, protected control plane - the advanced mirror.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are advanced cloud IAM and Kubernetes RBAC attacks best understood as "escalation graphs" rather than single misconfigurations?',
        options: [
          'Because they only ever involve one permission',
          'Because escalation typically comes from chaining several permissions or trust relationships — e.g. create a role, pass it to a service that runs with more privilege, assume a role across accounts, or ride an over-broad service account to cluster-admin — so the attack (and the defence) is about analysing the graph of permissions and trust for paths, much like BloodHound for identity',
          'Because cloud and Kubernetes have no access controls',
          'Because graphs are only a visualization, not a real risk',
        ],
        answer: 1,
        explain:
          'In cloud and Kubernetes, what an identity can do is defined by webs of permissions and trust relationships, and escalation usually arises not from one glaring misconfiguration but from chaining several — an identity that can create and pass a role to a more-privileged service, assume a role in another account, reach the management account, or use an over-broad service account to read a more powerful token or schedule a privileged pod to cluster-admin. This makes both the attack and the defence a graph-analysis problem (analogous to BloodHound for AD): find the escalation paths through the permission/trust graph. Consequently the decisive phase is enumerating permissions, and the defensive fixes are least-privilege IAM/RBAC audited for escalation chains, no privileged pods or host mounts, network policies, and a protected control plane.',
        hint: 'Does escalation here come from one bad setting, or from linking several permissions and trust relationships into a path?',
      },
    },

    {
      id: 'rlin-p-09',
      title: 'Leading engagements',
      read: `At the pro level, offensive work is often about **leading** — running engagements and teams, making the judgement calls, managing risk and client relationships, and ensuring the work delivers value. Technical mastery is assumed; leadership is what a senior practitioner adds.

## Scoping and planning the engagement

The lead shapes the engagement before it starts:

- **Understanding the client's real goals** — not "do a pentest" but "what are you actually worried about, and what would make this valuable?" A good scope reflects real business risk and answers real questions.
- **Choosing the right engagement type** — pentest vs red team vs purple, black/grey/white box — to match the goal (the skilled-level types).
- **Defining scope and rules of engagement** carefully — bounded to be safe, meaningful, and legally sound, with clear deconfliction and emergency procedures.
- **Setting expectations** — timeline, what will and won't be tested, how findings will be delivered.

## Managing risk during the engagement

Leading means owning the risk of the work itself:

- **Safety judgement** — deciding when a technique is too risky for a production system, when to pause, when to escalate to the client (a discovered critical issue, an unexpected impact, evidence of a *real* prior compromise — which must be reported immediately).
- **Staying in scope and legal** — enforcing the boundary across the team, handling data correctly, and stopping if something goes wrong.
- **Deconfliction** — coordinating with the client's trusted agents so the team's activity is distinguishable from a real attack and can be paused.

## Leading a team

Larger engagements are team efforts:

- **Coordination** — dividing work, sharing findings and access, maintaining a common picture (this is where good collaborative notes/tooling matter).
- **Mentoring** — bringing junior testers along, reviewing their work, sharing knowledge.
- **Quality** — ensuring thoroughness and consistency across the team, and that the report meets a high standard.

## Client relationship and communication

The lead is the client's main interface:

- **Communicating throughout** — not just at the end; keeping the client informed, raising critical findings immediately rather than sitting on them, and managing expectations.
- **Delivering value** — ensuring the engagement answers the client's questions and produces actionable improvement, and communicating that in debriefs to technical and executive audiences (the reporting craft).
- **Building trust** — professionalism, discretion (you see sensitive things), and reliability are what earn repeat work and a good reputation. Trust is the currency of the profession.

## The judgement that defines seniority

Much of leadership is **judgement calls** that come from experience: what's worth pursuing vs a rabbit hole, when a technique's risk outweighs its value, how to prioritise findings by real business risk, when to escalate, how to communicate a hard truth constructively. These aren't technical skills — they're the professional judgement that turns technical capability into consistently valuable, safe, well-received engagements.

## The frame

Leading engagements is where offensive security becomes a fully professional discipline: technical mastery in service of the client's real security needs, delivered safely, ethically, and communicated so it drives improvement. The senior practitioner's value is not that they can compromise anything, but that they can run an engagement that makes the organisation genuinely more secure — scoped right, executed safely, and reported to drive action — which is the entire purpose of authorized offensive security, realised at scale and with responsibility.`,
      sample: {
        lang: 'text',
        caption: 'What a senior lead adds beyond technical skill',
        code: `BEFORE:  understand the client's REAL goals -> right engagement type ->
         careful scope + RoE + deconfliction + expectations

DURING:  safety judgement (too risky for prod? pause? escalate?)
         enforce scope/legal/data-handling across the team
         report critical findings IMMEDIATELY (and any REAL prior
           compromise discovered) - don't sit on them
         coordinate the team; keep a common picture; mentor

AFTER:   deliver value: actionable, prioritised, well-communicated
         debrief technical + executive audiences; retest
         build TRUST (professionalism, discretion) -> the profession's currency

Seniority = JUDGEMENT: rabbit hole vs lead, risk vs value, how to
prioritise by business risk, when to escalate, how to say hard truths.`,
        output: `Leading engagements is offensive security as a full profession:
technical mastery PLUS scoping to the client's real goals, owning
the risk of the work (safety judgement, staying legal/in-scope,
escalating critical/real-compromise findings), leading and
mentoring a team, and communicating to drive improvement. The
senior's value isn't "can compromise anything" but "can run an
engagement that makes the org genuinely more secure". Judgement
and trust define seniority.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'During an authorized engagement, a tester discovers evidence that the client was *already compromised by a real attacker* before the test began. What should happen?',
        options: [
          'Ignore it, since it is outside the test’s scope',
          'Escalate it to the client immediately — evidence of a real, prior compromise is a critical finding that must be reported at once rather than held for the final report, because the client needs to respond to an active threat, and handling such situations is part of the professional judgement and communication that leading engagements requires',
          'Exploit it further to see how deep the real attacker got',
          'Quietly remove the attacker without telling anyone',
        ],
        answer: 1,
        explain:
          'Discovering signs of a genuine, pre-existing compromise is one of the clearest cases where professional judgement and immediate communication matter: it is a critical, time-sensitive finding that the client must act on to respond to an active threat, so it is escalated at once through the agreed contact rather than saved for the report. It would be wrong to ignore it as "out of scope", to exploit or investigate the real intrusion further (that risks interfering with a real incident and exceeds the engagement’s authorization), or to attempt remediation silently. Owning the risk of the work, raising critical findings immediately, and communicating hard truths constructively are exactly the leadership responsibilities that distinguish a senior practitioner beyond technical skill.',
        hint: 'It’s a live threat to the client, discovered mid-test. Does that wait for the final report — or go to the client now?',
      },
    },

    {
      id: 'rlin-p-10',
      title: 'The offensive-defensive unity',
      read: `Before the capstone, step back to the theme that has run through every level of this track and mirrored every defensive one: **offence and defence are the same knowledge, applied toward the same goal**. Internalising this is what makes a pro genuinely valuable — to attackers-for-hire and defenders alike, because they are, properly understood, the same profession.

## Every offensive skill is a defensive one

Look back at the track:

- **Enumeration** finds attack surface — which is what **attack-surface management** reduces.
- **Privilege escalation** exploits misconfigurations — which **hardening** removes; you learned the exact same checklist from both sides (SUID, sudo, cron, capabilities, kernel).
- **Lateral movement** rides credentials and trust — which **segmentation, unique credentials and least privilege** defeat.
- **Pivoting** crosses network zones — which **segmentation and egress control** prevent.
- **Credential access** exploits weak/reused secrets — which **strong hashing, no reuse, MFA and secrets management** address.
- **Persistence** hides in specific spots — which are exactly where **persistence-hunting** looks.
- **C2 and evasion** have behaviours — which **behavioural detection** catches.
- **Exploitation** uses vulnerabilities — which **patching** closes.

There is no offensive technique in this track that isn't a defensive finding in reverse. The offensive tester and the defender are looking at the same systems, the same misconfigurations, the same paths — one to exploit them, one to close them.

## Why the unity matters

- **Offence makes you a better defender** — you can only defend against what you understand, and nothing teaches you a vulnerability like exploiting it. The best defenders think like attackers because they've *been* attackers (in authorized contexts).
- **Defence makes you a better attacker** — understanding how detection works, how systems are hardened, and how defenders think makes you a more effective, realistic tester.
- **Purple teaming is the unity made explicit** — red and blue working together, the offensive tester's findings directly improving the defender's detection, in a loop. This is where the two sides are literally one team.

## The shared purpose

Crucially, authorized offensive security and defensive security **share a goal**: making systems more secure. The offensive tester attacks *so that* the defender can fix; the whole point of finding a way in is closing it. The report — the deliverable of every engagement — is where offence becomes defence: the compromise is converted into remediation. An attacker-for-hire who never improved anything would be pointless; the value is entirely in the defensive improvement the offence drives.

## The professional's identity

The mature offensive practitioner doesn't see themselves as "the attacker" opposed to "the defender". They see themselves as a security professional who happens to specialise in the offensive perspective, in service of the same goal as everyone else in the field. The adversarial framing (red vs blue) is a useful exercise structure, not a real opposition — both sides are defending the organisation, one by finding the holes and one by closing them.

## The frame that makes it legitimate

This unity is also what keeps offensive security ethical and legal: it exists to improve defence, on authorized targets, with the goal of fixing what's found. Detached from that — offence for its own sake, on unauthorized targets, without remediation — it's just crime. The unity with defence is not just a learning insight; it's the entire justification for the discipline. You learn to attack so that you, and the defenders you work with, can better defend. That is what offensive security *is*.`,
      sample: {
        lang: 'text',
        caption: 'Every offensive technique is a defensive finding in reverse',
        code: `OFFENCE (this track)          DEFENCE (the blue tracks)      Same...
------------------------------------------------------------------------
enumeration                <-> attack-surface management     surface
privilege escalation       <-> hardening (same checklist!)   misconfigs
lateral movement           <-> segmentation, no reuse        creds+trust
pivoting                   <-> segmentation, egress control  zone crossings
credential access          <-> strong hashing, MFA, secrets  secrets
persistence                <-> persistence hunting           hiding spots
C2 / evasion               <-> behavioural detection         behaviours
exploitation               <-> patching                      vulnerabilities

Same systems, same paths - one to exploit, one to close. The REPORT
is where offence becomes defence. Purple teaming is the unity made
explicit. The shared goal - more secure systems - is the whole point.`,
        output: `Offence and defence are the SAME knowledge toward the SAME goal:
every offensive technique here is a defensive finding in reverse,
and you learned both sides of each. Offence makes you a better
defender and vice versa; purple teaming is the unity made explicit;
the report converts compromise into remediation. Authorized
offence exists to IMPROVE defence - detached from that, it's just
crime. The unity is the discipline's entire justification.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the deepest reason that authorized offensive security and defensive security should be understood as the same profession rather than opposites?',
        options: [
          'Because they use completely different tools and knowledge',
          'Because they share the same knowledge (every offensive technique is a defensive finding in reverse) and the same goal (more secure systems) — the tester attacks so the defender can fix, the report converts compromise into remediation, and purple teaming makes the unity explicit; detached from improving defence, offence is just crime, so the unity is the discipline’s justification',
          'Because defenders are not allowed to understand attacks',
          'Because offensive work has no defensive value',
        ],
        answer: 1,
        explain:
          'Across this track, every offensive skill mirrored a defensive control — enumeration and attack-surface management, escalation and hardening (the identical checklist), lateral movement and segmentation, credential access and secrets management, persistence and persistence-hunting, C2/evasion and behavioural detection, exploitation and patching. They are the same knowledge applied to the same systems and paths, one to exploit and one to close, and they share one goal: more secure systems. Authorized offence exists precisely to drive defensive improvement — the report is where the compromise becomes remediation, and purple teaming is the two sides working as one. Detached from that purpose and from authorization, the same activity is simply crime, which is why the unity with defence is not merely a learning insight but the entire ethical and legal justification for the discipline.',
        hint: 'Do the two sides use different knowledge and pursue different goals, or the same knowledge toward the same goal — and what makes offence legitimate at all?',
      },
    },

    {
      id: 'rlin-p-11',
      title: 'Ethics, law and the profession',
      read: `Offensive security carries unusual power and unusual responsibility. The pro practitioner grounds their work in **ethics, law, and professional standards** — because the skills are dual-use and the line between professional and criminal is authorization plus intent. This has framed every level; here it's made explicit as the foundation of a career.

## The legal foundation, restated

Everything rests on **authorization**. Unauthorized access is a crime (CFAA, Computer Misuse Act, and global equivalents) regardless of intent, tooling, or later reporting. The professional works only within explicit written authorization and defined scope, and stays inside it absolutely — because a scope violation is not a technicality, it's potentially a crime. As your capability grows, this discipline matters more, not less.

## The ethical standards

Beyond the law, the profession has ethical norms:

- **Do no harm** — don't damage systems or data beyond the authorized scope; prove risk without causing it.
- **Confidentiality and discretion** — you see an organisation's deepest weaknesses and sensitive data; protecting that trust is paramount. Discretion is a core professional value.
- **Integrity and honesty** — report findings accurately (don't exaggerate or fabricate), and report honestly even when it's inconvenient (including your own mistakes, or a real compromise you find).
- **Responsible disclosure** — for research, the coordinated-disclosure ethics (get it fixed, don't exploit or sell).
- **Serve the defensive goal** — the purpose is improvement; work that doesn't serve that (offence for its own sake, gratuitous access) fails the ethical test even if technically authorized.

## Professional development

Offensive security is a fast-moving field requiring continuous learning:

- **Certifications** structure learning and signal capability: **OSCP** (the practical benchmark for pentesting), **OSEP/OSED** (advanced exploitation/exploit-dev), **CRTO** (red-team ops), **PNPT**, and others; **GIAC** and vendor certs too. They're a means, not an end — the skill matters more than the cert.
- **Continuous practice** — CTFs, platforms (HTB, TryHackMe), home labs, and bug bounties keep skills sharp legally.
- **Community** — the field shares knowledge openly (write-ups, tools, research, conferences like DEF CON/BSides); contributing and learning from it is part of the profession.
- **Staying current** — new vulnerabilities, techniques, defences, and tools constantly; the pro never stops learning.

## The career and its responsibilities

Offensive security careers span pentesting, red teaming, vulnerability research, exploit development, security consulting, and bug-bounty hunting, in consultancies, in-house teams, government, and independent work. All carry the same responsibility: the skills can cause real harm, so the professional's commitment to using them only ethically and legally is what makes the career legitimate. Reputation — built on trust, discretion, integrity, and reliability — is the currency; it's earned over time and lost instantly through a breach of ethics.

## The final frame

The knowledge in this track is powerful and dual-use — the same techniques a criminal uses. What makes you a security professional rather than a criminal is not the knowledge but the **framework around it**: authorization, ethics, the defensive purpose, and professional standards. Hold that framework, and offensive security is one of the most valuable things you can do for security — finding the weaknesses so they can be fixed, testing defences so they improve, and thinking like an attacker so you can defend against them. Lose it, and the same knowledge is simply crime. The discipline lives entirely inside that framework, and carrying it is the defining responsibility of the profession.`,
      sample: {
        lang: 'text',
        caption: 'What separates a security professional from a criminal',
        code: `Same knowledge, same tools, same techniques. The difference:

  AUTHORIZATION   only within explicit written scope; stay inside it absolutely
  ETHICS          do no harm, confidentiality/discretion, integrity/honesty,
                  responsible disclosure
  PURPOSE         serve the defensive goal - attack so it can be FIXED
  STANDARDS       professional norms, continuous learning, reputation

Career: pentest / red team / research / exploit dev / consulting / bounties.
Certs (OSCP, OSEP/OSED, CRTO...) structure learning - a means, not an end.
Reputation (trust, discretion, integrity) is the currency: earned slowly,
lost instantly.`,
        output: `The knowledge is powerful and dual-use - identical to a criminal's.
What makes you a PROFESSIONAL is the framework around it:
authorization, ethics, the defensive purpose, and professional
standards. Hold that framework and offensive security is among the
most valuable things you can do for security; lose it and the same
knowledge is just crime. The discipline lives entirely inside that
framework - carrying it is the defining responsibility.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Given that offensive security skills are identical to those a criminal uses, what actually makes someone a security professional rather than a criminal?',
        options: [
          'Possessing more advanced technical knowledge',
          'The framework around the knowledge — explicit authorization and staying strictly in scope, ethical standards (do no harm, confidentiality, integrity, responsible disclosure), the defensive purpose of driving remediation, and professional standards — because the skills and tools are the same; the framework is what makes their use legitimate',
          'Using commercial rather than free tools',
          'Working faster than criminals do',
        ],
        answer: 1,
        explain:
          'The techniques, tools and knowledge in this track are genuinely dual-use — indistinguishable from a criminal’s — so capability alone cannot be what separates a professional from a criminal. The distinction is entirely the framework surrounding the knowledge: acting only within explicit written authorization and never straying from scope (unauthorized access is a crime regardless of intent), adhering to ethical standards (do no harm, confidentiality and discretion, honesty, responsible disclosure), and orienting all of it toward the defensive purpose of getting weaknesses fixed. Hold that framework and offensive security is one of the most valuable contributions to security; abandon it and the same actions are simply crime. Carrying that framework is the defining responsibility of the profession.',
        hint: 'The skills are the same as a criminal’s. So it can’t be the skills — what surrounds them makes the difference?',
      },
    },

    {
      id: 'rlin-p-12',
      title: 'Capstone: lead a full engagement',
      read: `Tie the entire offensive Linux track together into what a senior practitioner does: plan and lead a **complete, professional engagement** — from scoping through adversary-emulating execution to a report and debrief that measurably improve the organisation's security. This capstone integrates every level: the ethics and method of the beginner, the technique of the amateur and intermediate, the professionalism of the skilled, and the frontier and leadership of the pro.

## The engagement, end to end

Treat a comprehensive lab environment (or an authorized enterprise-style range / pro-lab) as a client:

1. **Scope and plan** — understand the (simulated) client's real goals; choose the engagement type (say, a threat-informed red-team op with a purple debrief); write scope, rules of engagement, deconfliction, and authorization. Choose a relevant adversary to emulate and extract their TTPs.
2. **Reconnaissance** — extensive OSINT/passive recon, then targeted active enumeration.
3. **Initial access** — gain a foothold realistically (an authorized phishing scenario, or an external vulnerability), and establish resilient, OPSEC-conscious access.
4. **Post-exploitation campaign** — escalate (thinking in primitives, chaining), harvest credentials, pivot through segmented zones, move laterally, and reach the objective — looping the methodology and operating cleanly, covering cloud/CI surfaces where present.
5. **Actions on objectives** — achieve and demonstrate the goal within scope, without harm, handling data correctly.
6. **Measure detection** — throughout, note what the (simulated) blue team would detect at each stage, mapped to ATT&CK — the red-team assessment.
7. **Report and debrief** — deliver a full report: executive summary, attack narrative with path diagram and choke points, technical findings with specific remediation prioritised by real risk, and the detection-and-response assessment (ATT&CK coverage, gaps). Debrief both audiences.
8. **Close the loop** — recommend fixes, retest, and (purple) work with the defenders to build detection for the techniques used, then re-emulate to verify improvement.

## Do all of it professionally

Everything the track taught, together: stay strictly in scope and legal; keep meticulous notes; understand every step; operate with OPSEC and deconfliction; handle data ethically; escalate critical or real-compromise findings immediately; clean up; and communicate to drive remediation. The technical compromise is the means; the measurable security improvement is the end.

## The measure of a pro

You can lead a complete, authorized, adversary-emulating engagement that answers the questions the organisation actually cares about — "would we detect and stop a real attacker, and where are we weak?" — executed safely and ethically, and reported so clearly and actionably that the organisation is measurably more secure afterward, with the improvement verified by retesting and re-emulation.

## The whole arc

From the first lesson — that authorization is the entire difference between a professional and a criminal — through method, technique, professionalism, and the frontier, one truth has run through everything: **offensive security is authorized, ethical, method-driven testing whose entire purpose is to make systems more secure**, and every offensive technique is a defensive finding in reverse. The pro doesn't just compromise systems; they run engagements that improve organisations, think like the adversary so they can help defend against them, and hold the framework — authorization, ethics, defensive purpose — that makes the powerful, dual-use knowledge legitimate. That combination — deep technical capability, professional judgement, and unwavering ethical grounding, all in service of defence — is what a pro offensive-security practitioner is.

> Keep learning, keep it authorized, keep it aimed at defence. The knowledge is powerful; the responsibility is the point. You attack so that everyone can defend better — including yourself.`,
      sample: {
        lang: 'text',
        caption: 'A full engagement, integrating the whole track',
        code: `PLAN   real goals -> threat-informed red-team op + purple debrief;
       scope, RoE, deconfliction, authorization; pick an actor to emulate
RECON  OSINT + targeted enumeration
ACCESS realistic initial access -> resilient, OPSEC-conscious foothold
CAMPAIGN escalate (primitives/chains) -> creds -> pivot segmented zones ->
       lateral -> cloud/CI where present -> OBJECTIVE (demonstrated, no harm)
MEASURE what would be detected at each ATT&CK stage (red-team assessment)
REPORT exec summary + attack-path diagram + findings w/ remediation
       (risk-prioritised, choke points) + detection/response coverage
CLOSE  debrief both audiences; retest; PURPLE - build detection; re-emulate

Throughout: in scope, legal, noted, understood, OPSEC, data ethics,
escalate critical findings, clean up, communicate to DRIVE remediation.`,
        output: `The capstone integrates the whole track: plan and LEAD a scoped,
adversary-emulating engagement -> execute with technique and
professionalism -> measure detection -> report + debrief to DRIVE
remediation -> retest and purple to verify improvement. The
compromise is the means; measurable security improvement is the
end. Deep capability + professional judgement + ethical grounding,
all in service of defence - that is a pro. Keep it authorized,
aimed at defence. The responsibility is the point.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the ultimate measure of a professional offensive-security engagement, integrating everything in this track?',
        options: [
          'That the tester compromised the environment as fast as possible',
          'That it answered the organisation’s real questions (would we detect and stop a real adversary, and where are we weak?) — executed safely, ethically and within scope, and reported so clearly and actionably that the organisation became measurably more secure, with improvement verified by retesting and re-emulation',
          'That the tester used the most advanced exploits available',
          'That the tester avoided writing any report',
        ],
        answer: 1,
        explain:
          'The entire track builds to this: the compromise is only the means, and the end is a measurable improvement in the organisation’s security. A professional engagement is scoped to the client’s real concerns, executed with technique but also with safety, ethics, OPSEC and strict adherence to authorization, and — decisively — reported and debriefed so clearly and actionably (executive and technical, prioritised by real risk, with the detection-and-response assessment) that remediation actually happens, then verified by retesting and, in a purple loop, re-emulation. Speed, exploit sophistication, or the raw fact of "getting in" are not the measure; whether the organisation is genuinely, measurably more secure afterward is. That, delivered within the framework of authorization and ethics that makes the work legitimate, is what a pro offensive-security practitioner achieves — offence in the full service of defence.',
        hint: 'Is the goal to break in impressively, or to leave the organisation measurably more secure — verified?',
      },
    },
  ],
}

export default level
