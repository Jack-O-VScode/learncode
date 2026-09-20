import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Scanning, enumeration and capture in depth',
  summary:
    'Go beyond a basic scan: nmap scan types and timing, the Nmap Scripting Engine, deep enumeration of SMB, SNMP, DNS and SMTP, real traffic analysis with Wireshark, why a switched network hides traffic, and the first interception attacks — ARP and man-in-the-middle — plus harvesting credentials and network password attacks. Every technique is practised only on your own lab or networks you are authorized to test.',
  outcomes: [
    'Choose nmap scan types and timing for the situation',
    'Use the Nmap Scripting Engine to enumerate and check for vulnerabilities',
    'Enumerate SMB, SNMP, DNS and SMTP in depth',
    'Analyse captured traffic with Wireshark display filters',
    'Explain why a switch limits sniffing and how ARP spoofing defeats it',
    'Perform network password attacks and harvest captured credentials',
  ],
  steps: [
    {
      id: 'rnet-a-01',
      title: 'nmap scan types and timing',
      read: `A basic scan is one tool in a set. Real testing chooses the **scan type** and **timing** to fit the target, the scope and the need to be thorough or quiet. (All of this only on authorized networks.)

## TCP scan types

- **SYN scan (\`-sS\`)** — the default with root: send SYN, read the reply, never finish the handshake. Fast and relatively quiet.
- **Connect scan (\`-sT\`)** — completes the full TCP handshake using the OS. Used when you lack root; noisier and logged by the target as real connections.
- **UDP scan (\`-sU\`)** — probes UDP ports (DNS 53, SNMP 161, etc.). Slow and tricky (UDP is connectionless, so "no reply" is ambiguous), but essential — many important services are UDP-only and a TCP-only scan misses them entirely.

## Timing and performance

nmap has timing templates \`-T0\` (paranoid, very slow) to \`-T5\` (insane, very fast). \`-T4\` is a common lab default. Slower timing is quieter and gentler on fragile networks; faster timing risks tripping detection or overwhelming a device. On a real engagement, timing is an OPSEC and stability decision, not just speed.

## Common combinations

- \`nmap -sS -T4 -p- 10.0.0.5\` — thorough SYN scan of all TCP ports at a brisk pace.
- \`nmap -sU --top-ports 50 10.0.0.5\` — the 50 most common UDP ports (a full UDP scan is very slow).
- \`nmap -sS -sU -p T:1-1000,U:53,161 10.0.0.5\` — mix TCP and UDP ports in one scan.

## Why this matters

Beginners run one scan type and miss things — especially UDP services and ports above the top 1000. An amateur chooses deliberately: SYN for speed, connect when unprivileged, UDP to catch DNS/SNMP/etc., all-ports on important hosts, and timing suited to the target. The scan is a decision, not a reflex.`,
      sample: {
        lang: 'bash',
        caption: 'Choosing scan type and timing for the situation',
        code: `# Thorough TCP, all ports, brisk timing (root):
nmap -sS -T4 -p- 10.0.0.5

# Unprivileged (no root): full-connect scan
nmap -sT 10.0.0.5

# UDP top ports (full UDP scan is very slow) - catches DNS/SNMP:
nmap -sU --top-ports 50 10.0.0.5

# Mixed TCP + specific UDP ports in one run:
nmap -sS -sU -p T:1-1000,U:53,161 10.0.0.5`,
        output: `SYN (-sS)  : fast, quiet, needs root (default)
Connect(-sT): full handshake, logged, no root needed
UDP (-sU)  : slow, ambiguous, but finds UDP-only services
Timing -T0..-T5: slower = quieter/gentler, faster = louder/riskier`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should a thorough tester run a UDP scan (-sU) and not rely on TCP scans alone?',
        options: [
          'UDP scans are faster than TCP scans',
          'Many important services (e.g. DNS on 53, SNMP on 161) run over UDP, so a TCP-only scan misses them entirely — even though UDP scanning is slower and its results more ambiguous',
          'UDP scanning is required before any TCP scan will work',
          'TCP scans cannot detect open ports at all',
        ],
        answer: 1,
        explain:
          'TCP and UDP are separate transport protocols with separate ports. Several important services are UDP-only or primarily UDP — DNS (53), SNMP (161), and others — so a scan that only covers TCP ports simply never sees them. UDP scanning is slower and more ambiguous (because UDP is connectionless, "no reply" could mean open-or-filtered), which is why testers often scan just the top UDP ports, but skipping UDP altogether leaves real attack surface undiscovered. Choosing scan type deliberately — SYN for speed, connect when unprivileged, UDP to catch these services — is what separates thorough enumeration from a reflex scan.',
        hint: 'What kind of ports do DNS and SNMP use, and would a TCP-only scan ever see them?',
      },
    },

    {
      id: 'rnet-a-02',
      title: 'The Nmap Scripting Engine',
      read: `nmap is not only a port scanner; the **Nmap Scripting Engine (NSE)** turns it into an enumeration and vulnerability-checking framework. Hundreds of scripts probe services for details and known issues.

## How NSE works

Scripts are grouped into **categories**: \`default\` (safe, informative — run by \`-sC\`), \`safe\`, \`discovery\`, \`auth\`, \`vuln\` (check for known vulnerabilities), \`brute\` (credential attacks), and more. You run them with \`--script\`.

- \`nmap -sC 10.0.0.5\` — run the default scripts (safe, informative).
- \`nmap --script vuln 10.0.0.5\` — run the vulnerability-check scripts against the discovered services.
- \`nmap --script smb-enum-shares,smb-os-discovery -p445 10.0.0.5\` — run specific SMB enumeration scripts.

## What scripts give you

Instead of just "445 open," an SMB script lists the shares, the OS, and the signing status. Instead of "80 open," an HTTP script fetches the title, lists directories, or flags a known CVE. NSE automates the *enumeration* you would otherwise do by hand, and the \`vuln\` scripts flag likely-vulnerable versions to verify.

## Caution: not all scripts are safe

The \`default\`/\`safe\` categories are gentle. But \`vuln\`, \`brute\`, and especially \`intrusive\`/\`dos\` scripts *actively probe or attack* — a \`dos\` script can crash a service. On a real engagement you run only what your rules of engagement allow, and you never run a \`dos\` script outside an explicitly agreed test. In the lab you can experiment freely.

## Why NSE matters

NSE is the bridge between "I found a port" and "here is exactly what is on it and whether it is a known-vulnerable version." It accelerates enumeration enormously and standardises checks. Master \`-sC\`, know how to target service-specific scripts, and understand which categories are safe — that combination does a large fraction of enumeration for you, on authorized targets.`,
      sample: {
        lang: 'bash',
        caption: 'Using NSE for enumeration and vulnerability checks',
        code: `# Default (safe) scripts alongside a scan:
nmap -sC 10.0.0.5

# Vulnerability-check scripts (verify anything they flag!):
nmap --script vuln 10.0.0.5

# Targeted SMB enumeration scripts on port 445:
nmap -p445 --script smb-enum-shares,smb-os-discovery 10.0.0.5`,
        output: `Host script results:
| smb-os-discovery: Windows Server 2016
| smb-enum-shares:
|   \\\\10.0.0.5\\Finance  (READ)   <- interesting share
| smb-security-mode: message signing disabled  <- relay risk

CAUTION: 'vuln'/'brute'/'dos' scripts actively probe or attack.
Run only what your rules of engagement permit.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You should be cautious running NSE scripts from the "vuln", "brute" or especially "dos" categories on a real engagement. Why?',
        options: [
          'They take too long to run',
          'Unlike the default/safe categories, these actively probe or attack services — a "dos" script can crash a service — so you run them only within what the rules of engagement explicitly permit',
          'They only work on Windows hosts',
          'They require a separate license',
        ],
        answer: 1,
        explain:
          'NSE scripts are grouped by category. The default and safe categories are gentle, informative enumeration. But vuln scripts actively test for exploitable conditions, brute scripts attempt credential guessing, and dos scripts can deliberately crash a service to prove a denial-of-service condition. On a live engagement these can cause outages or cross lines the client did not authorize, so you run them only within the rules of engagement — and never a dos script outside an explicitly agreed test. In an isolated lab you can experiment freely. Knowing which categories are safe is part of using NSE responsibly.',
        hint: 'What can a "dos"-category script do to a live service, and what governs whether you may run it?',
      },
    },

    {
      id: 'rnet-a-03',
      title: 'Enumerating SMB in depth',
      read: `Open port **445 (SMB)** is one of the richest targets on a Windows network. Amateur-level enumeration of SMB alone can hand you shares, users, the OS, and the relay-critical signing status.

## What SMB exposes

**SMB** (Server Message Block) is Windows file and printer sharing. Enumeration goals:

- **Shares** — the folders the host offers. Some may be readable (or writable) without valid credentials, leaking files.
- **Null / guest sessions** — older or misconfigured hosts allow an *anonymous* connection that can list shares and sometimes users.
- **Users and groups** — some configurations let you enumerate account names (feeding password attacks).
- **OS and version** — for finding known vulnerabilities.
- **Signing status** — whether SMB signing is required. **Signing disabled = SMB relay is possible** (a key later attack).

## The tools

- **nmap NSE** — \`smb-enum-shares\`, \`smb-os-discovery\`, \`smb-enum-users\`, \`smb-security-mode\`.
- **enum4linux / enum4linux-ng** — a script that bundles many SMB enumeration checks into one run.
- **smbclient** — connect to and browse shares directly: \`smbclient -L //10.0.0.5/ -N\` lists shares with a null session.
- **crackmapexec / netexec** — enumerate SMB across many hosts, check credentials, and report signing status at scale.

## Reading the results

An open, readable \`Finance\` share is an immediate finding. "Signing not required" is a finding that enables relay. Enumerable users feed spraying. Each result is either loot or a lead. SMB rewards patience: it often exposes far more than a port list suggests.

## The defensive mirror

Every SMB finding maps to a fix: disable SMBv1, require signing, remove anonymous access, restrict 445 to management networks, least-privilege the shares. When you enumerate SMB thoroughly, you are also writing the hardening checklist. In the lab, point enum4linux and the SMB NSE scripts at a Windows/Samba target and read everything they reveal.`,
      sample: {
        lang: 'bash',
        caption: 'Enumerating SMB from several angles (lab target)',
        code: `# List shares with a null (anonymous) session:
smbclient -L //10.0.0.5/ -N

# Bundled SMB enumeration:
enum4linux-ng 10.0.0.5

# nmap SMB scripts, including signing status:
nmap -p445 --script smb-enum-shares,smb-enum-users,smb-security-mode 10.0.0.5`,
        output: `Sharename       Type      Comment
Finance         Disk      (READ access via null session!)
IPC$            IPC
smb-security-mode: message_signing: disabled   <- relay possible
smb-os-discovery: Windows Server 2016
smb-enum-users: jsmith, adminsvc, backupop      <- feeds spraying`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'During SMB enumeration you find "message signing: disabled" on a host. Why is that specifically important to note?',
        options: [
          'It means the host is offline',
          'SMB signing being disabled means SMB relay attacks are possible against that host — an attacker can relay a captured authentication to it — so it is a finding that enables a later, higher-impact attack',
          'It means the shares are encrypted',
          'It only affects printing, not security',
        ],
        answer: 1,
        explain:
          'SMB signing cryptographically binds an SMB session so a relayed authentication cannot be reused against the host. When signing is not required ("disabled"), an attacker who captures or coerces an authentication elsewhere can relay it to that host and act as the victim — the SMB relay attack. So "signing disabled" is not a trivial config note; it is a finding that enables a high-impact attack later in the engagement. Alongside readable null-session shares (immediate loot) and enumerable users (fuel for password spraying), it is one of the reasons SMB enumeration is so productive. The fix is to require SMB signing (and disable SMBv1, remove anonymous access, restrict 445).',
        hint: 'What later attack becomes possible when SMB does not require signing?',
      },
    },

    {
      id: 'rnet-a-04',
      title: 'Enumerating SNMP, DNS and SMTP',
      read: `Beyond SMB, three more services reward enumeration on many networks: **SNMP**, **DNS**, and **SMTP**. Each leaks a specific, useful kind of information.

## SNMP (161/udp) — device information

**SNMP** manages network devices (routers, switches, printers, servers). It is guarded by a **community string** that acts like a password — and it is very often left at the default **\`public\`** (read) or **\`private\`** (write). With a valid string you can read a device's entire configuration: interfaces, routing tables, running processes, sometimes usernames, and on misconfigured devices even the config file. Tools: \`snmpwalk -v2c -c public 10.0.0.1\`, \`onesixtyone\` (to guess community strings). SNMP is UDP, so remember \`-sU\` found it.

## DNS (53) — the network's map

**DNS** resolves names to addresses, and a misconfigured server can hand you the whole internal map. A **zone transfer** (\`dig axfr @dns-server domain\`) asks the server for *every record in a zone* — if allowed (a misconfiguration), you get every hostname and IP at once. Otherwise you enumerate names by brute force or from public sources. DNS also reveals mail servers (MX), subdomains, and internal naming conventions.

## SMTP (25) — user enumeration

**SMTP** (email) can leak valid usernames. The \`VRFY\` and \`EXPN\` commands, and the way a server responds to \`RCPT TO\`, can confirm whether an address exists — letting you build a list of valid users for password attacks. Tools: \`smtp-user-enum\`, or manual interaction with the SMTP commands.

## The pattern

Each service leaks a *different* asset: SNMP → device internals, DNS → the network map, SMTP → valid usernames. Together they enrich your picture enormously, and much of it comes from **defaults and misconfigurations** (a \`public\` string, an open zone transfer, a chatty SMTP server). In the lab, walk SNMP with the default string, attempt a zone transfer, and try SMTP user enumeration against your targets.`,
      sample: {
        lang: 'bash',
        caption: 'Enumerating SNMP, DNS and SMTP (lab targets)',
        code: `# SNMP: read device info with the (often default) community string
snmpwalk -v2c -c public 10.0.0.1

# DNS: attempt a zone transfer (works only if misconfigured)
dig axfr @10.0.0.53 lab.local

# SMTP: check whether usernames exist
smtp-user-enum -M VRFY -U users.txt -t 10.0.0.25`,
        output: `SNMP  -> interfaces, routes, processes, sometimes users/config
DNS   -> zone transfer dumps EVERY hostname+IP if allowed
SMTP  -> VRFY/EXPN/RCPT confirm which usernames are valid

Common thread: DEFAULTS + MISCONFIG (public string, open AXFR,
chatty SMTP). Each leaks a different asset.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A DNS zone transfer (dig axfr) can be extremely valuable during enumeration. What does it give you when it succeeds, and why does it usually succeed only sometimes?',
        options: [
          'It cracks the DNS server’s password; it works only on weak passwords',
          'It returns every record in a DNS zone at once — the full internal map of hostnames and IPs — and succeeds only when the server is misconfigured to allow transfers to arbitrary clients',
          'It encrypts DNS traffic so it can be read',
          'It only returns the server’s own IP address',
        ],
        answer: 1,
        explain:
          'A zone transfer (AXFR) is the mechanism DNS servers use to replicate a zone to authorized secondaries. If a server is misconfigured to allow transfers to any client, asking for one dumps every record in the zone — all the hostnames and IPs, mail servers, and internal naming conventions — handing you the network’s map in a single request. Properly configured servers restrict AXFR to specific secondary servers, so it usually fails; when it works, it is a straightforward misconfiguration finding. Like the SNMP default community string and chatty SMTP user enumeration, it is another case of defaults/misconfiguration leaking valuable information.',
        hint: 'What does "transfer the whole zone" mean, and which server setting normally prevents it?',
      },
    },

    {
      id: 'rnet-a-05',
      title: 'Analysing traffic with Wireshark',
      read: `Beginner-level capture showed you packets exist and plaintext leaks. Amateur-level **analysis** is about finding the needle: Wireshark's **display filters** let you slice a huge capture down to exactly what matters.

## Display filters (the core skill)

A capture can be millions of packets. Display filters show only what you want:

- \`ip.addr == 10.0.0.5\` — traffic to/from that host.
- \`tcp.port == 445\` — SMB traffic.
- \`http\` — only HTTP; \`http.request.method == "POST"\` — only POST requests (logins live here).
- \`dns\` — DNS queries and responses.
- \`tcp.flags.syn == 1 && tcp.flags.ack == 0\` — connection attempts (spot a scan).

Filters combine with \`&&\`, \`||\`, \`!\`. Mastering them turns "there is a lot of traffic" into "show me every HTTP POST to the login page."

## Following a conversation

**Follow TCP Stream** reassembles a whole conversation (both directions) into readable text — the fastest way to read an HTTP request/response, an FTP session, or any plaintext exchange as it actually happened. This is where captured credentials become obvious.

## Statistics and objects

- **Statistics → Conversations / Endpoints** — who talked to whom and how much (spot the busy or unusual hosts).
- **Statistics → Protocol Hierarchy** — what protocols are present.
- **File → Export Objects → HTTP** — pull files transferred over HTTP straight out of the capture.

## Why analysis is a distinct skill

Anyone can start a capture; the value is in reading it. Finding the one login POST, the one plaintext credential, the one anomalous conversation among millions of packets is what makes capture useful. And it is bound by the same ethics as before: analyse only traffic you are authorized to capture, and handle what you find responsibly. In the lab, capture mixed traffic, then use filters and Follow Stream to extract a specific credential and a specific conversation.`,
      sample: {
        lang: 'text',
        caption: 'Wireshark display filters that isolate what matters',
        code: `ip.addr == 10.0.0.5              # all traffic to/from a host
tcp.port == 445                  # SMB traffic
http.request.method == "POST"    # HTTP POSTs (logins live here)
dns                              # DNS queries/responses
tcp.flags.syn==1 && tcp.flags.ack==0   # connection attempts (scans)
ftp || telnet                    # plaintext sessions

Combine with && || !  e.g.:
  http && ip.addr==10.0.0.5 && frame contains "password"`,
        output: `Follow TCP Stream -> reassembles a whole conversation as text.
Statistics -> Conversations/Endpoints -> who talked to whom.
Export Objects -> HTTP -> pull transferred files from the capture.
The skill is READING the capture, not just making one.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the main value of Wireshark display filters and "Follow TCP Stream" when analysing a large capture?',
        options: [
          'They speed up the network being captured',
          'They let you slice millions of packets down to exactly the traffic that matters (a host, a protocol, HTTP POST logins) and reassemble a whole conversation into readable text — turning a huge capture into specific, findable evidence',
          'They decrypt TLS automatically',
          'They are required to start a capture in the first place',
        ],
        answer: 1,
        explain:
          'Starting a capture is easy; extracting meaning from millions of packets is the real skill. Display filters (like http.request.method == "POST", tcp.port == 445, or ip.addr == 10.0.0.5) narrow the view to precisely the traffic you care about, and Follow TCP Stream reassembles both directions of a conversation into readable text — the fastest way to read a plaintext login or session and spot captured credentials. Combined with the Statistics views and Export Objects, these turn a raw capture into specific, citable evidence. As always, analyse only authorized traffic and handle findings responsibly.',
        hint: 'The problem is volume — millions of packets. What do filters and stream-following do about that?',
      },
    },

    {
      id: 'rnet-a-06',
      title: 'Why a switch hides traffic',
      read: `A crucial reality check: on a modern **switched** network, capturing your own interface shows you almost nothing but *your own* traffic. Understanding *why* is the key that unlocks the interception attacks that follow.

## Hubs vs switches

- An old **hub** repeated every frame to every port, so any machine could sniff everything — trivial eavesdropping.
- A modern **switch** learns which **MAC address** lives on which physical port and forwards each frame *only* to the port for its destination. So your network card normally receives only frames addressed to you (plus broadcasts). Sniffing your own interface on a switch shows your traffic and broadcasts — not your neighbours' conversations.

## Promiscuous mode is not enough

Putting your card in **promiscuous mode** tells it to accept all frames it *receives* — but on a switch it still only *receives* its own. Promiscuous mode mattered on a hub; on a switch, the switch itself is the limiter.

## How attackers see more anyway

To capture others' traffic on a switch, you must change what the switch (or the victims) do:

- **Port mirroring / SPAN** — a legitimate admin feature that copies traffic to a monitoring port. Testers with access use it; attackers rarely have it.
- **ARP spoofing** — trick the victims into sending *their* traffic *through you* (the next steps). This defeats the switch by attacking the layer below it.
- **MAC flooding** — overwhelm the switch's MAC table so it "fails open" and floods like a hub (older/cheaper switches).

## Why this matters

This explains why "just run Wireshark" does not reveal a network's secrets, and why interception requires an *active* attack to reposition traffic. It also frames the defence: a switch already limits casual sniffing, and features like dynamic ARP inspection and port security exist precisely to stop the active attacks that get around it. In the lab, confirm you see only your own traffic on a switch before learning to change that with ARP spoofing next.`,
      sample: {
        lang: 'text',
        caption: 'Why a switch limits what you can capture',
        code: `HUB (old):    frame -> repeated to EVERY port -> anyone sniffs all
SWITCH (now): frame -> sent ONLY to the port of its dest MAC
              => your NIC receives only YOUR traffic + broadcasts

Promiscuous mode: accept all frames you RECEIVE...
   ...but on a switch you still only RECEIVE your own. Not enough.

To see others' traffic on a switch, change the situation:
  port mirror/SPAN  (admin feature)
  ARP spoofing      (make victims route through you)  <- next
  MAC flooding      (overflow the switch -> fail open)`,
        output: `On a switch, "just run Wireshark" shows only your own traffic.
Interception needs an ACTIVE attack to reposition traffic
(usually ARP spoofing). Defences: DAI, port security.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'On a switched network, why does simply capturing on your own interface (even in promiscuous mode) fail to show you other machines’ conversations?',
        options: [
          'Because all modern traffic is encrypted',
          'Because a switch forwards each frame only to the port belonging to its destination MAC, so your card only *receives* its own traffic and broadcasts — promiscuous mode accepts everything received, but the switch never sends others’ frames to you',
          'Because Wireshark cannot capture on switches',
          'Because promiscuous mode is illegal',
        ],
        answer: 1,
        explain:
          'Unlike an old hub (which repeated every frame to every port, making sniffing trivial), a switch learns which MAC address is on which port and forwards each frame only toward its destination. So your network card only *receives* frames addressed to you plus broadcasts. Promiscuous mode makes the card accept all frames it receives — but on a switch it still only receives its own, so it does not help. To see others’ traffic you must change the situation: legitimate port mirroring/SPAN, MAC flooding to make a switch fail open, or (most commonly) ARP spoofing to trick victims into routing their traffic through you. This is exactly why interception needs an active attack.',
        hint: 'What does a switch do with a frame based on its destination MAC — and does your card ever receive someone else’s frame?',
      },
    },

    {
      id: 'rnet-a-07',
      title: 'ARP and the local trust model',
      read: `To defeat a switch you attack the protocol beneath it: **ARP**. Understanding ARP's trusting design explains ARP spoofing, the most important local-network attack.

## What ARP does

On a local segment, machines talk by **MAC address**, but applications use **IP addresses**. **ARP** (Address Resolution Protocol) bridges the two: to send to \`10.0.0.5\`, a host broadcasts "**who has 10.0.0.5?**"; the owner replies "**10.0.0.5 is at MAC aa:bb:cc:...**". The asker caches that mapping and sends the frame there.

## The fatal flaw: ARP is unauthenticated

ARP has **no authentication whatsoever**. A host believes *any* ARP reply it receives — even one it never asked for (a **gratuitous ARP**), and even one that is a lie. There is no check that the responder actually owns the IP it claims. Each host simply updates its ARP cache with whatever it is told.

## Why that is exploitable

If an attacker sends the victim a forged ARP reply saying "**the gateway (10.0.0.1) is at *my* MAC**," the victim caches it and starts sending all its internet-bound traffic **to the attacker**. Send the gateway the mirror lie ("the victim is at my MAC") and the attacker sits **in the middle** of both directions — a man-in-the-middle — without touching the switch at all. The switch is doing its job perfectly; it has just been told the wrong MAC-to-port story by the victims themselves.

## The trust model lesson

ARP is a relic of a trusting era: fast and simple, with security never designed in. It is the clearest example in networking of **"the protocol trusts anything on the local segment."** That is why local-network access is so dangerous, and why defences (dynamic ARP inspection, static ARP entries, segmentation) exist to add the authentication ARP lacks. Next you will use this to build a MITM — in the lab only. Understanding *why it works* (no authentication) is the point; the tool is secondary.`,
      sample: {
        lang: 'text',
        caption: 'ARP: how it works, and the lie that abuses it',
        code: `NORMAL:
  host: "who has 10.0.0.1 (the gateway)?"   (broadcast)
  gw  : "10.0.0.1 is at aa:bb:cc:11:22:33"  (reply)
  host caches: 10.0.0.1 -> aa:bb:cc:11:22:33

THE FLAW: ARP has NO authentication. A host believes ANY reply,
even unsolicited, even false.

ATTACK (lab only):
  attacker -> victim : "10.0.0.1 (gateway) is at MY mac"
  attacker -> gateway: "victim is at MY mac"
  => both send through the attacker = man-in-the-middle`,
        output: `ARP spoofing works because ARP trusts any reply with no proof of
ownership. The switch is fine; the victims were told the wrong
mapping. Defences (DAI, static ARP) add the missing authentication.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What property of ARP makes ARP spoofing possible?',
        options: [
          'ARP encrypts replies with a weak cipher that can be broken',
          'ARP has no authentication — a host caches any ARP reply it receives, even unsolicited or false ones, with no check that the responder owns the claimed IP — so an attacker can forge mappings and reroute traffic through themselves',
          'ARP only works on encrypted networks',
          'ARP requires a password that is usually left at default',
        ],
        answer: 1,
        explain:
          'ARP maps IP addresses to MAC addresses on a local segment, and it was designed with no authentication at all: a host trusts any ARP reply, including gratuitous (unsolicited) ones, and never verifies that the responder actually owns the IP it claims. An attacker exploits this by sending forged replies — telling the victim that the gateway’s IP is at the attacker’s MAC, and telling the gateway that the victim’s IP is at the attacker’s MAC — so both send their traffic through the attacker, creating a man-in-the-middle without touching the switch. It is the classic example of a local-segment protocol trusting anything; defences like dynamic ARP inspection and static entries add the missing authentication.',
        hint: 'Does ARP ever check that a reply is telling the truth about who owns an IP?',
      },
    },

    {
      id: 'rnet-a-08',
      title: 'ARP spoofing and man-in-the-middle',
      read: `Now put ARP's flaw to work: an **ARP spoofing MITM** places you between a victim and the gateway so their traffic flows through you. Practised only in your lab.

## The mechanics

1. **Enable IP forwarding** on your attacker machine, so traffic you receive is passed on to its real destination — otherwise the victim's connection breaks and the attack is obvious.
2. **Poison both directions.** Tell the victim you are the gateway, and tell the gateway you are the victim. Tools like \`arpspoof\` (dsniff), \`ettercap\`, or \`bettercap\` automate this and re-send the lies continuously (caches expire, so you must refresh).
3. **Now you are in the middle.** Every packet between victim and gateway passes through your machine. Point Wireshark at your interface and you see it all.

## What you can do from the middle

- **Read** all the victim's traffic (recall: plaintext protocols expose everything).
- **Harvest credentials** from any plaintext login that crosses.
- **Modify** traffic in transit (advanced), or redirect it.
- **Downgrade / strip** attempts against encryption (e.g. HTTPS-stripping, though modern browsers and HSTS defeat much of this — a good reason encryption matters).

## The limits — and the defence lesson

MITM lets you *see and alter* traffic, but **encryption still protects content**: an HTTPS session passing through you is still encrypted end-to-end; you see that it happened and to where, but not the contents (unless you can trick the victim into trusting a certificate you control, which good clients refuse). So ARP spoofing is devastating against plaintext and a strong argument for encrypting everything.

## OPSEC and safety

ARP spoofing is disruptive: forget IP forwarding and you cut the victim off; poison the wrong host and you break the network. It is noisy and detectable (duplicate MACs, ARP anomalies). On real engagements it is used carefully, within scope. In the lab, poison a victim VM and a gateway VM, confirm traffic flows through you in Wireshark, and capture a plaintext credential end to end.`,
      sample: {
        lang: 'bash',
        caption: 'An ARP-spoofing MITM in the lab',
        code: `# 1. forward received traffic so the victim stays connected:
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward

# 2. poison BOTH directions (victim <-> gateway):
sudo arpspoof -i eth0 -t 10.0.0.50 10.0.0.1    # tell victim: I'm the gw
sudo arpspoof -i eth0 -t 10.0.0.1 10.0.0.50    # tell gw: I'm the victim

# 3. watch the victim's traffic flow through you:
sudo wireshark  # filter: ip.addr == 10.0.0.50`,
        output: `Now victim<->gateway traffic passes through the attacker.
Plaintext (FTP/HTTP/Telnet) creds are readable.
BUT HTTPS/SSH stay encrypted end-to-end -> you see metadata,
not content. Forget ip_forward and you cut the victim off.
Noisy/detectable (duplicate MACs). Lab only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You have a successful ARP-spoofing MITM and the victim browses an HTTPS site through you. What can you actually see?',
        options: [
          'The full plaintext of the HTTPS pages and any passwords entered',
          'That the connection happened and to which server (metadata), but not the encrypted contents — HTTPS remains end-to-end encrypted, unless you can trick the victim into trusting a certificate you control (which sound clients refuse)',
          'Nothing at all, because HTTPS blocks ARP spoofing',
          'Only the victim’s MAC address',
        ],
        answer: 1,
        explain:
          'An ARP-spoofing MITM repositions traffic so it flows through you — you can read anything unencrypted (plaintext logins are exposed) and even modify traffic. But encryption still protects content: an HTTPS (or SSH) session passing through you stays encrypted end-to-end, so you observe that the connection occurred and its destination (metadata) but not the contents. You could only read it by getting the victim to trust a certificate you present, which properly configured clients — with certificate validation and HSTS — refuse, showing warnings. That is precisely why MITM is devastating against plaintext and why "encrypt everything" is the defensive takeaway. (Also: forget IP forwarding and you cut the victim off; the attack is noisy and detectable.)',
        hint: 'MITM repositions traffic, but what does end-to-end encryption still hide even when the packets pass through you?',
      },
    },

    {
      id: 'rnet-a-09',
      title: 'Harvesting captured credentials',
      read: `Being in the middle, or sniffing where you can, is only useful if you can *extract the valuable data*. Credential harvesting is the pointed skill: pulling usernames, passwords, hashes and tokens out of captured traffic.

## Where credentials hide

- **Plaintext protocols** — FTP, Telnet, plain HTTP forms, POP3/IMAP/SMTP without TLS: usernames and passwords appear directly (Follow TCP Stream reveals them instantly).
- **HTTP Basic auth** — sends credentials Base64-encoded (not encrypted) in an \`Authorization\` header; trivially decoded.
- **Challenge-response hashes** — protocols like SMB/NTLM don't send the password, but the captured **Net-NTLMv2** response can be **cracked offline** to recover it (this is what Responder captures, in the next level).
- **Session cookies and tokens** — a captured auth cookie can let you *impersonate* a logged-in user without their password at all.

## Tools that automate it

- **Follow TCP Stream** in Wireshark — manual but universal.
- **credential-scraping tools** (e.g. \`bettercap\`'s net.sniff, \`ettercap\` plugins) — surface likely credentials automatically as they pass.
- **hashcat / john** — crack the hashes you harvest, offline.

## Two kinds of loot

Distinguish **directly usable** loot (a plaintext password, a valid session cookie — use immediately) from **crackable** loot (a Net-NTLMv2 hash — attack offline, may or may not fall). Both are findings; only one is instant.

## The responsibility

Harvested credentials are among the most sensitive things you will handle. Store them securely, use them only within scope, and report the *exposure* (that credentials crossed the network in a recoverable form) as a finding in itself — because the fix (encrypt the protocol, enforce signing, use tokens correctly) closes it. In the lab, harvest a plaintext credential and a Base64 Basic-auth header from your own MITM/capture, and decode them.`,
      sample: {
        lang: 'text',
        caption: 'Credentials as they appear in captured traffic',
        code: `FTP (plaintext):        USER admin / PASS S3cr3t
HTTP form (plaintext):  POST /login  user=admin&pass=S3cr3t
HTTP Basic auth:        Authorization: Basic YWRtaW46UzNjcmV0
                        (Base64 -> "admin:S3cret", NOT encrypted)
SMB/NTLM:               Net-NTLMv2 response -> crack OFFLINE
Session cookie:         Cookie: session=... -> impersonate user!

DIRECTLY USABLE: plaintext pw, valid cookie  (use now)
CRACKABLE:       Net-NTLMv2 hash            (attack offline)`,
        output: `The exposure itself is a finding: credentials crossed the network
in a recoverable form. Fix = encrypt the protocol / enforce
signing / handle tokens correctly. Store loot securely, scope-only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A captured HTTP request contains "Authorization: Basic YWRtaW46UzNjcmV0". Why is this a serious exposure?',
        options: [
          'The credentials are strongly encrypted and safe',
          'HTTP Basic auth sends the credentials only Base64-encoded — which is trivially decoded back to "admin:S3cret", not encrypted — so anyone who captures the request recovers the username and password directly',
          'It is only a session identifier, not credentials',
          'Base64 is a hashing algorithm that cannot be reversed',
        ],
        answer: 1,
        explain:
          'Base64 is an encoding, not encryption — it is reversible with no key, so "YWRtaW46UzNjcmV0" decodes straight back to "admin:S3cret". HTTP Basic authentication sends credentials in exactly this form, so if the traffic is not protected by TLS, anyone who captures it recovers the username and password immediately. It is one of several places credentials hide in traffic (alongside plaintext protocols, crackable Net-NTLMv2 hashes, and reusable session cookies). The exposure itself is the finding; the fix is to carry such traffic only over HTTPS (or use a proper token scheme), so a capture yields nothing usable.',
        hint: 'Is Base64 encryption, or just a reversible encoding?',
      },
    },

    {
      id: 'rnet-a-10',
      title: 'Network password attacks',
      read: `Enumeration often hands you usernames and login services (SSH, RDP, SMB, web, FTP). **Network password attacks** turn those into access — carefully, because they are noisy and can lock accounts.

## The techniques

- **Password spraying** — try *one* common password against *many* usernames. This avoids lockouts (each account sees only one attempt) and is highly effective because some user always has a weak password. The preferred technique on real engagements.
- **Brute force / dictionary** — try *many* passwords against *one* account. Fast to trigger lockouts and very noisy; used carefully, usually with a targeted wordlist.
- **Credential stuffing** — reuse username/password pairs leaked elsewhere, betting on reuse.

## The tools

- **hydra** — classic online login attacker, supports many protocols: \`hydra -L users.txt -p 'Spring2024!' ssh://10.0.0.5\` (a spray: one password, many users).
- **netexec / crackmapexec** — spray SMB/WinRM/etc. across many hosts, and immediately show where credentials work.
- **medusa, patator** — alternatives with different protocol coverage.

## The dangers (this is why care matters)

- **Account lockout** — brute forcing one account can lock it, causing a denial of service and an obvious alert. Spraying is designed to avoid this, but even spraying too fast across a policy window can lock accounts. Know the lockout policy.
- **Noise** — many failed logins are one of the loudest things you can do; they light up any monitoring. On a real engagement you spray slowly, within the policy window, and within rules of engagement.

## Online vs offline

These are **online** attacks (against a live service, rate-limited, lockout-prone, noisy). Contrast the **offline** cracking of harvested hashes (hashcat/john), which is unlimited and silent because it never touches the target. Prefer offline when you have the hash; use online spraying judiciously when you have a username list and a login service. In the lab, spray a known password across a user list against an SSH or SMB target and observe how spraying avoids lockout while brute force triggers it.`,
      sample: {
        lang: 'bash',
        caption: 'Spraying (safe-ish) vs brute forcing (lockout risk)',
        code: `# SPRAY: one common password, MANY users -> avoids lockout
hydra -L users.txt -p 'Spring2024!' ssh://10.0.0.5

# Spray SMB across many hosts, show where it works:
netexec smb 10.0.0.0/24 -u users.txt -p 'Spring2024!'

# BRUTE FORCE: many passwords, ONE user -> can LOCK the account
hydra -l admin -P rockyou.txt ssh://10.0.0.5    # noisy, risky`,
        output: `SPRAY:  1 pw x many users -> each account sees 1 try (no lockout)
BRUTE:  many pw x 1 user  -> triggers lockout, very noisy
Both are ONLINE (rate-limited, lockout-prone, LOUD).
Offline hash cracking (hashcat/john) is unlimited + silent.
Always know the lockout policy; stay within rules of engagement.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do testers generally prefer password spraying over brute forcing a single account on a live network?',
        options: [
          'Spraying tries every possible password, so it is more thorough',
          'Spraying tries one common password across many users, so each account sees only a single attempt — avoiding account lockout (and the resulting denial of service and alerts) — whereas brute forcing one account with many passwords quickly triggers lockout and is very noisy',
          'Spraying is an offline attack and cannot be detected',
          'Brute forcing does not work over the network',
        ],
        answer: 1,
        explain:
          'Password spraying uses one (or a few) common passwords against a large list of usernames, so any single account only sees one attempt per round — staying under lockout thresholds while still catching the users who chose a weak password. Brute forcing hammers a single account with many passwords, which rapidly hits the lockout policy (denying service to that user and raising an obvious alert) and is extremely noisy. Both are online attacks: rate-limited, lockout-prone, and loud, so testers spray slowly within the policy window and rules of engagement. When you already hold a hash, offline cracking is preferable — unlimited and silent because it never touches the target.',
        hint: 'How many attempts does each individual account see under spraying versus brute force, and what does that avoid?',
      },
    },

    {
      id: 'rnet-a-11',
      title: 'Vulnerability scanning vs verification',
      read: `As enumeration grows, you meet **vulnerability scanners** — tools that automatically check hosts against databases of known flaws. They are powerful and dangerous in equal measure, and knowing how to use them *responsibly* is an amateur-to-pro dividing line.

## What a vuln scanner does

Tools like **Nessus**, **OpenVAS/Greenbone**, and Nuclei probe hosts, match versions and behaviours against known-vulnerability databases, and produce a report of "findings" rated by severity. In minutes they surface far more potential issues than manual checking. On large scopes they are indispensable for coverage.

## The catch: false positives

Automated scanners are **inference engines**, and they are frequently wrong:

- A version banner may be a **backported, patched** build that the scanner flags as vulnerable purely by version number.
- A check may misfire on an unusual configuration.
- Severity ratings are generic and ignore your specific context.

**A scanner finding is a lead, not a fact.** The professional standard is: the scanner points, *you verify*. You confirm the vulnerability actually exists (safely) before reporting it. A report full of unverified scanner output — "the scanner said so" — is amateur work and erodes trust.

## Active scanning caution

Vuln scanners are **intrusive**: they send exploit-like probes and can crash fragile services or devices. Run them only within rules of engagement, avoid \`dos\`-type checks unless agreed, and be careful with sensitive infrastructure (medical, ICS/SCADA, legacy). "It was just a scan" is no excuse for an outage you caused.

## The right workflow

Use the scanner for **breadth** (find candidates fast), then apply **manual depth** (verify, understand, and contextualise each real issue). Combine the two: automation for coverage, human judgement for truth. In the lab, run OpenVAS/Nuclei against a target, then take one flagged "vulnerability" and *manually verify* whether it is real — experiencing a false positive first-hand is the lesson.`,
      sample: {
        lang: 'text',
        caption: 'Scanner output is a lead; verification makes it a finding',
        code: `SCANNER SAYS:  [CRITICAL] Host runs Apache 2.4.49 -> CVE-XXXX (RCE)

BUT: is 2.4.49 the real, unpatched build, or a distro backport
     with the fix applied but the version string unchanged?

VERIFY (safely) before reporting:
  - confirm the exact build / patch level
  - test the specific condition in a safe way
  - only THEN report it as a finding

Unverified "the scanner said so" = amateur work + lost trust.
Scanners are also INTRUSIVE: can crash fragile services.`,
        output: `Right workflow: scanner for BREADTH (fast candidates) + manual
DEPTH (verify each real issue). A scanner finding is a lead,
not a fact. Run intrusive scans only within rules of engagement.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the correct professional attitude toward an automated vulnerability scanner’s "critical" finding?',
        options: [
          'Report it immediately at critical severity, since the tool is authoritative',
          'Treat it as a lead to verify, not a fact — because scanners frequently produce false positives (e.g. flagging a backported, already-patched build by version number) — and confirm the issue really exists, safely, before reporting it',
          'Ignore all scanner output, since scanners are useless',
          'Run every dos-category check to confirm severity',
        ],
        answer: 1,
        explain:
          'Vulnerability scanners are inference engines that match versions and behaviours against known-flaw databases. They are excellent for breadth — surfacing many candidate issues fast — but they are frequently wrong: a common false positive is flagging a distro package as vulnerable by its version string when the fix has been backported without changing that string. So a scanner finding is a lead, not a fact; the professional standard is to verify each real issue safely before reporting it, and to contextualise the generic severity. Scanners are also intrusive and can crash fragile services, so they run only within rules of engagement. Breadth from automation, truth from human verification.',
        hint: 'Why might a scanner call a fully-patched host "vulnerable," and what must you do before writing it up?',
      },
    },

    {
      id: 'rnet-a-12',
      title: 'Project: enumerate, capture and MITM in the lab',
      read: `Bring the amateur skills together on your lab: deep enumeration, real traffic analysis, and a controlled man-in-the-middle that harvests a credential. Do it only on the isolated lab you own.

## The brief

Starting from your beginner map, go deeper: enumerate services thoroughly, position yourself to see another host's traffic via ARP spoofing, harvest a plaintext credential end to end, and (optionally) validate a discovered credential across the network — then write it up.

## Steps

1. **Deep scan** — SYN + UDP + all-ports on the important hosts; \`-sV -sC\` for versions and default scripts.
2. **Service enumeration** — SMB (shares, users, signing), SNMP (default strings), DNS (zone transfer attempt), SMTP (user enum). Record everything.
3. **NSE checks** — run appropriate \`vuln\` scripts; note candidates to verify (do not just report them).
4. **Capture & analyse** — capture traffic and use Wireshark filters + Follow Stream to find a plaintext session.
5. **MITM** — with IP forwarding on, ARP-spoof a victim VM and the gateway VM; confirm in Wireshark that traffic flows through you; harvest a plaintext credential.
6. **Password validation (optional)** — spray a harvested/guessed credential across the segment with netexec; note where it works. Mind the lockout policy.
7. **Write it up** — a service inventory plus findings (exposure/impact/fix, verified, prioritised), including the plaintext-exposure and any SMB-signing findings.

## The standard

You pass when your report demonstrates: thorough enumeration of at least SMB and two other services; a verified (not just scanner-claimed) finding; a captured credential with proof; and a successful MITM described with its limits (what encryption still protected). All strictly inside the isolation boundary, with sensitive data handled responsibly.

## Where next

Intermediate turns interception into the high-impact attacks: LLMNR/NBT-NS poisoning with Responder, SMB relay across the network, service exploitation, tunnelling and **pivoting** — reaching networks your attacker VM cannot touch directly. Everything there builds on the positioning and harvesting you just practised.`,
      sample: {
        lang: 'bash',
        caption: 'The amateur project as a sequence (lab only)',
        code: `# 1-2 deep enumeration
nmap -sS -sU -T4 -p- --top-ports 50 -sV -sC 10.0.0.5
enum4linux-ng 10.0.0.5 ; snmpwalk -v2c -c public 10.0.0.1

# 4-5 capture + MITM
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
sudo arpspoof -i eth0 -t 10.0.0.50 10.0.0.1
sudo wireshark    # find & follow a plaintext login stream

# 6 validate a credential across the segment (mind lockout)
netexec smb 10.0.0.0/24 -u users.txt -p 'Spring2024!'`,
        output: `Pass = thorough enumeration (SMB + 2 services) + one VERIFIED
finding + a captured credential (with proof) + a working MITM
described WITH its limits. Inside the isolation boundary, data
handled responsibly.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'For the amateur project, what must your MITM write-up include to meet the professional standard?',
        options: [
          'Only a screenshot proving you achieved the MITM',
          'The successful interception AND its limits — for example, that plaintext traffic was captured but HTTPS/SSH remained end-to-end encrypted — so the report is accurate about what the attack did and did not reveal',
          'A claim that all traffic including HTTPS was fully decrypted',
          'The victim’s personal data copied in full for evidence',
        ],
        answer: 1,
        explain:
          'A professional MITM write-up is honest about scope of impact. Yes, you captured the victim’s plaintext traffic and a credential — but you must also state the limits: encrypted sessions (HTTPS, SSH) passing through you remained protected end-to-end, so you saw metadata, not contents, unless a client had been tricked into trusting a rogue certificate (which sound clients refuse). Overclaiming ("I decrypted everything") is inaccurate and erodes trust; and you never hoard sensitive personal data beyond what scope requires. Accurate about what the attack revealed and what it did not — combined with verified findings and thorough enumeration — is the passing standard, all within the isolation boundary.',
        hint: 'What did the MITM NOT reveal, and why is stating that essential to an accurate report?',
      },
    },
  ],
}

export default level
