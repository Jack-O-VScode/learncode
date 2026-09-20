import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Offensive networking — ethics, lab and how networks work',
  summary:
    'Authorized offensive networking from zero. The law, authorization and scope that make network testing legal; a safe lab of machines you own; how networks actually work (layers, IP, ports); and the first real skills — host discovery, port scanning with nmap, and reading a packet. Every technique here is used only on networks you own or are contracted, in writing, to test.',
  outcomes: [
    'State the legal and ethical rules that make network testing legitimate',
    'Build an isolated network lab of machines you own to practise on',
    'Explain how networks work in layers, and what IP and ports are',
    'Discover live hosts and scan ports with nmap',
    'Identify services and versions from a scan',
    'Read a captured packet and recognise plaintext protocols',
  ],
  steps: [
    {
      id: 'rnet-b-01',
      title: 'The rules that make this legal',
      read: `Offensive networking — scanning, capturing traffic, intercepting and pivoting — is a legitimate, valuable profession **only when it is authorized**. The very same nmap scan is a paid engagement on one network and a criminal offence on another; **the only difference is permission.** This is the first and most important lesson, and it governs everything in this track.

## The law is not optional

Accessing or interfering with a computer network without authorization is a criminal offence almost everywhere: the **Computer Fraud and Abuse Act** (US), the **Computer Misuse Act** (UK), and equivalents worldwide. Even *scanning* a network you have no permission to touch can be unlawful in many places. Intent does not matter, "I was just looking" does not matter, and "I was going to report it" does not matter.

## Authorization must be explicit and in writing

Legitimate testing rests on **written authorization** before anything begins:

- **Scope** — precisely which IP ranges, hosts and networks you may test, and which are off-limits. You never touch anything outside scope, and network ranges are easy to overrun by accident, so scope discipline matters especially here.
- **Rules of engagement** — what is permitted (is denial-of-service allowed? traffic interception?), the testing window, and who to contact.
- **Authority** — signed by someone who actually controls the network.

## Where you may practise

Because you will not have authorization for real networks while learning, this whole track uses targets that are legal by design:

- **Your own lab** — virtual machines on an isolated virtual network you create and own (this level sets one up).
- **CTF and lab platforms** — Hack The Box, TryHackMe, and similar, which grant permission as part of their terms.
- **Deliberately vulnerable networks** you build yourself.

## The ethical frame

Never scan, sniff, or intercept a network you do not own or have written permission to test — not your neighbour's Wi-Fi, not a café, not your employer's network without authorization. The purpose is always defensive: you probe networks so their owners can secure them. Keep every technique in this track inside that boundary, always.`,
      sample: {
        lang: 'text',
        caption: 'The same scan, two completely different situations',
        code: `nmap -sV 10.0.0.0/24   ; discovered open ports and services

  ON A NETWORK YOU ARE AUTHORIZED TO TEST:
    -> a finding in a report; attack surface the owner can reduce.
       Legitimate, professional work.

  ON A NETWORK YOU ARE NOT AUTHORIZED TO TEST:
    -> unauthorized access/interference. A crime under the CFAA /
       Computer Misuse Act / local law, regardless of intent.

The command is identical. AUTHORIZATION is the entire difference.`,
        output: `Offensive networking is legal ONLY with explicit written
authorization defining scope (which ranges/hosts) and rules of
engagement. Practise only on your own lab or CTF/lab platforms.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What single factor separates legitimate network penetration testing from a criminal offence?',
        options: [
          'Whether the tester intends any harm',
          'Explicit authorization — written permission from someone who controls the network, defining the in-scope IP ranges and rules of engagement — because the same techniques are legal on authorized networks and a crime on unauthorized ones, regardless of intent',
          'Whether only scanning (not exploitation) was performed',
          'Whether the findings are eventually reported',
        ],
        answer: 1,
        explain:
          'Network testing techniques are inherently dual-use: identical to a criminal’s, and legal only because permission was granted. Laws like the CFAA and Computer Misuse Act criminalise unauthorized access and interference — and in many jurisdictions even unauthorized scanning. Intent to help, or a plan to report, does not make it lawful. Legitimate work rests on explicit written authorization defining the in-scope IP ranges and the rules of engagement, granted by someone with authority over the network. Scope discipline matters especially in networking, where a CIDR typo can send a scan far outside the authorized range.',
        hint: 'Intent, "only scanning", and later reporting do not make it legal. What single thing does?',
      },
    },

    {
      id: 'rnet-b-02',
      title: 'Building a network lab you own',
      read: `Since you will only practise on networks you own or are authorized to test, the first practical step is to build a **lab** — an isolated virtual network of machines you control completely, where you can scan, capture and intercept freely and legally.

## The pieces

- **A hypervisor** — VirtualBox or VMware (free tiers exist) to run virtual machines and, crucially, virtual *networks*.
- **An attacker VM** — Kali Linux or Parrot OS, which come with nmap, Wireshark, tcpdump, Responder and the rest of the toolkit preinstalled. This is where you work *from*.
- **Target VMs** — a Windows VM, a Linux VM, and deliberately vulnerable machines (Metasploitable, VulnHub boxes) to scan and attack.
- **A virtual network** — this is the key part for a networking track: the hypervisor lets you place all these VMs on a shared **host-only / internal network**, so they can see each other but nothing else.

## Isolate the lab — this matters legally and safely

Configure the VMs on a **host-only or internal network** so they can talk to *each other* but **cannot reach your real network or the internet**. In a networking track this is doubly important: your scans, ARP spoofing and traffic capture must never touch a real network. A misdirected scan or a MITM tool loose on a real LAN is exactly the unauthorized activity the law forbids. Isolation guarantees your practice stays inside machines you own.

## Confirming isolation

From the attacker VM you should be able to reach the lab targets but *not* the internet. A quick check (reaching a lab host but failing to reach a public address) proves the boundary is in place before you run anything noisy.

## Why a lab is non-negotiable

You cannot learn network attacks by reading alone, and you cannot practise on real networks. The lab makes hands-on learning both possible and lawful: a self-contained network where every technique in this track can be tried against machines that exist to be tested. Set it up before going further, and treat it as the *only* place these techniques are used, until you hold written authorization for something else.`,
      sample: {
        lang: 'bash',
        caption: 'Confirming your lab network is isolated before scanning',
        code: `# In the hypervisor, put every VM on the SAME host-only network:
#   Attacker: Kali        (host-only net, e.g. 192.168.56.0/24)
#   Targets : Windows/Linux/Metasploitable (same host-only net)

# From Kali: what is my address and network?
ip addr show | grep 'inet '

# Reach a lab target...
ping -c1 192.168.56.101      # a target on the host-only net

# ...but NOT the internet (isolation working):
ping -c1 8.8.8.8             # should FAIL on an isolated net`,
        output: `inet 192.168.56.10/24    <- attacker on the lab net
64 bytes from 192.168.56.101 ... time=0.4 ms   <- target reachable
ping: connect: Network is unreachable          <- internet blocked
=> the lab is isolated; safe to scan inside it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is network isolation (a host-only/internal virtual network) especially critical for a lab used to practise offensive networking?',
        options: [
          'It makes the VMs boot faster',
          'Because scanning, ARP spoofing and traffic capture must never reach a real network — a misdirected scan or a loose MITM tool on a real LAN is exactly the unauthorized activity the law forbids — so isolation keeps all of it confined to machines you own',
          'Because nmap only works on isolated networks',
          'Because Wireshark cannot capture traffic on the internet',
        ],
        answer: 1,
        explain:
          'A networking lab does noisy, intrusive things — scanning ranges, poisoning ARP, capturing traffic, relaying authentication. Every one of those must stay inside machines you own. A host-only or internal virtual network lets the lab VMs interact with each other while guaranteeing that a mistyped range, a broad scan, or a MITM tool cannot reach your real network or the internet, where the same activity would be unauthorized and unlawful. Confirming isolation (you can reach a lab host but not a public address) before running anything is a habit worth keeping.',
        hint: 'What must never happen when you run a broad scan or turn on a traffic-interception tool?',
      },
    },

    {
      id: 'rnet-b-03',
      title: 'How networks work: the layers',
      read: `To attack networks you must understand how they work, and networking is built in **layers**. Each layer has a job and talks to the same layer on the other machine. Attackers target specific layers, so knowing the model tells you where an attack lives.

## The layers (TCP/IP model, simplified)

- **Link layer** — the physical/local network: Ethernet, Wi-Fi, and **MAC addresses** (hardware addresses unique to each network card). This is your *local* segment. ARP spoofing lives here.
- **Internet layer** — **IP addresses** and routing: getting a packet from your network to a distant one, hop by hop. IP spoofing and routing attacks live here.
- **Transport layer** — **TCP** and **UDP**, and **ports**: delivering data to the right *program* on a host, reliably (TCP) or not (UDP). Port scanning lives here.
- **Application layer** — the protocols you actually use: HTTP, DNS, SMB, FTP, SSH. Most service attacks live here.

## Why the layers matter to an attacker

Data is **encapsulated**: an application message is wrapped in a TCP segment, wrapped in an IP packet, wrapped in an Ethernet frame — like envelopes inside envelopes. When you capture traffic you peel these layers apart. When you scan, you work at the transport layer (ports). When you spoof ARP, you work at the link layer. Naming the layer of a technique keeps your thinking clear.

## Addresses at each level

- A **MAC address** identifies a card on the *local* segment (e.g. \`00:0c:29:ab:cd:ef\`).
- An **IP address** identifies a host across networks (e.g. \`192.168.56.101\`).
- A **port** identifies a *service* on a host (e.g. \`443\` for HTTPS).

Together, an IP plus a port (a *socket*) points at one specific service on one specific machine — which is exactly what a scanner enumerates. Hold this model in mind; every later step names the layer it operates on.`,
      sample: {
        lang: 'text',
        caption: 'Encapsulation: envelopes inside envelopes',
        code: `Application:  GET / HTTP/1.1  (the actual request)
   wrapped in
Transport:    TCP segment  [src port 51000 -> dst port 80]
   wrapped in
Internet:     IP packet    [src 192.168.56.10 -> dst 192.168.56.101]
   wrapped in
Link:         Ethernet frame [src MAC .. -> dst MAC ..]

Attacks by layer:
  Link      -> ARP spoofing (local segment)
  Internet  -> IP spoofing, routing attacks
  Transport -> port scanning (TCP/UDP)
  Applic.   -> attacking HTTP/DNS/SMB/FTP/SSH services`,
        output: `A host is identified by IP; a service on it by port; a card on
the local segment by MAC. IP + port = a socket = one service on
one machine, which is exactly what a port scanner enumerates.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'At which layer does an attack that scans for open ports on a host operate, and why?',
        options: [
          'The link layer, because ports are hardware addresses',
          'The transport layer, because ports (TCP/UDP) are how the transport layer delivers data to the correct program on a host — so enumerating open ports probes which services are listening',
          'The application layer, because ports are part of HTTP',
          'The internet layer, because ports identify networks',
        ],
        answer: 1,
        explain:
          'Networking is layered: the link layer uses MAC addresses on the local segment, the internet layer uses IP addresses to route between networks, the transport layer uses TCP/UDP ports to deliver data to the correct program on a host, and the application layer carries protocols like HTTP and DNS. Port scanning operates at the transport layer: it probes which ports are open (which services are listening) on a host. An IP plus a port is a socket — one service on one machine — which is precisely what a scanner enumerates. Naming the layer of each technique keeps your reasoning clear.',
        hint: 'Which layer owns TCP, UDP and the concept of a port?',
      },
    },

    {
      id: 'rnet-b-04',
      title: 'IP, ports and the attack surface',
      read: `Now zoom in on the two ideas an attacker uses constantly: **IP addresses** and **ports**. Together they define a network's **attack surface** — the set of services an attacker can reach and try.

## IP addresses and ranges

An **IPv4 address** is four numbers, like \`192.168.56.101\`. Networks are described as **ranges** in CIDR notation: \`192.168.56.0/24\` means the 256 addresses \`192.168.56.0\` to \`192.168.56.255\`. The \`/24\` says the first 24 bits are the network part. Testers work with ranges constantly, and getting the range right is a scope-safety issue: \`/24\` is 256 hosts, \`/16\` is over 65,000. A wrong CIDR can send a scan far outside authorization.

## Private vs public addresses

Some ranges are **private** (used inside home/office networks, not routable on the internet): \`10.0.0.0/8\`, \`172.16.0.0/12\`, \`192.168.0.0/16\`. Your lab will use one of these. Public addresses are reachable across the internet — and are exactly what you must never scan without authorization.

## Ports and services

A **port** is a number (0-65535) identifying a service on a host. Common ones you will meet constantly:

- **22** — SSH (remote shell)
- **80 / 443** — HTTP / HTTPS (web)
- **445** — SMB (Windows file sharing)
- **53** — DNS
- **21** — FTP, **23** — Telnet, **25** — SMTP

A port is **open** (a service is listening), **closed** (nothing listening), or **filtered** (a firewall is dropping the probe). The set of open ports on the in-scope hosts *is* the attack surface: each open port is a service you can enumerate and test.

## The mindset

Every open port is a question: *what is listening here, what version, and is it weak?* The next steps turn that question into scanning. Keep the scope-safety habit: know exactly which IP range you are authorized to touch, and confirm your target before every scan.`,
      sample: {
        lang: 'text',
        caption: 'Reading a target: IP, range, and the ports that matter',
        code: `Target host : 192.168.56.101
In-scope net: 192.168.56.0/24   (256 addresses .0 - .255)
  /24 = 256 hosts   /16 = 65,536 hosts  <- CIDR = scope safety!

Ports = services on that host:
  22  SSH      80  HTTP     443 HTTPS
  445 SMB      53  DNS      21  FTP    23 Telnet   25 SMTP

Port states:
  open     -> a service is listening (attack surface)
  closed   -> nothing listening
  filtered -> a firewall is dropping the probe`,
        output: `Attack surface = the open ports on the in-scope hosts. Each open
port is a service to enumerate and test. Always confirm the exact
authorized range (CIDR) before scanning.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A port scan reports a port as "filtered" rather than open or closed. What does that most likely mean?',
        options: [
          'A service is definitely running and vulnerable',
          'A firewall (or similar) is dropping the probes, so the scanner cannot tell whether a service is listening — as opposed to "open" (a service responded) or "closed" (the host said nothing is listening)',
          'The port number is invalid',
          'The host is offline',
        ],
        answer: 1,
        explain:
          'A port has three basic states from a scanner’s view. "Open" means a service responded and is listening — real attack surface. "Closed" means the host actively indicated nothing is listening on that port. "Filtered" means something (usually a firewall or packet filter) is dropping the probes, so the scanner gets no clear answer and cannot determine whether a service is there. Filtered results are common and meaningful: they often mark where a firewall sits. And remember the scope-safety habit — an IP range in CIDR (/24 = 256 hosts, /16 = 65,536) must match your authorization exactly before you scan.',
        hint: 'Which state means "I sent probes but something silently dropped them"?',
      },
    },

    {
      id: 'rnet-b-05',
      title: 'Reconnaissance: finding live hosts',
      read: `Before scanning ports you need to know **which hosts exist**. On a network of 256 possible addresses, most may be empty. **Host discovery** (a "ping sweep") finds the live machines so you scan only real targets — faster, quieter, and tidier.

## How host discovery works

The classic method sends a small probe to each address and notes which reply. \`nmap -sn\` ("no port scan") does host discovery only: it uses ICMP echo (ping), plus ARP on the local network and probes to common ports, to decide which hosts are up. On your **local** lab segment, nmap uses **ARP** — asking "who has this IP?" on the link layer — which is fast and reliable because it cannot be blocked the way ICMP can.

## Reading the result

You get a list of the addresses that answered — your live hosts. That list, not the whole range, is what you scan next. Discovering that 5 of 256 addresses are alive turns a huge scan into a focused one.

## Passive vs active recon

- **Passive** recon gathers information without touching the target: public DNS records, search engines, documentation. It is invisible.
- **Active** recon (like a ping sweep) *does* touch the target — it sends packets — and can be logged. Host discovery is the first active step.

On an engagement you often begin passively (what can you learn without sending a packet?) and then move to active discovery within scope. In the lab you can go straight to active discovery.

## The scope-safety reminder, again

Host discovery is where a wrong CIDR bites hardest: \`-sn 192.168.56.0/24\` sweeps your lab; a typo could sweep something you have no right to touch. Always confirm the range against your authorization before you press enter. In the lab, sweep freely and note which hosts are alive — those are your targets for the rest of the level.`,
      sample: {
        lang: 'bash',
        caption: 'A ping sweep to find live hosts (lab network)',
        code: `# Host discovery only (no port scan), on the in-scope lab range:
nmap -sn 192.168.56.0/24

# On the LOCAL segment nmap uses ARP, which is fast and reliable.
# The output lists only the addresses that answered = live hosts.`,
        output: `Nmap scan report for 192.168.56.1     Host is up (gateway)
Nmap scan report for 192.168.56.10    Host is up (attacker)
Nmap scan report for 192.168.56.101   Host is up
Nmap scan report for 192.168.56.102   Host is up
Nmap done: 256 IP addresses (4 hosts up) scanned

=> scan the 4 live hosts next, not all 256 addresses.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do testers usually run host discovery (a ping sweep, e.g. nmap -sn) before scanning ports?',
        options: [
          'Because port scanning is illegal without a ping sweep first',
          'To find which of the many possible addresses are actually live, so the more intrusive port scanning is focused only on real hosts — faster, quieter, and tidier than scanning every address',
          'Because a ping sweep reveals all open ports automatically',
          'Because it encrypts the scan traffic',
        ],
        answer: 1,
        explain:
          'A range like /24 has 256 possible addresses, but usually only a handful are live. Host discovery (nmap -sn) sends light probes — ICMP, and ARP on the local segment — to learn which addresses answer, without doing a full port scan. You then aim the heavier port scanning only at the live hosts, which is faster and generates less noise. It is also the first *active* recon step (it sends packets and can be logged), typically following passive recon. As always, confirm the CIDR matches your authorization — a ping sweep is exactly where a mistyped range does the most damage.',
        hint: 'Out of 256 possible addresses, how many are usually real — and what does that let you avoid?',
      },
    },

    {
      id: 'rnet-b-06',
      title: 'Your first port scan with nmap',
      read: `With live hosts identified, you scan a host's **ports** to find its services. **nmap** is the standard tool, and a basic scan is the single most common action in network testing.

## A basic scan

\`nmap 192.168.56.101\` scans the ~1000 most common TCP ports on that host and reports which are open, closed or filtered, with a guess at the service by port number. That alone tells you a great deal: an open 445 says "Windows file sharing"; open 22 says "SSH"; open 80 says "a web server."

## How a default scan works (briefly)

nmap's default TCP scan is a **SYN scan** (\`-sS\`, needs root): it sends a TCP SYN (the first packet of the handshake) to each port. If the port answers with SYN/ACK, it is **open**; if it answers RST, it is **closed**; if nothing comes back, it is **filtered**. It never completes the handshake, which is why it is fast and relatively quiet. (You will study the handshake properly later; for now, "SYN scan = knock on each port, note who answers.")

## Useful basics

- \`-p-\` scans **all 65,535** ports, not just the top 1000 — slower, but finds services on odd ports.
- \`-p 80,443,445\` scans specific ports.
- \`-Pn\` skips host discovery (treats the host as up), useful when a host ignores pings but is really there.

## Reading and recording

Every open port is a lead. Record them: the open ports across all in-scope hosts are your attack surface, and your report will reference them. Beginners under-scan (top-1000 only) and miss services on high ports; a thorough tester scans all ports on important hosts.

In the lab, scan a live target now and read the list of open ports. The next step turns "port 80 is open" into "it is Apache 2.4.49" — the detail that finds vulnerabilities.`,
      sample: {
        lang: 'bash',
        caption: 'A first port scan, and an all-ports scan',
        code: `# Scan the top ~1000 TCP ports on one live host:
nmap 192.168.56.101

# Scan ALL 65,535 ports (thorough; slower):
nmap -p- 192.168.56.101

# Scan specific ports only:
nmap -p 80,443,445 192.168.56.101`,
        output: `Nmap scan report for 192.168.56.101
PORT     STATE  SERVICE
22/tcp   open   ssh
80/tcp   open   http
139/tcp  open   netbios-ssn
445/tcp  open   microsoft-ds
3306/tcp open   mysql

=> attack surface: SSH, a web server, SMB, and MySQL.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'nmap’s default TCP scan is a SYN scan: it sends a TCP SYN to each port and never completes the handshake. Why is this a reasonable default?',
        options: [
          'Because it exploits the services it finds',
          'Because sending only the first handshake packet and reading the reply (SYN/ACK = open, RST = closed, no reply = filtered) reliably determines a port’s state while being fast and relatively quiet — it never fully connects',
          'Because it is the only scan that works without root',
          'Because it scans all 65,535 ports by default',
        ],
        answer: 1,
        explain:
          'A SYN scan sends the SYN (first packet of the TCP three-way handshake) to each port and reads the response: SYN/ACK means the port is open, RST means closed, and no reply means filtered. Because it never sends the final ACK to complete the handshake, it is fast and lighter than a full connection, which is why nmap uses it by default (with root). Note that the default scans only the top ~1000 ports; use -p- to scan all 65,535 and avoid missing services on unusual ports. The open ports you record are the host’s attack surface.',
        hint: 'What does sending just the first handshake packet let you learn, and what does not completing the handshake buy you?',
      },
    },

    {
      id: 'rnet-b-07',
      title: 'Service and version detection',
      read: `Knowing "port 80 is open" is a start; knowing "it is Apache 2.4.49" is what finds a vulnerability. **Version detection** turns a port number into a specific, named, versioned service — the detail that maps to known weaknesses.

## How nmap detects versions

\`nmap -sV\` adds **service/version detection**: after finding an open port, nmap talks to the service, sends known probes, and matches the responses against a database to identify the software and version. So instead of "80/tcp open http" you get "80/tcp open http Apache httpd 2.4.49". That version string is directly searchable against vulnerability databases.

## Going further

- \`-sV\` — service and version detection.
- \`-O\` — OS detection (guesses the operating system from network fingerprints).
- \`-A\` — aggressive: version detection, OS detection, default scripts and traceroute together. Thorough, but louder.
- \`-sC\` — run the default set of NSE scripts (safe, informative checks like grabbing an HTTP title or listing SMB shares).

## Why the version is the pivot

A named version is the bridge from *enumeration* to *finding*: "Apache 2.4.49" recalls a specific path-traversal CVE; "vsftpd 2.3.4" recalls a famous backdoored version; "OpenSSH 7.2" narrows the exposure. A tester's core loop is: scan → get versions → check each version for known vulnerabilities → verify. Without the version you are guessing; with it you are researching.

## The record you build

For each in-scope host you end up with a table (in your notes, not markdown) of: port, service, product, version. That inventory is the backbone of the engagement — it drives what you try, and it appears in the report so the owner knows exactly what is exposed and at which version. In the lab, run \`-sV\` on a target and note the versions; those strings are what you would research next.`,
      sample: {
        lang: 'bash',
        caption: 'Version detection turns a port into a named, versioned service',
        code: `# Service + version detection on a host:
nmap -sV 192.168.56.101

# Thorough (version + OS + default scripts + traceroute), louder:
nmap -A 192.168.56.101`,
        output: `PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 7.2p2 Ubuntu
80/tcp   open  http     Apache httpd 2.4.49
445/tcp  open  microsoft-ds Samba smbd 4.x
3306/tcp open  mysql    MySQL 5.7.29

=> now each VERSION string can be checked for known CVEs.
   "Apache 2.4.49" -> a specific path-traversal issue to verify.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is nmap’s version detection (-sV) so important to a tester, beyond simply knowing a port is open?',
        options: [
          'It exploits the service automatically',
          'A specific product and version (e.g. "Apache httpd 2.4.49") is the bridge from enumeration to a finding — it can be checked directly against known vulnerabilities — whereas a bare open port only tells you something is listening',
          'It is required before nmap can scan any port',
          'It hides the scan from the target',
        ],
        answer: 1,
        explain:
          'A bare open port tells you a service is listening; a named product and version tells you *which* software and therefore which known vulnerabilities might apply. Version detection (-sV) probes the service and matches responses against a database to produce strings like "Apache httpd 2.4.49" or "vsftpd 2.3.4" — exactly what you research against vulnerability databases. That is the tester’s core loop: scan, get versions, check each version for known issues, verify. The versioned inventory you build per host drives what you try and appears in the report so the owner knows what is exposed.',
        hint: 'What can you do with "Apache 2.4.49" that you cannot do with just "port 80 open"?',
      },
    },

    {
      id: 'rnet-b-08',
      title: 'Reading a packet: capture basics',
      read: `Scanning tells you what services exist; **capturing traffic** lets you see the data actually crossing the network. Reading a packet is a foundational skill — and it immediately reveals which protocols leak secrets.

## The tools

- **tcpdump** — a command-line capture tool, on almost every system.
- **Wireshark** — a graphical analyzer that decodes packets into readable fields, with powerful display filters. It is the standard for analysis.

Both **capture** frames from a network interface and let you inspect every layer (recall the encapsulation model): Ethernet, IP, TCP/UDP, and the application data inside.

## What you can see

On traffic you are authorized to capture, you can read:

- **Addresses** — source/destination IP and port for every packet (who talks to whom).
- **Protocols** — nmap guesses services; capture *confirms* them and shows the conversation.
- **Content** — and here is the key security lesson: **unencrypted protocols expose their contents in the clear.** An HTTP login, an FTP or Telnet session, or an unencrypted email carries usernames and passwords as readable text in the packets.

## The ethics of capture

Capturing traffic means reading other people's data — so it is bound tightly by authorization. You capture only on networks you own or are explicitly permitted to test, and you handle whatever you see (which may be highly sensitive) responsibly, exactly as the scope requires. In the lab, generate some traffic (an FTP login to a target, say) and watch it appear in Wireshark — including, for plaintext protocols, the credentials.

## Why this matters going forward

Capture is the foundation of the interception attacks in later levels (ARP spoofing, MITM): once you can *position* yourself to see traffic, reading it is this skill. And it teaches the single biggest network defence lesson viscerally: **encrypt everything**, because anything unencrypted is readable by anyone who can capture it.`,
      sample: {
        lang: 'bash',
        caption: 'Capturing traffic and spotting a plaintext credential',
        code: `# Capture on an interface, show FTP traffic (lab only, authorized):
sudo tcpdump -i eth0 -A 'tcp port 21'

# -A shows packet contents as ASCII. Watch an FTP login go by...`,
        output: `192.168.56.10.51000 > 192.168.56.101.21: Flags [P.]
...USER admin
192.168.56.10.51000 > 192.168.56.101.21: Flags [P.]
...PASS S3cr3tP@ss

=> FTP (port 21) sends credentials in PLAINTEXT. Anyone able to
   capture this traffic reads them. The lesson: encrypt everything
   (use SFTP/FTPS, HTTPS, SSH) so capture reveals nothing usable.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'While capturing authorized lab traffic you can read a user’s FTP username and password directly in the packets. What is the core lesson?',
        options: [
          'FTP is faster than encrypted alternatives',
          'Unencrypted protocols (FTP, Telnet, plain HTTP) expose their contents — including credentials — to anyone able to capture the traffic, which is why sensitive traffic must be encrypted (SFTP/FTPS, HTTPS, SSH)',
          'Packet capture only works on FTP',
          'The credentials are encrypted but tcpdump decrypts them',
        ],
        answer: 1,
        explain:
          'Packet capture lets you read every layer of traffic you are authorized to see. Unencrypted application protocols — FTP, Telnet, plain HTTP, unencrypted email — carry their contents, credentials included, as readable text, so anyone positioned to capture the traffic reads them in the clear (tcpdump does not decrypt anything; there is nothing to decrypt). The defensive lesson is immediate and universal: encrypt everything, so that even an attacker who captures the traffic sees nothing usable. This also underpins later interception attacks: once you can position yourself to see traffic, reading plaintext is trivial.',
        hint: 'What property of FTP/Telnet/plain-HTTP makes the credentials readable, and what fixes it?',
      },
    },

    {
      id: 'rnet-b-09',
      title: 'Common protocols and their weaknesses',
      read: `You keep meeting the same handful of protocols. Knowing each one's job — and its classic weakness — lets you read a scan and immediately know what to look at. Here is the beginner's map.

## Plaintext protocols (the low-hanging fruit)

- **FTP (21)** and **Telnet (23)** — file transfer and remote shell, both **entirely plaintext**. Credentials and data are readable on capture. Finding these open is itself a finding; their secure replacements are **SFTP/FTPS** and **SSH**.
- **HTTP (80)** — web, plaintext. Logins over plain HTTP leak. **HTTPS (443)** is the encrypted form.
- **SMTP/POP3/IMAP (25/110/143)** — email, plaintext unless the secured variants are used.

## Protocols with richer attack surface

- **SMB (445)** — Windows file sharing. A huge attack surface: null sessions, share enumeration, and historically severe vulnerabilities (EternalBlue). Always investigate open 445.
- **DNS (53)** — name resolution. Can leak internal structure (zone transfers), and is abused for tunnelling.
- **SSH (22)** — encrypted remote shell. Strong, but weak passwords and old versions are still attackable.
- **SNMP (161/udp)** — device management. Default "community strings" (like \`public\`) often expose device configuration.

## Why this map matters

When a scan comes back, this map turns the port list into a plan: open 21/23 → capture plaintext creds; open 445 → enumerate SMB; open 161 → try default SNMP strings; open 80 → look at the web app. You are not memorising exploits, you are learning *where each protocol is typically weak* so enumeration is directed, not random.

## The recurring theme

Notice how many weaknesses are simply **"it is unencrypted"** or **"it ships with weak defaults."** Those two ideas — encrypt everything, change defaults — are the defensive mirror of half of network attacking. In the lab, map the open ports on your targets to this list and note what you would investigate for each.`,
      sample: {
        lang: 'text',
        caption: 'A beginner map: port -> protocol -> typical weakness',
        code: `PORT  PROTOCOL  TYPICAL WEAKNESS / WHAT TO LOOK AT
21    FTP       plaintext creds; anonymous login
23    Telnet    plaintext everything (should not exist)
80    HTTP      plaintext; the web app itself
443   HTTPS     the web app (encrypted transport)
445   SMB       null sessions, shares, old CVEs (EternalBlue)
53    DNS       zone transfer -> internal names; tunnelling
22    SSH       weak passwords, old versions
161   SNMP(udp) default community strings ("public")
25    SMTP      plaintext; user enumeration`,
        output: `A port list becomes a plan: 21/23 -> capture plaintext; 445 ->
enumerate SMB; 161 -> try default strings; 80 -> the web app.
Half of all findings reduce to "unencrypted" or "weak defaults".`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Two recurring themes explain a large fraction of network weaknesses. What are they?',
        options: [
          'Slow hardware and outdated cables',
          '"It is unencrypted" (plaintext protocols like FTP/Telnet/HTTP leak their contents) and "it ships with weak defaults" (e.g. default SNMP community strings) — whose defensive mirror is encrypt everything and change defaults',
          'Too many open ports and too few users',
          'The use of TCP instead of UDP',
        ],
        answer: 1,
        explain:
          'Reading the beginner protocol map, a large share of findings reduce to two ideas. First, unencrypted protocols — FTP, Telnet, plain HTTP, unsecured email — expose their contents, including credentials, to anyone who can capture the traffic. Second, many services ship with weak defaults, like SNMP’s default "public" community string or anonymous FTP, that expose information or access out of the box. The defensive mirror is exactly those two: encrypt everything (SFTP/FTPS, HTTPS, SSH) and change insecure defaults. Learning where each protocol is typically weak turns a raw port list into a directed enumeration plan.',
        hint: 'Think about what FTP/Telnet/HTTP share, and what a default SNMP "public" string represents.',
      },
    },

    {
      id: 'rnet-b-10',
      title: 'The network attacker’s methodology',
      read: `Like the other tracks, offensive networking follows a **methodology** — a repeatable set of phases. On a network engagement the phases have a network flavour, and knowing them turns scattered commands into a plan.

## The phases, network-flavoured

1. **Reconnaissance** — learn about the target network before (passive) and as you (active) touch it: ranges in scope, public information, then live-host discovery.
2. **Scanning & enumeration** — the heart of network testing: port scan the live hosts, detect service versions, and enumerate each service (SMB shares, DNS records, SNMP data). **Enumeration is where network engagements are won** — the more services you map and detail, the more attack surface you find.
3. **Gaining access** — use a discovered weakness (a vulnerable service version, weak credentials, a plaintext-captured password, a misconfiguration) to get onto a host.
4. **Post-exploitation & pivoting** — from a foothold, see what *else* the network exposes. A compromised host often reaches internal segments your attacker VM cannot; **pivoting** through it (a later level) extends your reach.
5. **Reporting** — document what you found, how, and how to fix it. This is the deliverable.

## Enumeration-first

The beginner mistake is to rush to "gaining access." The professional habit is to **enumerate thoroughly first**: scan all ports on important hosts, detect versions, list shares and records, capture traffic. Ninety percent of the value is in a complete map; access follows almost naturally from a weakness the map reveals.

## The loop within a phase

Within enumeration you loop: each service you enumerate may reveal another host, credential, or name to enumerate. You keep pulling threads until the picture is complete. Then you turn the clearest weakness into access.

## Where you are

This beginner level has taught phases 1-2 (recon, scanning, and reading traffic). Later levels go deep on interception, service attacks, and pivoting. Hold the methodology as your map: it tells you *what to do next* on any network you are authorized to test, and its shape is the shape of your final report.`,
      sample: {
        lang: 'text',
        caption: 'The network engagement methodology',
        code: `1. RECON        passive info + live-host discovery (in scope)
2. SCAN/ENUM    port scan -> versions -> enumerate each service
                (SMB shares, DNS, SNMP, capture) <- WIN HERE
3. ACCESS       weak version / creds / captured password -> foothold
4. POST/PIVOT   what else does the network expose? pivot deeper
5. REPORT       findings + fixes = the deliverable

Beginner mistake: rush to ACCESS.
Pro habit: ENUMERATE thoroughly first; access follows the map.`,
        output: `The methodology is your map on any authorized network. Most of
the value is a complete enumeration; access follows from the
weakness the map reveals; the report is the deliverable.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the network testing methodology, which phase do professionals consider decisive, and why?',
        options: [
          'Gaining access, because a foothold is the only real goal',
          'Scanning & enumeration, because thoroughly mapping hosts, service versions and each service’s details reveals the attack surface — access then follows almost naturally from a weakness the map exposes',
          'Reporting, because it is done last',
          'Reconnaissance, because no packets are sent',
        ],
        answer: 1,
        explain:
          'Network engagements are won in enumeration. Thoroughly scanning the live hosts, detecting service versions, and enumerating each service (SMB shares, DNS records, SNMP data, captured traffic) builds a complete map of the attack surface — and access almost always follows from a weakness that map reveals (a vulnerable version, weak credentials, a plaintext password). The beginner error is to rush toward gaining access; the professional habit is enumerate-first, because roughly ninety percent of the value is in the complete picture. The methodology (recon → scan/enumerate → access → post/pivot → report) is both your plan and the shape of your final report.',
        hint: 'Where does most of the value come from — the map of the network, or the first foothold?',
      },
    },

    {
      id: 'rnet-b-11',
      title: 'Interpreting results responsibly',
      read: `Scanning and capturing produce a lot of raw output. Turning it into something **useful and responsible** — accurate findings, handled carefully — is what makes you a tester rather than someone who runs tools.

## From output to finding

A finding is not "port 445 is open." A finding is: *what* is exposed, *why it matters*, and *how to fix it*. For example: "Host 192.168.56.101 exposes SMBv1 (Samba 4.x) on 445; SMBv1 has severe known vulnerabilities (e.g. EternalBlue); disable SMBv1 and restrict 445 to management networks." That is actionable. Practise writing every result in that shape: exposure, impact, remedy.

## Accuracy and false positives

Tools are not infallible. A version guess can be wrong; a "vulnerable" banner may be a backported, patched build; a filtered port may hide a service or nothing. **Verify before you claim.** Over-claiming ("this host is vulnerable to X!") without confirming damages trust and can send defenders chasing ghosts. Under a professional standard, a finding you assert is a finding you checked.

## Handling sensitive data

Capture and enumeration expose real data — credentials, internal names, personal information. Handle it exactly as scope requires: store it securely, share it only with authorized people, and never keep it beyond the engagement. Seeing sensitive data is a responsibility, not a trophy.

## Prioritising

Not all findings are equal. A plaintext admin credential on the wire outranks an informational banner. Order findings by real risk (impact × exploitability) so the owner fixes the dangerous things first. A report that buries a critical issue among trivia has failed at its job.

## The habit

For every result, ask: is it accurate (did I verify)? what is the real impact? what is the fix? how sensitive is any data involved? That discipline — not the scan itself — is the professional skill. In the lab, take one open port from your scan and write it up as exposure / impact / remedy.`,
      sample: {
        lang: 'text',
        caption: 'Turning raw output into a responsible finding',
        code: `RAW:      445/tcp open  microsoft-ds  Samba smbd 4.x (SMBv1 enabled)

FINDING (exposure / impact / remedy):
  Exposure: SMBv1 is enabled on 192.168.56.101:445.
  Impact  : SMBv1 has severe known vulns (e.g. EternalBlue);
            reachable from the general network segment.
  Remedy  : Disable SMBv1; restrict 445 to management VLAN.
  Verified: confirmed dialect via enumeration (not a bare guess).
  Priority: HIGH (remote code execution class).`,
        output: `A finding = exposure + impact + fix, verified and prioritised.
"Port 445 open" is not a finding. Verify before you claim, order
by real risk, and handle any sensitive data as scope requires.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What turns raw scan output into a professional finding?',
        options: [
          'Listing every open port with no further detail',
          'Stating the exposure, its real impact, and a concrete fix — verified before it is claimed, prioritised by real risk, with any sensitive data handled as scope requires',
          'Claiming the maximum possible severity for every result to be safe',
          'Keeping the results secret from the network owner',
        ],
        answer: 1,
        explain:
          'A raw line like "445 open" is data, not a finding. A professional finding states what is exposed, why it matters (impact), and how to fix it — and it is verified before being asserted, because tools produce false positives (wrong version guesses, backported patches, ambiguous filtered ports) and over-claiming destroys trust. Findings are prioritised by real risk (impact × exploitability) so the owner fixes the dangerous issues first, and any sensitive data encountered is handled strictly per scope. That discipline — exposure/impact/fix, verified and prioritised — is the professional skill, not the scan itself.',
        hint: 'It is not the raw port list, not maximum severity, and not secrecy — what three things does a finding state, and what must you do before claiming it?',
      },
    },

    {
      id: 'rnet-b-12',
      title: 'Project: map and enumerate your lab network',
      read: `Time to put the beginner skills together on **your own lab network**. This project is the network equivalent of the other tracks' capstones: a full recon-and-enumeration pass, written up responsibly. Do it only on the isolated lab you built.

## The brief

You have an isolated lab with several VMs on one host-only network. Your job: discover every live host, map its services, read some traffic, and produce a clean enumeration report — exactly the first two methodology phases done thoroughly.

## Steps

1. **Confirm isolation** — verify from the attacker VM that you can reach the lab but not the internet (the safety habit).
2. **Discover hosts** — a ping sweep of the in-scope range (\`nmap -sn\`) to list live hosts.
3. **Scan ports** — for each live host, scan ports (start with a default scan, then \`-p-\` on the interesting ones) and record open ports.
4. **Detect versions** — \`-sV\` (and \`-sC\`/\`-A\` where useful) to get product and version for each open port.
5. **Capture some traffic** — generate and capture a plaintext session (e.g. an FTP or HTTP login to a target) and confirm you can read it.
6. **Write it up** — for each host: a service inventory (port, service, version), and for each notable service a finding in exposure/impact/fix form, prioritised.

## The standard

You have hit the beginner bar when your report lets a reader who never saw your lab understand: which hosts exist, what each exposes and at which version, which protocols leak (with proof from capture), and what the top few things to fix are — all produced within the isolation boundary. That is a genuine, if small, network enumeration engagement.

## Where next

Amateur goes deeper: scan types and timing, the nmap scripting engine, service enumeration in detail, and the first interception work (sniffing and ARP). Everything there rests on what you did here. Keep the boundary — own lab, or written authorization — as you go.`,
      sample: {
        lang: 'bash',
        caption: 'The project as a sequence of commands (lab only)',
        code: `# 1. confirm isolation
ping -c1 192.168.56.101 && ping -c1 8.8.8.8   # target up, internet down

# 2. discover hosts
nmap -sn 192.168.56.0/24

# 3-4. scan + versions on each live host
nmap -sV -sC 192.168.56.101
nmap -p- 192.168.56.101          # all ports on an important host

# 5. capture a plaintext session
sudo tcpdump -i eth0 -A 'tcp port 21'   # while doing an FTP login`,
        output: `Deliverable: per host -> service inventory (port/service/version)
+ findings in exposure/impact/fix form, prioritised, with capture
proof for any plaintext protocol. All inside the isolated lab.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the beginner project, "map and enumerate your lab network"?',
        options: [
          'Gaining a root shell on every host as fast as possible',
          'A report that lets a reader who never saw your lab understand which hosts exist, what each exposes and at which version, which protocols leak (proven by capture), and the top fixes — all produced within the isolation boundary',
          'Scanning the largest possible IP range including public addresses',
          'Using every tool in Kali at least once',
        ],
        answer: 1,
        explain:
          'The beginner capstone is a thorough recon-and-enumeration pass on your own isolated lab — the first two methodology phases done well, not a race to root. The passing bar is a clear report: which hosts are live, what services each exposes and at which versions, which protocols leak their contents (proven with a capture), and the prioritised fixes — all produced inside the isolation boundary you confirmed at the start. That demonstrates the real beginner skills (discovery, scanning, version detection, capture, and responsible write-up) and sets up the deeper interception and service work in amateur.',
        hint: 'The goal is a complete, verified map and write-up — not a root shell, a huge range, or tool count.',
      },
    },
  ],
}

export default level
