import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Engineering defence: hardening at scale',
  summary:
    'Move from defending one box by hand to engineering defence that holds. Threat modelling, kernel and syscall hardening, container isolation, secrets and TLS, automated benchmarking, runtime detection with eBPF, threat intelligence with YARA, deception, and ransomware-resilient backups.',
  outcomes: [
    'Threat-model a system and reduce its attack surface deliberately',
    'Harden the kernel with sysctl and confine programs with seccomp',
    'Reason about container isolation and its limits',
    'Manage secrets and configure TLS the way a defender should',
    'Automate hardening and measure it against a benchmark',
    'Detect at runtime with eBPF, hunt with YARA, and survive ransomware',
  ],
  steps: [
    {
      id: 'blin-s-01',
      title: 'Threat modelling and attack surface',
      read: `Hardening without a threat model is guessing. **Threat modelling** is the disciplined version of "what could go wrong here?" — done before you write a single firewall rule, so your effort lands where the risk actually is.

## A workable method

For any system, ask four questions (this is the core of Adam Shostack's approach):

1. **What are we building?** — draw the data flow: what talks to what, where the trust boundaries are.
2. **What can go wrong?** — walk **STRIDE**: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.
3. **What are we going to do about it?** — a mitigation for each credible threat.
4. **Did we do a good job?** — review it; threat models are living documents.

## Attack surface

The **attack surface** is the sum of all the points an attacker can interact with: open ports, running services, exposed APIs, input fields, installed packages, user accounts. The single most reliable way to be more secure is to make the surface **smaller**:

- Uninstall software you do not use — every package is code that can have a CVE.
- Close ports you do not need — \`ss -tulpn\` shows what is listening; if nothing should answer there, stop the service.
- Remove accounts and disable unused features.

## Why this comes first

A control that protects a service you did not need to run is wasted work. Threat modelling tells you what to remove entirely (best), what to protect, and what risk you are knowingly accepting. It turns "harden everything" into "harden the things that matter, in priority order".`,
      sample: {
        lang: 'bash',
        caption: 'Measuring the attack surface: what is listening, and why',
        code: `sudo ss -tulpn | grep LISTEN`,
        output: `tcp LISTEN 0.0.0.0:22   users:(("sshd"))        <- needed: remote admin
tcp LISTEN 0.0.0.0:80   users:(("nginx"))       <- needed: the web app
tcp LISTEN 0.0.0.0:5432 users:(("postgres"))    <- WHY public? DB should be localhost
tcp LISTEN 0.0.0.0:25   users:(("exim4"))       <- do we send mail? if not, remove
tcp LISTEN 0.0.0.0:3306 users:(("mysqld"))      <- a second DB nobody uses?`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A database is listening on `0.0.0.0:5432` (all interfaces) but is only used by the web app on the same host. From an attack-surface view, what is the best fix?',
        options: [
          'Add a stronger database password and leave it public',
          'Bind it to localhost (127.0.0.1) so it is not reachable from the network at all — removing the exposure entirely beats defending it',
          'Move it to a non-standard port',
          'Nothing; databases are meant to be public',
        ],
        answer: 1,
        explain:
          'If only the local app needs the database, exposing it to the whole network is pure attack surface with no benefit. Binding to 127.0.0.1 makes it unreachable remotely, so brute-force, exploits and misconfig scans simply cannot reach it. Reducing surface (making the thing unreachable) is stronger than adding a control on a thing that stays reachable.',
        hint: 'Which is more robust: defending an exposed service, or not exposing it?',
      },
    },

    {
      id: 'blin-s-02',
      title: 'Kernel hardening with sysctl',
      read: `Below your services sits the kernel, and it exposes hundreds of tunable parameters through **sysctl**. A handful materially change how hard the box is to attack. These are set in \`/etc/sysctl.d/*.conf\` and applied with \`sysctl -p\`.

## Network-facing settings

- \`net.ipv4.conf.all.rp_filter = 1\` — reverse-path filtering; drop spoofed source addresses.
- \`net.ipv4.tcp_syncookies = 1\` — survive SYN-flood DoS.
- \`net.ipv4.conf.all.accept_redirects = 0\` and \`send_redirects = 0\` — ignore ICMP redirects (a classic MITM trick).
- \`net.ipv4.conf.all.accept_source_route = 0\` — refuse source-routed packets.

## Exploit-mitigation settings

- \`kernel.randomize_va_space = 2\` — full **ASLR**, so memory addresses are unpredictable and harder to exploit.
- \`kernel.kptr_restrict = 2\` — hide kernel pointers from userspace, denying an attacker leaks that defeat KASLR.
- \`kernel.dmesg_restrict = 1\` — stop non-root reading the kernel log (which leaks addresses and activity).
- \`kernel.yama.ptrace_scope = 1\` — restrict \`ptrace\`, so one process cannot trivially read another's memory (credential theft).

## Why a defender learns these

Attackers rely on predictable memory (defeated by ASLR), on reading kernel addresses (defeated by kptr_restrict), and on tricks like ICMP redirects. Each sysctl closes a class of technique cheaply and system-wide. They belong in your baseline image so every host ships hardened, not just the ones you remembered.`,
      sample: {
        lang: 'bash',
        caption: 'A kernel-hardening drop-in, applied and verified',
        code: `cat /etc/sysctl.d/60-hardening.conf
sudo sysctl -p /etc/sysctl.d/60-hardening.conf
sysctl kernel.randomize_va_space`,
        output: `kernel.randomize_va_space = 2
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
...
kernel.randomize_va_space = 2   <- full ASLR active`,
      },
      question: {
        kind: 'fill',
        prompt:
          'Which sysctl parameter, set to `2`, enables full Address Space Layout Randomization so memory addresses are unpredictable and memory-corruption exploits are harder? (Give just the parameter name.)',
        placeholder: 'kernel.some_parameter',
        accept: ['kernel.randomize_va_space', 'randomize_va_space'],
        explain:
          '`kernel.randomize_va_space = 2` turns on full ASLR — the stack, heap, libraries and executable base are all randomized each run. An attacker who cannot predict where code and data live cannot reliably jump to them, which breaks or greatly complicates many memory-corruption exploits.',
        hint: 'It "randomizes" the "virtual address space".',
      },
    },

    {
      id: 'blin-s-03',
      title: 'seccomp: shrinking what a program can ask the kernel',
      read: `Every program talks to the kernel through **syscalls** — \`open\`, \`read\`, \`execve\`, \`socket\`, and ~350 more. Most programs use only a few dozen. **seccomp** (secure computing mode) lets a process (or the system, for it) declare "these are the only syscalls I will ever make; kill me if I try another."

## Why it is powerful

An exploit that hijacks a program usually needs syscalls the program never normally uses — \`execve\` to launch a shell, \`socket\`/\`connect\` to phone home, \`ptrace\` to inject into another process. A tight seccomp filter means the very first forbidden syscall the exploit attempts terminates the process. The attacker's code is running, but it cannot *do* anything.

## Where you meet it

- **systemd** exposes it declaratively: \`SystemCallFilter=@system-service\` in a unit allows a sane baseline and denies the rest; \`SystemCallFilter=~@privileged @mount\` explicitly blocks dangerous groups.
- **Container runtimes** apply a default seccomp profile to every container.
- **Applications** (browsers, OpenSSH) call \`seccomp\` on themselves to sandbox risky components.

## The defender's use

You do not usually write raw BPF filters by hand. You harden services through systemd unit settings and keep container default profiles enabled. The concept to internalise: **least privilege at the syscall level** — the same principle as file permissions and sudo, pushed all the way down to the kernel interface.`,
      sample: {
        lang: 'toml',
        caption: 'Hardening a service via systemd (drop-in unit override)',
        code: `# /etc/systemd/system/webapp.service.d/harden.conf
[Service]
# only allow the syscalls a normal service needs
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources @mount
# reinforce with other sandboxing
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes`,
        output: `# systemctl daemon-reload && systemctl restart webapp
# if the exploited app now calls execve()/ptrace(),
# seccomp kills it: "Main process exited, code=killed, status=SYS"`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does a tight seccomp filter limit the damage of a successful code-execution exploit in a service?',
        options: [
          'It prevents the exploit from running at all',
          'It restricts the process to a small allow-list of syscalls, so when the exploit tries a syscall the service never normally uses (like execve to spawn a shell), the kernel kills the process — the attacker runs but cannot act',
          'It encrypts the process memory',
          'It only affects networking',
        ],
        answer: 1,
        explain:
          'seccomp does not stop the initial exploit; it constrains what the hijacked process may ask the kernel to do. Since post-exploitation almost always needs syscalls outside the program\'s normal set (spawn a shell, open a socket, inject into another process), the filter turns "arbitrary code execution" into "code that gets killed the moment it tries to do harm". Least privilege at the syscall boundary.',
        hint: 'The exploit still runs — but what does it need the kernel to let it do next, and can it?',
      },
    },

    {
      id: 'blin-s-04',
      title: 'Container isolation, and its limits',
      read: `Containers (Docker, Podman) package an app with its dependencies and run it isolated from the host — but the isolation is *not* a virtual machine. Understanding what it is, and is not, is a core skilled-defender topic.

## What actually isolates a container

- **Namespaces** — give the container its own view of PIDs, the network, mounts, users. Its "process 1" is not the host's.
- **cgroups** — cap CPU, memory and I/O so one container cannot starve the host.
- **Capabilities, seccomp, AppArmor/SELinux** — drop most of root's powers and filter syscalls by default.

The crucial fact: **all containers share the host kernel.** A kernel exploit from inside a container can escape to the host. A VM has its own kernel; a container does not.

## The common, dangerous mistakes

- \`--privileged\` — disables almost all the protections above. A privileged container is close to being root on the host. Treat its use as a finding.
- **Mounting the Docker socket** (\`/var/run/docker.sock\`) into a container — lets that container start new containers, including one that mounts the whole host filesystem. Equivalent to host root.
- **Running as root inside the container** — combined with any escape, this is host root. Use a non-root \`USER\`.

## The defender's checklist

Run as non-root, drop capabilities (\`--cap-drop=ALL\` then add back only what is needed), keep the default seccomp profile, never \`--privileged\` without a very good reason, never mount the docker socket into an untrusted container, and keep the host kernel patched — because the kernel is the shared wall everything leans on.`,
      sample: {
        lang: 'bash',
        caption: 'A hardened container run vs. the dangerous one',
        code: `# DANGEROUS — near-host-root:
docker run --privileged -v /var/run/docker.sock:/var/run/docker.sock app

# HARDENED — least privilege:
docker run \\
  --user 1000:1000 \\
  --cap-drop=ALL \\
  --security-opt=no-new-privileges \\
  --read-only \\
  --pids-limit=100 \\
  app`,
        output: `# audit running containers for the red flags:
docker inspect -f '{{.Name}} priv={{.HostConfig.Privileged}}' $(docker ps -q)
/web priv=false
/legacy priv=true      <- investigate: why is this privileged?`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is mounting `/var/run/docker.sock` into a container roughly equivalent to giving it root on the host?',
        options: [
          'The socket contains the root password',
          'Access to the Docker socket lets the container control the Docker daemon (which runs as root), so it can launch a new container that mounts the entire host filesystem and act as host root',
          'It only lets the container see other containers\' names',
          'It is not dangerous at all',
        ],
        answer: 1,
        explain:
          'The Docker daemon runs as root and does whatever the socket tells it. A container with the socket can ask the daemon to start a new privileged container mounting `/` from the host — and then read or write any host file as root. That is why the docker socket must never be exposed to an untrusted container.',
        hint: 'What runs as root and will do whatever that socket asks — and what could it be asked to start?',
      },
    },

    {
      id: 'blin-s-05',
      title: 'Secrets: keeping credentials out of reach',
      read: `Applications need passwords, API keys and tokens. Where those live is one of the most common real-world failures — secrets in git history, in world-readable config, baked into container images, printed in logs.

## The rules

1. **Never commit secrets to source control.** git remembers forever; a key pushed once is compromised even if you delete it in the next commit. Scan repos with \`gitleaks\` or \`trufflehog\`. If one leaks, **rotate it** — deletion is not enough.
2. **Never bake secrets into container images.** \`docker history\` and image layers expose them. Inject at runtime.
3. **Keep secret files tight.** \`chmod 600\`, owned by the service account, never world-readable. And keep them out of the web root.
4. **Prefer a secrets manager.** HashiCorp Vault, cloud KMS/Secrets Manager, or systemd \`LoadCredential=\` deliver secrets to the process without them sitting on disk in plain text, and give you rotation and audit.

## Environment variables: better than files, not perfect

Env vars keep secrets out of the code, but they are readable via \`/proc/<pid>/environ\` by root and can leak into logs and crash dumps and child processes. They are a step up from hardcoding, not the finish line.

## Rotation is the point

Assume every secret will eventually leak. The defensive posture is not "make leaks impossible" but "make a leaked secret worthless quickly": short lifetimes, automated rotation, and per-service credentials so one leak does not open everything. A secret you can rotate in minutes is a manageable incident; a shared, hardcoded, never-rotated one is a catastrophe waiting.`,
      sample: {
        lang: 'bash',
        caption: 'Finding a committed secret — and why deleting it is not enough',
        code: `gitleaks detect --source . -v`,
        output: `Finding:     AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG..."
File:        config/settings.py
Commit:      3f9a1c2  (4 months ago)
Author:      dev@example.com

# It has been in history for 4 months and is on every clone
# and fork. The ONLY safe response: rotate the key now, then
# purge history. Removing the line in a new commit does nothing.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A scanner finds an API key that was committed to git four months ago. You remove the line in a new commit. Is the key safe now?',
        options: [
          'Yes — the line is gone',
          'No — the key still exists in git history and on every clone, fork and backup, so anyone with the repo can recover it; the only safe response is to rotate (revoke and reissue) the key, then purge the history',
          'Yes, once you push the new commit',
          'It was never a risk',
        ],
        answer: 1,
        explain:
          'git preserves history: the old commit (and thus the key) lives on in the repo and in every copy anyone has pulled. Deleting the line in a later commit changes nothing about the leaked value. You must assume it is compromised and rotate it, then rewrite history to remove it from the record. "Rotate, don\'t just delete" is the rule for any leaked secret.',
        hint: 'Where does git keep old versions, and who already has a copy?',
      },
    },

    {
      id: 'blin-s-06',
      title: 'TLS and certificates for defenders',
      read: `TLS (what puts the S in HTTPS) protects data in transit — confidentiality and integrity on the wire, plus authentication of the server. A defender does not need to implement crypto, but must configure and reason about it correctly.

## What a certificate actually proves

A certificate binds a public key to a name (\`example.com\`) and is signed by a **Certificate Authority** the client trusts. When you connect, the server proves it holds the matching private key. This stops an attacker impersonating the server — *if* the chain validates. A browser warning ("certificate invalid") means that proof failed; teaching users to click through it trains them to ignore exactly the signal that catches a MITM.

## Configuration that matters

- **Protocol versions** — disable SSLv3, TLS 1.0 and 1.1 (all broken/deprecated). Allow TLS 1.2 and 1.3.
- **Cipher suites** — prefer modern AEAD ciphers; drop RC4, 3DES, export ciphers.
- **HSTS** — the \`Strict-Transport-Security\` header tells browsers "only ever reach me over HTTPS", defeating downgrade/stripping attacks.
- **Certificate lifetime & automation** — short-lived certs via **Let's Encrypt**/ACME, auto-renewed, so an expired cert never causes an outage (or worse, a "just click through" habit).

## The private key is everything

If the server's private key leaks, an attacker can impersonate the site and decrypt captured traffic (unless forward secrecy applies). Protect it like the crown jewel it is: \`chmod 600\`, owned by root or the service, never in the web root, never in git. Test your config against a scanner (\`testssl.sh\`, SSL Labs) and treat a downgrade to a weak protocol as a finding.`,
      sample: {
        lang: 'bash',
        caption: 'Auditing a TLS endpoint for weak protocols and expiry',
        code: `# what protocols/ciphers does it accept?
nmap --script ssl-enum-ciphers -p 443 example.com | head -12
# when does the cert expire?
echo | openssl s_client -connect example.com:443 2>/dev/null \\
  | openssl x509 -noout -dates -subject`,
        output: `| TLSv1.0: (weak)      <- DISABLE: TLS 1.0 is deprecated/broken
| TLSv1.2:
|   ciphers: TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 (secure)
| TLSv1.3:
notBefore=Apr  1 00:00:00 2024 GMT
notAfter=Jun 30 23:59:59 2024 GMT     <- renew before this
subject=CN = example.com`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Users report a "certificate invalid" browser warning on your site and have learned to click "proceed anyway". Why is normalising that click a serious security problem?',
        options: [
          'It slows down page loads',
          'The certificate warning is the exact signal that would flag a man-in-the-middle attack; training users to click through it means they will also click through a real interception, defeating the authentication TLS provides',
          'Warnings never indicate real problems',
          'It only affects the server, not users',
        ],
        answer: 1,
        explain:
          'Certificate validation is what proves you are talking to the real server and not an interceptor. The warning fires whenever that proof fails — including during an active MITM. Users conditioned to dismiss it will dismiss the genuine attack too. Fix the certificate so the warning is rare and meaningful, rather than teaching people to ignore it.',
        hint: 'What real attack produces the same warning as a misconfigured cert?',
      },
    },

    {
      id: 'blin-s-07',
      title: 'Automating hardening and measuring it',
      read: `Hardening one host by hand does not scale and does not stay done. Skilled defence is **automated and measured**: every host is configured from code, and you can prove, on demand, how each one measures against a standard.

## Configuration as code

Tools like **Ansible** describe the desired state ("SSH root login disabled, these sysctls set, auditd installed with these rules") in version-controlled files and enforce it across every host. Benefits for security specifically:

- **Consistency** — no host is forgotten or hand-tweaked into a snowflake.
- **Auditability** — the config is in git, reviewed, with history.
- **Drift detection** — re-running reports (and fixes) anything that has changed from the baseline.

## Measuring against a benchmark

The **CIS Benchmarks** are consensus hardening standards; **OpenSCAP** (\`oscap\`) scans a host against a profile (CIS, STIG, PCI) and produces a scored report of pass/fail per rule, with remediation. Now "is this box hardened?" has a number and a list, not an opinion.

## The loop

1. Define the baseline as code (Ansible role, or an OpenSCAP-remediated image).
2. Apply it to every host automatically.
3. Scan regularly with OpenSCAP; alert on regressions.
4. Feed new findings back into the baseline so every host improves at once.

This is the difference between "we hardened the servers" (a one-time hope) and "every host is continuously enforced to a measured standard and drift is caught" (a control you can trust and evidence to an auditor).`,
      sample: {
        lang: 'bash',
        caption: 'Scoring a host against the CIS benchmark with OpenSCAP',
        code: `sudo oscap xccdf eval \\
  --profile cis_level1_server \\
  --results scan.xml --report report.html \\
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml \\
  | grep -E 'Title|Result' | head`,
        output: `Title   Ensure SSH root login is disabled
Result  pass
Title   Ensure auditd is installed
Result  fail        <- remediate, then re-scan
Title   Ensure IPv4 forwarding is disabled
Result  pass
...
Score 78.4%   ->  fix the fails, target 95%+`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is enforcing host configuration with a tool like Ansible more secure than hardening each server by hand?',
        options: [
          'Ansible servers are immune to attack',
          'It makes the baseline consistent across every host, version-controlled and reviewable, and lets you detect and correct drift — so no host is forgotten, hand-tweaked into a weak state, or silently changed',
          'It removes the need for any other controls',
          'It only works on new servers',
        ],
        answer: 1,
        explain:
          'Manual hardening produces snowflakes: some hosts are missed, some are tweaked and never reverted, and you cannot prove the current state. Config-as-code applies one reviewed baseline everywhere, keeps history, and detects/repairs drift. Security that is consistent and continuously enforced beats security that depends on remembering.',
        hint: 'What goes wrong across fifty servers when each is configured by hand?',
      },
    },

    {
      id: 'blin-s-08',
      title: 'Runtime detection with eBPF',
      read: `File-integrity monitoring and log analysis are periodic or after-the-fact. **eBPF** lets you watch the kernel's activity **live** — every process spawn, file open, network connection — with almost no overhead, and alert the instant something matches an attack pattern.

## What eBPF is

eBPF runs small, safe, verified programs inside the kernel that observe events as they happen. It is the technology under modern observability and security tooling. You rarely write raw eBPF; you use tools built on it.

## Falco: rules for live behaviour

**Falco** is the standard eBPF-based runtime security tool. You write (or use) rules describing suspicious behaviour, and it fires the moment the behaviour occurs:

- "a shell was spawned inside a container" — containers should run one app, not \`bash\`.
- "a process wrote to \`/etc/passwd\`" outside the package manager.
- "an outbound connection from a database container" — DBs answer, they don't dial out.
- "a binary in \`/tmp\` executed."

## Why this changes detection

Instead of finding the reverse shell tomorrow in the logs, Falco alerts as \`bash\` spawns under \`nginx\` *now*. It sees behaviour the attacker cannot avoid — they have to spawn processes, open files and make connections to do anything. Log tampering does not help them, because eBPF observes the syscalls directly, upstream of any log the attacker could edit.

## The mindset

Detection engineering is writing rules for **behaviour that is abnormal for this system**. The best rules encode "this thing should never happen here" — a web container spawning a shell, a service account running a compiler — so a true positive is almost always a real incident.`,
      sample: {
        lang: 'text',
        caption: 'A Falco rule and the alert it produces',
        code: `# rule (YAML): shell in a container is suspicious
- rule: Terminal shell in container
  condition: >
    container and proc.name in (bash, sh, zsh)
    and evt.type = execve
  output: "Shell spawned in container
    (user=%user.name container=%container.name
    cmd=%proc.cmdline)"
  priority: WARNING`,
        output: `14:52:10 WARNING Shell spawned in container
  (user=root container=web-frontend
   cmd=bash -i)
# nginx never runs bash. This fired the instant the
# attacker's reverse shell executed — not tomorrow.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can an eBPF-based tool like Falco detect an attacker even when they have root and are editing logs to cover their tracks?',
        options: [
          'It hides the logs from the attacker',
          'It observes kernel events (process spawns, file opens, connections) directly as they happen, upstream of the log files — so tampering with logs afterwards does not remove the alert that already fired on the behaviour',
          'It prevents the attacker from getting root',
          'It encrypts all system activity',
        ],
        answer: 1,
        explain:
          'Falco watches the syscalls themselves in the kernel. The alert fires at the moment the suspicious behaviour occurs and is shipped off immediately, so editing `/var/log` later cannot recall it. And attackers cannot avoid the behaviour — to act they must spawn processes and open files, which is exactly what eBPF sees. Behaviour-based detection is hard to evade.',
        hint: 'Where does eBPF observe, relative to where logs are written?',
      },
    },

    {
      id: 'blin-s-09',
      title: 'Threat intelligence and YARA',
      read: `Detection improves when you know what you are looking for. **Threat intelligence** is knowledge about attackers — their tools, infrastructure and techniques — turned into things you can actually match against your environment.

## Indicators of Compromise (IOCs)

Concrete artefacts that signal a specific threat: a malicious file's hash, a command-and-control IP or domain, a mutex name, a specific filename or registry key. You feed IOCs into your tooling (SIEM, EDR, firewall) to flag or block known-bad. IOCs are cheap and precise but brittle — attackers change a hash or an IP easily.

## TTPs and ATT&CK

More durable is knowing **Tactics, Techniques and Procedures** — *how* an attacker behaves, catalogued in **MITRE ATT&CK**. "Uses scheduled tasks for persistence", "dumps credentials from LSASS". TTPs are harder for an attacker to change than an IP, so detections written against behaviour age better than IOC lists.

## YARA: pattern-matching for files

**YARA** rules describe byte and string patterns that identify malware families. You scan files (or memory) and YARA tells you which rule matched:

- Strings unique to a malware family
- Combinations ("these three strings AND this header")
- Used by responders to sweep a fleet for a known implant

## Putting it together

A mature defender consumes threat-intel feeds (IOCs), writes and collects YARA rules for relevant malware, and maps their detections to ATT&CK so they can see which techniques they can catch and where the gaps are. Intelligence turns generic monitoring into "we specifically detect the threats that target organisations like ours."`,
      sample: {
        lang: 'bash',
        caption: 'A YARA rule and a fleet sweep with it',
        code: `cat webshell.yar`,
        output: `rule PHP_WebShell {
  meta:
    description = "Generic PHP web shell markers"
  strings:
    $a = "eval(" nocase
    $b = "base64_decode(" nocase
    $c = /\\$_(GET|POST|REQUEST)\\[/
  condition:
    filesize < 50KB and 2 of them
}

$ yara -r webshell.yar /var/www
/var/www/uploads/img.php   <- PHP shell hiding as an image upload`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do detections written against an attacker\'s TTPs (behaviours, per MITRE ATT&CK) tend to last longer than detections based on IOCs like file hashes and IP addresses?',
        options: [
          'IOCs are always wrong',
          'An attacker can trivially change a hash, domain or IP to evade an IOC match, but changing their underlying technique (how they persist, escalate or move) is much harder — so behaviour-based detections keep working across campaigns',
          'TTPs are easier to write',
          'Hashes cannot be computed reliably',
        ],
        answer: 1,
        explain:
          'IOCs are specific artefacts that attackers rotate cheaply — recompile for a new hash, spin up a new C2 IP. TTPs describe the method itself, which is baked into their tooling and tradecraft and costly to change. Detecting "credential dumping from LSASS" catches many variants; detecting one malware hash catches exactly one build. Both have a place, but behaviour ages better.',
        hint: 'Which is cheaper for the attacker to change: a file hash, or how they operate?',
      },
    },

    {
      id: 'blin-s-10',
      title: 'Deception: honeypots and canary tokens',
      read: `Most detection waits for an attacker to trip a rule. **Deception** flips it: you plant things that have *no legitimate use*, so any interaction with them is, by definition, suspicious — a near-zero-false-positive alarm.

## Canary tokens

A **canary token** is a tripwire: a resource that pings you when touched. Examples:

- A fake AWS key in a config file — if it is ever *used*, you know that file was stolen, and you see the attacker's IP.
- A document (\`passwords.docx\`, \`salaries.xlsx\`) that phones home when opened.
- A URL or DNS name that alerts on any request.

No employee has a reason to use the fake key or open the bait file, so an alert is almost always a real intrusion. Canarytokens.org offers these free; you can also roll your own.

## Honeypots

A **honeypot** is a whole fake system — a decoy SSH server, database or service — that exists only to be attacked. Because nothing legitimate talks to it, every connection is hostile and worth studying. Honeypots reveal:

- That an attacker is *inside* your network probing around (an internal honeypot is a superb lateral-movement detector).
- The attacker's tools and techniques, safely, on a system with nothing real to lose.

## Why deception is high-value

Detection engineering fights false positives; deception sidesteps them. A canary in your most sensitive share, or a honeypot on your internal network, produces alerts that are almost always true and often catch an intruder early — before they reach anything real. Cheap to deploy, loud when it matters, quiet otherwise.`,
      sample: {
        lang: 'bash',
        caption: 'A deliberately tempting canary — any use is an alert',
        code: `# a fake key placed in a plausible spot, that alerts if ever used
cat /home/deploy/.aws/credentials`,
        output: `[default]
aws_access_key_id = AKIACANARY0EXAMPLE1
aws_secret_access_key = wJalrCanaryTokenFEMI/EXAMPLEKEY

# No script uses this key. The moment it appears in AWS
# CloudTrail as an API call, you know:
#  - that file was exfiltrated
#  - the attacker's source IP and the time
# ...with essentially zero false positives.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes a canary token (like a fake API key no real system uses) such a low-false-positive detection?',
        options: [
          'It blocks the attacker automatically',
          'Because nothing legitimate ever uses it, any interaction with it is almost certainly an attacker who found and tried it — so an alert strongly implies a real compromise rather than benign activity',
          'It encrypts sensitive files',
          'It is only useful on the public internet',
        ],
        answer: 1,
        explain:
          'The power of deception is that the bait has no legitimate purpose. A real key gets used by real scripts (noise); a canary key is used by nobody — so a single use is a high-confidence signal of an intruder, complete with their IP and timing. You get a near-certain true positive precisely because you engineered the thing to be untouched in normal operation.',
        hint: 'Who, other than an attacker, would ever touch a resource that has no legitimate use?',
      },
    },

    {
      id: 'blin-s-11',
      title: 'Backups that survive ransomware',
      read: `The last line of defence against ransomware, destructive attacks and your own mistakes is a backup you can actually restore from. Modern attackers know this — so they hunt for and **destroy backups before** they encrypt, or encrypt slowly so the corruption spreads into the backups. A backup strategy has to assume the attacker is trying to defeat it.

## The 3-2-1 rule (and the newer 3-2-1-1-0)

- **3** copies of the data
- on **2** different media/types
- with **1** copy **off-site**
- **1** copy **offline or immutable** (the anti-ransomware part)
- **0** errors — because a backup you have never test-restored is a hope, not a backup.

## Immutable and offline

The copy that beats ransomware is one the attacker's compromised credentials **cannot delete or alter**:

- **Offline** — physically disconnected (tape, a drive taken off-site). Malware cannot reach what is unplugged.
- **Immutable / WORM** — object storage with an object-lock/retention policy, so even an admin account cannot delete it until the retention period expires.
- **Separate credentials** — the backup system must not be reachable with the same domain admin account the attacker just stole. If one compromise reaches both production and backups, you have one copy, not a backup.

## Test restores

Ransomware incidents routinely become disasters not because there were no backups, but because the backups did not restore — untested, incomplete, or themselves encrypted. Schedule real restore drills. The "0 errors" is the whole point: verified, restorable backups are what turn a ransomware attack from a company-ending event into a bad weekend.`,
      sample: {
        lang: 'text',
        caption: 'Why credential separation decides ransomware outcomes',
        code: `Attacker steals a domain admin account, then:

  Production servers   -> reachable with that account -> ENCRYPTED
  Backup server        -> same domain admin account   -> DELETED
  Result: no recovery. "We had backups" but one credential reached both.

vs.

  Immutable object-lock backup, separate credentials, off-site copy
  -> attacker's stolen account cannot touch it -> RESTORE SUCCEEDS`,
        output: `The decisive question is not "do we have backups?"
but "can the credentials the attacker just stole
reach and destroy them?" If yes, it is not a backup.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the 3-2-1-1-0 strategy, what specifically defeats ransomware that has stolen admin credentials, and why?',
        options: [
          'Having three copies on the same server',
          'The offline or immutable copy with separate credentials — because it cannot be reached, altered or deleted with the compromised account, so the attacker who encrypts production cannot also destroy the backup',
          'Encrypting the backups with the same key as production',
          'Keeping all backups online for fast restore',
        ],
        answer: 1,
        explain:
          'Ransomware crews delete or encrypt reachable backups first. The copy that survives is the one the stolen credentials physically or logically cannot touch: offline (unplugged) or immutable (object-lock/WORM), managed with separate credentials. Multiple online copies under the same admin account are all destroyed by one compromise. And every copy is worthless until a test restore proves it works — the "0 errors".',
        hint: 'If one stolen account can reach both production and the backups, how many real backups do you have?',
      },
    },

    {
      id: 'blin-s-12',
      title: 'Project: a hardening baseline and a detection rule',
      read: `Bring the level together by producing the two artefacts a skilled defender is judged on: a **hardening baseline** (applied automatically to every host) and a **detection rule** (that fires on real attacker behaviour).

## Part 1 — the baseline (config as code)

Capture, as repeatable configuration, the decisions from this level:

- Attack surface reduced (only needed ports/services), DB bound to localhost.
- Kernel hardened via a \`sysctl.d\` drop-in (ASLR, kptr_restrict, network settings).
- Services confined with systemd sandboxing (\`SystemCallFilter\`, \`NoNewPrivileges\`, \`ProtectSystem\`).
- auditd with the identity/exec/module rules, \`-e 2\`, forwarding off-host.
- AIDE initialised, database stored off-host.
- CIS-scored with OpenSCAP; fails triaged.

## Part 2 — a detection rule

Write one behaviour-based rule for "something that should never happen here". The example below: a service account spawning an interactive shell. It is specific, high-signal, and hard for an attacker to avoid.

## The measure of success

A junior defender hardens a box. A skilled one produces a **baseline that hardens every box the same way, provably**, plus **detections that catch the behaviours attackers cannot skip** — and can show, with an OpenSCAP score and a fired alert, that both work. That is defence engineered, not improvised.

> Keep both in version control, review changes like code, and re-scan on a schedule. Security that is written down, applied automatically, and measured is the security that is still there next quarter.`,
      sample: {
        lang: 'text',
        caption: 'A detection rule mapped to ATT&CK, and the baseline it complements',
        code: `# Detection (Falco-style): service account should never get a shell
- rule: Service account interactive shell
  condition: >
    evt.type=execve and proc.name in (bash,sh,zsh,dash)
    and user.name in (www-data, postgres, redis, nginx)
  output: "Service account got a shell
    (user=%user.name cmd=%proc.cmdline parent=%proc.pname)"
  priority: CRITICAL
  tags: [T1059]   # ATT&CK: Command and Scripting Interpreter`,
        output: `# One-line self-check that the baseline stuck:
sysctl kernel.randomize_va_space   # -> 2
auditctl -s | grep enabled         # -> enabled 2 (immutable)
ss -tulpn | grep 5432              # -> 127.0.0.1:5432 only
oscap ... | grep Score             # -> Score 96.1%`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes a skilled defender\'s output from a beginner hardening a single box by hand?',
        options: [
          'They use more expensive tools',
          'They produce a version-controlled baseline applied automatically to every host and measured against a benchmark, plus behaviour-based detections mapped to attacker techniques — repeatable, provable defence rather than a one-time manual effort',
          'They disable more features',
          'They never need backups',
        ],
        answer: 1,
        explain:
          'The step up is from artisanal to engineered: config-as-code so every host is hardened identically and drift is caught, an OpenSCAP score so "hardened" is a number, and detections written against unavoidable attacker behaviour (mapped to ATT&CK) so you know what you can catch. It is defence you can apply at scale, verify, and hand to the next person — not something that lives only in one admin\'s memory.',
        hint: 'Think repeatable, measurable and provable versus one-time and manual.',
      },
    },
  ],
}

export default level
