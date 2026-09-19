import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'The defender’s network — from zero',
  summary:
    'Assumes no networking background. Learn how machines talk — IP addresses and subnets, ports, TCP and UDP, the three-way handshake, DNS and HTTP — and how a defender sees it: reading your own connections, capturing packets, and understanding the firewall. The ground every network defender stands on.',
  outcomes: [
    'Explain IP addresses, subnets and private ranges',
    'Understand ports, TCP vs UDP, and the TCP handshake',
    'See and reason about a machine’s live connections',
    'Explain how DNS and HTTP/HTTPS work and why defenders watch them',
    'Capture and read a simple packet exchange',
    'Understand what a stateful firewall does',
  ],
  steps: [
    {
      id: 'bnet-b-01',
      title: 'Why the network, and the rules first',
      read: `Every attack crosses a network at some point — to get in, to phone home, to spread, to steal data out. That makes the network a place where a defender can **see and stop** things no single host reveals. "The network doesn't lie": a compromised machine can be made to hide its own activity, but the packets it sends still cross the wire, where a separate sensor can watch them.

The **CIA triad** applies on the wire too:

- **Confidentiality** — is the data encrypted in transit, or readable by anyone who captures it?
- **Integrity** — has traffic been tampered with or spoofed?
- **Availability** — can attackers flood the network to take it down (denial of service)?

## The rule before anything else

You only ever capture, scan or analyse traffic on networks **you own or have explicit written permission to monitor**. Capturing other people's traffic (on a café Wi‑Fi, a shared network, someone else's LAN) can be illegal wiretapping even if you "only look". This whole track is built around **your own lab** — your home network, or, better, a few virtual machines on a virtual network you create. Keep everything here on your own turf.

## Set up a safe lab

The ideal practice environment is two or three **VMs on a host-only virtual network** (as in the Linux/Windows tracks): a "victim", an "attacker", and a machine running your capture tools. You can generate traffic, capture it, and analyse it with zero risk to anyone. Snapshots let you reset. Everything you learn — packets, scans, firewalls — you can safely reproduce there.

## The plan

This level builds the model bottom-up: addresses → ports → connections → names (DNS) → the web (HTTP) → seeing packets → the firewall. Each piece is something you will read, watch, or reason about as a defender. By the end you will map your own machine's connections and pick out the one that doesn't belong — the network defender's fundamental instinct.`,
      sample: {
        lang: 'text',
        caption: 'Why the network is a defender’s vantage point',
        code: `A compromised host can lie about itself:
   its own "ps" / "Task Manager" may be tampered (rootkit)
   its local logs may be edited by the attacker

But to DO anything, the malware must send packets:
   phone home to its command server   -> visible on the wire
   scan for other machines to spread  -> visible on the wire
   copy stolen data out               -> visible on the wire

A network sensor is SEPARATE from the host, so it sees this
even when the host is lying. "The network doesn't lie."`,
        output: `The network gives a defender an independent view an attacker
on the host cannot easily erase — which is why network
monitoring is such a powerful complement to host defence.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is monitoring the network such a valuable complement to defending individual hosts?',
        options: [
          'Networks cannot be attacked',
          'A compromised host can hide its own activity from its own tools, but the packets it must send to communicate, spread or steal data still cross the network, where a separate sensor can observe them — giving an independent view the attacker cannot easily erase',
          'Network monitoring replaces the need for host defence',
          'Packets are always encrypted so they are safe',
        ],
        answer: 1,
        explain:
          'Malware with control of a host can tamper with that host\'s process list and logs, but it still has to put packets on the wire to reach its command server, scan for victims, or exfiltrate data. A network sensor sits outside the host, so it sees that traffic independently. This "the network doesn\'t lie" property is why network monitoring catches things host tools miss — the two together are far stronger than either alone.',
        hint: 'What must malware do that a separate observer can see, even if the host itself is lying?',
      },
    },

    {
      id: 'bnet-b-02',
      title: 'IP addresses and subnets',
      read: `Every device on a network has an **IP address** — its identifier, like a postal address. The common form (IPv4) is four numbers 0–255 separated by dots: \`192.168.1.42\`.

## Public vs private

- **Public** addresses are unique on the whole internet.
- **Private** addresses are reused inside local networks and are not routable on the internet. The private ranges (worth memorising):
  - \`10.0.0.0\` – \`10.255.255.255\`
  - \`172.16.0.0\` – \`172.31.255.255\`
  - \`192.168.0.0\` – \`192.168.255.255\`

Your home devices almost certainly have \`192.168.x.x\` or \`10.x.x.x\` addresses, sharing one public address via **NAT** (Network Address Translation) at the router.

Why a defender cares: seeing a connection *to* a public IP in a strange country, or *from* an unexpected internal address, is a lead. Knowing instantly whether an address is internal or external is a basic reflex.

## Subnets and CIDR

A network is a **subnet** — a block of addresses that can talk directly. It is written in **CIDR** notation: \`192.168.1.0/24\`. The \`/24\` means the first 24 bits are the network part, leaving the last 8 bits (256 addresses, \`192.168.1.0\`–\`192.168.1.255\`) for hosts. Smaller number = bigger network:

- \`/24\` = 256 addresses (a typical home/office subnet)
- \`/16\` = 65,536 addresses
- \`/8\` = ~16 million

## Special addresses

- \`127.0.0.1\` (**localhost**) — the machine itself; traffic that never leaves the box.
- \`0.0.0.0\` — "all addresses" (a service listening here answers on every interface).
- The **gateway** (often \`.1\`, e.g. \`192.168.1.1\`) — the router that connects your subnet to the outside.

Seeing your own addressing is step one of understanding any network. \`ip addr\` (Linux) or \`ipconfig\` (Windows) shows it.`,
      sample: {
        lang: 'bash',
        caption: 'Reading a machine’s addressing',
        code: `ip addr show
ip route | grep default`,
        output: `2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP>
    inet 192.168.1.42/24 brd 192.168.1.255 scope global eth0
# this host is 192.168.1.42 on the 192.168.1.0/24 subnet (256 addrs)
default via 192.168.1.1 dev eth0
# the gateway (router to the outside world) is 192.168.1.1`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You see a connection from an internal machine to the IP address `203.0.113.50`. Is that a private (internal) or public (external) address?',
        options: [
          'Private — all IP addresses are internal',
          'Public (external) — it is not in the private ranges (10.x, 172.16–31.x, 192.168.x), so it is a routable internet address, meaning the internal machine is talking to something on the internet',
          'It is localhost',
          'It is the gateway',
        ],
        answer: 1,
        explain:
          '203.0.113.50 is not within any private range (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), so it is a public internet address. Recognising instantly whether an address is internal or external is a core reflex: a connection from a workstation out to an unfamiliar public IP is exactly the kind of thing (command-and-control, exfiltration) a network defender investigates.',
        hint: 'Is 203.x in 10.x, 172.16–31.x, or 192.168.x? If not, where does it live?',
      },
    },

    {
      id: 'bnet-b-03',
      title: 'Ports and the transport layer',
      read: `An IP address gets you to a *machine*; a **port** gets you to a specific *service* on it. One server at \`192.168.1.10\` can run a web server (port 443), an SSH server (port 22) and a database (port 5432) at once — the port number says which one you mean. Think of the IP as a building's address and the port as the room number.

## The ranges

- Ports are numbers 0–65535.
- **Well-known ports** (0–1023) are reserved for standard services. Memorise the common ones:
  - **22** SSH, **23** Telnet (obsolete/insecure), **25** SMTP (email), **53** DNS, **80** HTTP, **443** HTTPS, **3389** RDP, **445** SMB, **3306** MySQL, **5432** PostgreSQL.
- **Registered/dynamic ports** (above 1023) are used by applications and for the temporary "source" port your machine picks for each outgoing connection.

## TCP vs UDP

Ports belong to the two main **transport protocols**:

- **TCP** (Transmission Control Protocol) — **connection-oriented and reliable**. It sets up a connection (next step), guarantees delivery and order, and retransmits lost data. Used where correctness matters: web, SSH, email, file transfer.
- **UDP** (User Datagram Protocol) — **connectionless and fast**. It just fires packets ("datagrams") with no setup, no guarantee of delivery or order. Used where speed beats perfection: DNS, video/voice, some games.

## Why a defender cares

- A service listening on a port is an **entry point** — attack surface. Knowing what *should* be listening lets you spot what shouldn't (a backdoor on a weird port).
- The **destination port** of a connection tells you what kind of traffic it is: outbound to 443 is web/HTTPS; outbound to 22 might be SSH to a server; an internal host connecting to 445 across many machines could be lateral movement.
- Some attacks abuse the protocol: floods, or hiding data in a protocol that "should" be something else.

Ports and protocols are the vocabulary of network traffic. "Which port, TCP or UDP, to where?" is how a defender reads what a connection *is*.`,
      sample: {
        lang: 'text',
        caption: 'The same server, three services, three ports',
        code: `Server 192.168.1.10 is listening on:
   TCP 22    -> SSH   (remote admin)
   TCP 443   -> HTTPS (the web app)
   TCP 5432  -> PostgreSQL (database)

A client connects to 192.168.1.10:443  -> reaches the web app.
A client connects to 192.168.1.10:22   -> reaches SSH.

The IP picks the machine; the PORT picks the service on it.
If you also saw TCP 4444 listening -> not a standard service:
investigate (a common backdoor/handler port).`,
        output: `IP = which machine. Port = which service. TCP = reliable
(web, ssh, email). UDP = fast, no guarantee (DNS, voice).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the fundamental difference between TCP and UDP?',
        options: [
          'TCP is for internal networks and UDP is for the internet',
          'TCP is connection-oriented and reliable — it establishes a connection and guarantees ordered, complete delivery (used for web, SSH, email); UDP is connectionless and fast with no delivery guarantee (used for DNS, voice, video)',
          'UDP is encrypted and TCP is not',
          'They are two names for the same thing',
        ],
        answer: 1,
        explain:
          'TCP sets up a connection (the handshake, next step), then guarantees that data arrives complete and in order, retransmitting losses — ideal where correctness matters. UDP just sends datagrams with no setup or guarantees, trading reliability for speed and low overhead — ideal for DNS lookups, real-time voice/video. Knowing which a service uses (and on which port) is basic to reading network traffic.',
        hint: 'One sets up a reliable, ordered connection; the other fires packets with no guarantee.',
      },
    },

    {
      id: 'bnet-b-04',
      title: 'The TCP three-way handshake',
      read: `Before TCP sends any data, it establishes a connection with a **three-way handshake**. Understanding it is essential, because attackers' scanning and flooding techniques all manipulate this exchange.

## The three steps

Using TCP **flags** (control bits in each segment):

1. **SYN** — the client says "I'd like to connect" (SYN = synchronize).
2. **SYN-ACK** — the server replies "OK, and I'd like to connect too" (acknowledging the client's SYN and sending its own).
3. **ACK** — the client says "acknowledged" — the connection is now **established**, and data can flow.

Closing uses **FIN** (finish) flags, and **RST** (reset) abruptly tears a connection down (e.g. when you hit a port with nothing listening).

## Why a defender must know this

The handshake is the signature of **port scanning** and DoS:

- A **SYN scan** sends a SYN to many ports and watches the reply: a **SYN-ACK** means the port is open (a service is listening); a **RST** means closed. The scanner often never completes the handshake (never sends the final ACK) to stay quiet — so a burst of half-open connections from one source is a scan fingerprint.
- A **SYN flood** (DoS) sends huge numbers of SYNs and never completes them, exhausting the server's connection table so real clients cannot connect (this is what the \`tcp_syncookies\` sysctl from the Linux track defends).

## Connection states

Because TCP tracks connections, each has a **state**: LISTEN (a server waiting), SYN-SENT/SYN-RECV (mid-handshake), **ESTABLISHED** (active), TIME_WAIT/CLOSE_WAIT (closing). Tools like \`ss\` show these, and the states themselves are informative: many SYN-RECV entries suggest a SYN flood; an unexpected ESTABLISHED connection to a strange address is a live channel worth investigating.

So the handshake is not just plumbing — it is the thing scans and floods manipulate, and reading connection states is how a defender spots them.`,
      sample: {
        lang: 'text',
        caption: 'A normal handshake vs. a SYN scan',
        code: `NORMAL connection to an open port (80):
  client --SYN-------->  server
  client <--SYN-ACK----  server   (port open, service listening)
  client --ACK-------->  server   -> ESTABLISHED, data flows

SYN SCAN probing a port:
  scanner --SYN------->  target
  scanner <--SYN-ACK---  target   (port OPEN)
  scanner --RST------->  target   (scanner aborts - stays "quiet")
  ...repeated across ports 1..1024 from one source = a port scan

Closed port reply:  target --RST--> "nothing listening here"`,
        output: `SYN -> SYN-ACK -> ACK establishes a TCP connection.
Scans and SYN-flood DoS both abuse this handshake, so reading
handshakes and connection states is core to spotting them.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A single source sends SYN packets to hundreds of ports on a host, and for each open port that replies SYN-ACK it responds with RST instead of completing the handshake. What is this?',
        options: [
          'Normal web browsing',
          'A SYN (port) scan — the source is probing which ports are open by watching for SYN-ACK (open) vs RST (closed) replies, and deliberately not completing the handshake to stay quieter; a burst of these from one source is a scan fingerprint',
          'A successful login',
          'The server shutting down',
        ],
        answer: 1,
        explain:
          'Sending SYNs across many ports and interpreting the replies (SYN-ACK = open, RST = closed) is exactly how a SYN scan maps a host\'s services. Aborting each with RST instead of the final ACK avoids a full connection (quieter, and historically avoided some logging). A flood of half-open handshake attempts from one source is a classic reconnaissance signature — and often the first stage of an attack, which is why detecting scans matters.',
        hint: 'What is someone doing when they touch every port and only care whether it answers SYN-ACK or RST?',
      },
    },

    {
      id: 'bnet-b-05',
      title: 'Seeing your machine’s connections',
      read: `A defender's daily reflex is to ask a machine "who are you talking to, and who is talking to you?" The answer is in the connection table, shown by **ss** (modern Linux), the older **netstat**, or \`Get-NetTCPConnection\` on Windows.

## The command

\`ss -tunap\` (Linux) is the workhorse:

- **-t** TCP, **-u** UDP, **-n** numeric (don't resolve names — faster, and shows the real IP), **-a** all (listening + established), **-p** the process (needs root).

## Reading the output

Each line shows the **state**, the **local address:port**, the **peer address:port**, and the **process**. Two questions:

1. **What is LISTENING?** — every listening port is attack surface. Is each one expected? A service listening on \`0.0.0.0\` (all interfaces) is reachable from the network; on \`127.0.0.1\` only locally. An unexpected listener — especially on an odd high port, or a shell listening — is a red flag (a backdoor).
2. **What is ESTABLISHED?** — active connections. Where do they go? An outbound connection from a server to a strange public IP, or a connection owned by an unexpected process (a database "talking out" to the internet), is exactly what to investigate.

## The defender's instinct

You build a mental baseline of what a machine's connections *normally* look like, so the abnormal stands out — the same "know normal to spot abnormal" idea as processes on the host, applied to the network. A web server should listen on 80/443 and mostly *receive* connections; it dialing *out* to a random IP on port 4444 is wrong. \`ss\` is where you catch a live reverse shell, an unexpected listener, or a service exposed that should be internal.`,
      sample: {
        lang: 'bash',
        caption: 'Reading connections — one of these does not belong',
        code: `sudo ss -tunap | grep -E 'LISTEN|ESTAB'`,
        output: `tcp LISTEN 0 128 0.0.0.0:22   users:(("sshd"))         expected
tcp LISTEN 0 128 0.0.0.0:443  users:(("nginx"))        expected
tcp LISTEN 0 1   0.0.0.0:4444 users:(("bash"))         <- bash
                              listening on 4444: a backdoor shell!
tcp ESTAB  0 0   10.0.0.5:51022 203.0.113.9:443
                              users:(("nginx"))          <- web server
                              dialing OUT to a public IP: investigate`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In `ss` output you see `bash` LISTENING on port 4444 (state LISTEN, on 0.0.0.0). Why is that suspicious?',
        options: [
          'bash cannot use the network',
          'A shell (bash) listening for incoming network connections is not a normal service — it is a classic backdoor/bind shell, letting an attacker connect in and get a command line; legitimate services (not interactive shells) are what should be listening',
          'Port 4444 is reserved for Windows',
          'It means the machine is well secured',
        ],
        answer: 1,
        explain:
          'Servers listen with service software (sshd, nginx, a database) — not with an interactive shell. A `bash` process in LISTEN state is a **bind shell**: it waits for an attacker to connect and hands them a command line on the box. (Its cousin, a reverse shell, shows as bash in an ESTABLISHED *outbound* connection.) Spotting a shell bound to a port — or a service dialing out to a strange IP — is exactly what reading `ss` output trains you to catch.',
        hint: 'What legitimately listens for connections — service software, or an interactive shell?',
      },
    },

    {
      id: 'bnet-b-06',
      title: 'DNS: turning names into addresses',
      read: `You type \`example.com\`, not \`93.184.216.34\`. **DNS** (Domain Name System) is the internet's phone book that translates human names into IP addresses. It is fundamental — and, because almost everything starts with a DNS lookup, it is one of the richest sources of defensive signal.

## How a lookup works (simplified)

1. Your machine asks a **resolver** (often your ISP's or a public one like \`8.8.8.8\`) "what is the IP for example.com?"
2. The resolver walks the hierarchy if it doesn't know: **root** servers → the **.com** servers → example.com's **authoritative** server → back comes the IP.
3. Answers are **cached** for a while (the TTL) so repeat lookups are instant.

DNS mostly uses **UDP port 53** (fast, small queries).

## Record types worth knowing

- **A** — a name to an IPv4 address (**AAAA** for IPv6).
- **MX** — mail servers for a domain.
- **CNAME** — an alias (one name points to another).
- **TXT** — arbitrary text (used for verification, and, unfortunately, abused to hide data).

## Why DNS is gold for defenders

- Malware must usually **resolve its command server's name** before connecting — so DNS logs show the *intent to connect* to a bad domain, often before the connection itself.
- **Newly registered / random-looking domains** (e.g. \`kq3v9zx.example\`) are a signal — malware families generate throwaway domains (DGAs).
- **DNS tunnelling / exfiltration** — attackers hide data inside DNS queries (because DNS is often allowed out when other traffic is blocked). Unusually long, frequent, or high-entropy queries to one domain are a tell.
- **Blocklists / sinkholing** — you can *block* known-bad domains at the resolver (a cheap, powerful control) and *detect* attempts to reach them.

Because it is the first step of almost every connection, monitoring and controlling DNS is one of the highest-value things a network defender does. \`dig\` (or \`nslookup\`) performs lookups by hand.`,
      sample: {
        lang: 'bash',
        caption: 'A manual DNS lookup, and a suspicious query pattern',
        code: `dig +short example.com A
echo "--- a defender reviewing DNS query logs ---"
# frequent lookups of long, random subdomains of one domain:`,
        output: `93.184.216.34
--- a defender reviewing DNS query logs ---
a8f3k2.data.evil.example   (312 bytes encoded in the name?)
b1c9x7.data.evil.example
z4m2q8.data.evil.example
# hundreds/min of long, random subdomains of one domain =
# likely DNS tunnelling / exfiltration. DNS shows the intent
# to reach a domain, often before (or instead of) other traffic.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is DNS monitoring one of the highest-value activities for a network defender?',
        options: [
          'DNS is the only protocol attackers use',
          'Almost every connection begins with a DNS lookup, so DNS logs reveal the intent to reach a domain (including malware resolving its command server or using random/newly registered domains) — often before the connection itself — and DNS is also abused for tunnelling/exfiltration, all of which DNS visibility exposes',
          'DNS traffic is always malicious',
          'DNS cannot be logged',
        ],
        answer: 1,
        explain:
          'Because name resolution precedes most connections, DNS logs are a near-universal record of what hosts are trying to reach — surfacing malware resolving its C2 domain, algorithmically generated or newly registered domains, and DNS tunnelling (long, high-entropy, high-frequency queries hiding data). You can also block known-bad domains at the resolver. That combination of early intent, broad coverage, detection, and cheap control makes DNS one of the richest defensive vantage points.',
        hint: 'What happens before almost every network connection, and what does seeing that step reveal?',
      },
    },

    {
      id: 'bnet-b-07',
      title: 'HTTP and HTTPS',
      read: `The web runs on **HTTP** (HyperText Transfer Protocol) — and its secure form **HTTPS** (HTTP over TLS). Because so much traffic is web traffic (and so much malware hides in it), understanding HTTP is core to network defence.

## How HTTP works

A client sends a **request** and the server sends a **response**:

- A request has a **method** (**GET** to fetch, **POST** to send data), a **path** (\`/login\`), **headers** (metadata like \`Host\`, \`User-Agent\`, \`Cookie\`), and sometimes a **body**.
- A response has a **status code** — **200** OK, **301/302** redirect, **404** not found, **401/403** unauthorized/forbidden, **500** server error — plus headers and the content.

Plain HTTP (**port 80**) is **unencrypted**: anyone capturing the traffic reads everything, including passwords sent over it. This is why the web moved to HTTPS.

## HTTPS

**HTTPS** (**port 443**) wraps HTTP in **TLS**, providing confidentiality (encrypted), integrity (untampered), and authentication (the certificate proves you reached the real server — the TLS topic from the Linux/Windows tracks). A defender wants HTTPS everywhere for those protections.

## The double edge for defenders

Encryption protects users *and* hides attackers:

- **Good:** credentials and data are safe from eavesdroppers on the wire.
- **Hard:** you can no longer read the *content* of HTTPS traffic at the network sensor, so malware using HTTPS for its command channel blends in with normal web traffic. Defenders adapt by looking at what is *still visible* — the destination, the certificate details, timing/volume patterns (covered in later levels) — and by inspecting TLS at a controlled point where policy allows.

## What a defender reads in HTTP

- **Status codes** — a flood of 404s (someone scanning for pages/vulns), many 401/403s (auth attacks), a spike of 500s (something breaking or being exploited).
- **User-Agent and headers** — automated tools often have tell-tale or missing User-Agents; odd headers can signal attacks.
- **Paths** — requests for \`/admin\`, \`/.env\`, \`/wp-login.php\`, or containing \`../\` and SQL/script fragments are attack probes (the web-attack topics of the blue-web track).

HTTP is the language of most traffic; reading requests, responses and status codes is how a network defender spots web attacks and misbehaving clients.`,
      sample: {
        lang: 'text',
        caption: 'An HTTP request/response, and a scan visible in the logs',
        code: `GET /login HTTP/1.1
Host: shop.example.com
User-Agent: Mozilla/5.0 ...
                     -->  server
HTTP/1.1 200 OK      <--  Content-Type: text/html ...

A defender reading web-server logs sees a scan:
  10.0.0.9 "GET /admin" 404
  10.0.0.9 "GET /.env" 404          <- probing for secrets file
  10.0.0.9 "GET /wp-login.php" 404  <- probing for WordPress
  10.0.0.9 "GET /../../etc/passwd" 400  <- path traversal attempt`,
        output: `Requests: method + path + headers. Responses: a status code
(200/301/404/500). A burst of 404s for sensitive paths from one
IP is scanning/probing — readable even without seeing content.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'HTTPS encrypts web traffic, which is good for users. What challenge does that create for network defenders, and how do they adapt?',
        options: [
          'None — HTTPS makes defence unnecessary',
          'The traffic content is hidden, so malware using HTTPS blends with normal web traffic; defenders adapt by analysing what remains visible — the destination, certificate details, and timing/volume patterns — and by inspecting TLS at controlled points where policy allows',
          'HTTPS can never be used by attackers',
          'Defenders must block all HTTPS',
        ],
        answer: 1,
        explain:
          'Encryption protects legitimate users but also conceals attacker command channels and exfiltration inside ordinary-looking HTTPS. Since the payload is no longer readable at a passive sensor, defenders pivot to metadata that is still exposed — where the connection goes, the TLS certificate/handshake characteristics, and behavioural patterns like beaconing timing and data volumes (later levels) — and use controlled TLS inspection where appropriate. It is a real trade-off: the same encryption that secures users limits network content visibility.',
        hint: 'If you can no longer read the content, what about a connection is still visible to look at?',
      },
    },

    {
      id: 'bnet-b-08',
      title: 'The layered model',
      read: `Networking is built in **layers**, each handling one job and relying on the one below. This layered model is the mental map that makes everything else fit together — and it tells a defender *where* a given attack or control lives.

## The TCP/IP model (the practical one)

From bottom to top:

1. **Link layer** — the physical/local network (Ethernet, Wi‑Fi) and hardware **MAC addresses**. Gets a frame to the next device on the local wire.
2. **Internet layer** — **IP** addresses and routing. Gets a packet across networks to the right machine (possibly worldwide).
3. **Transport layer** — **TCP/UDP** and ports. Gets data to the right *service* on that machine, reliably (TCP) or not (UDP).
4. **Application layer** — the protocols you use: **HTTP, DNS, SSH, SMTP**, etc. The actual content and meaning.

(The older **OSI model** splits this into seven layers; you'll hear people say "a layer 7 firewall" (application-aware) or "a layer 3/4 issue" (IP/port). The four-layer TCP/IP view is enough to reason with.)

## Encapsulation

Data is **wrapped** as it goes down the layers: your HTTP request is put inside a TCP segment (adds ports), inside an IP packet (adds addresses), inside an Ethernet frame (adds MACs). Each layer adds its own header. The receiver unwraps it back up. This is why a single packet contains MACs *and* IPs *and* ports *and* content — one per layer.

## Why layers matter to a defender

- **They locate attacks and controls.** ARP spoofing is layer 2; IP spoofing and routing attacks are layer 3; SYN floods and port scans are layer 4; SQL injection and web attacks are layer 7. A **firewall** filtering by IP/port works at layers 3–4; one that understands HTTP works at layer 7.
- **They tell you where to look.** A problem "at layer 7" (the application) needs different visibility than one "at layer 3" (routing).
- **Each layer is attackable and defensible** somewhat independently — defence in depth across the stack.

Hold the four layers in your head — link, internet, transport, application — and any protocol, attack or control you meet has a home you can place it in.`,
      sample: {
        lang: 'text',
        caption: 'One web request, wrapped through the layers (encapsulation)',
        code: `Application  |  GET /login HTTP/1.1  Host: example.com     (HTTP)
     v wrapped in
Transport    |  [TCP  src:51000 dst:443 SYN/ACK/...]        (ports)
     v wrapped in
Internet     |  [IP   src:192.168.1.42 dst:93.184.216.34]   (addresses)
     v wrapped in
Link         |  [Ethernet src:MAC-a dst:MAC-b ] ... on the wire (MACs)

Each layer adds a header. The receiver unwraps back up.
That is why one packet holds MACs + IPs + ports + content.`,
        output: `Link -> Internet -> Transport -> Application.
Attacks and controls each live at a layer: ARP spoof (2),
IP spoof (3), SYN flood/scan (4), SQL injection (7).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A "layer 7" (application-layer) firewall differs from a "layer 3/4" firewall. What does that distinction mean?',
        options: [
          'Layer 7 firewalls are just faster',
          'A layer 3/4 firewall filters based on IP addresses and ports (the internet and transport layers), while a layer 7 firewall understands application protocols like HTTP and can filter on their content — so it can, for example, block a malicious HTTP request that a port-based rule would let through',
          'Layer 7 firewalls only work on layer 3 traffic',
          'There is no real difference',
        ],
        answer: 1,
        explain:
          'The layered model locates what a control can see. A layer 3/4 firewall makes decisions on IPs and ports — "allow 443 to this host" — but cannot see inside the traffic. A layer 7 (application-aware) firewall parses the protocol (e.g. HTTP) and can act on its content — block a request containing a SQL-injection payload, say — even though the port is allowed. Knowing which layer a control (or an attack) operates at is how you reason about coverage and defence in depth.',
        hint: 'Which layers are IP/port, and which layer is HTTP content? What can each kind of firewall therefore see?',
      },
    },

    {
      id: 'bnet-b-09',
      title: 'Capturing packets: tcpdump and Wireshark',
      read: `To truly see the network you capture the actual packets. Two tools dominate: **tcpdump** (command-line, everywhere, scriptable) and **Wireshark** (graphical, deep protocol analysis). Both use the same underlying capture library and **filter language**.

## Capturing

- \`tcpdump -i eth0\` captures on an interface. It prints a one-line summary per packet.
- \`tcpdump -i eth0 -w capture.pcap\` writes a **pcap file** — the standard capture format — which you then open in Wireshark for detailed analysis.
- Capturing usually needs root/admin, because it reads raw traffic (which is also why doing it on networks you don't own is off-limits).

## Filters keep it manageable

Raw capture is a firehose. **BPF (capture) filters** limit what you grab:

- \`host 192.168.1.10\` — only traffic to/from that host.
- \`port 443\` — only that port.
- \`tcp\` / \`udp\` — only that protocol.
- Combine: \`tcp and host 203.0.113.9 and port 443\`.

Wireshark also has richer **display filters** (\`http.request\`, \`dns\`, \`tcp.flags.syn == 1\`) that filter an already-captured file.

## What capture gives you (that logs don't)

Logs are a *summary*; a packet capture is the *ground truth* — the exact bytes that crossed the wire. With it you can:

- See the full content of unencrypted traffic (an HTTP request, a DNS query, a cleartext password someone shouldn't have sent).
- Reconstruct exactly what happened in an incident.
- Confirm what logs only imply.

## Where to capture

You capture where you can *see* the traffic: on the host itself, or (for a whole segment) via a **SPAN/mirror port** on a switch or a **network tap** that copies traffic to your sensor. On a switched network you cannot see other machines' traffic just by listening — you need the switch to mirror it to you.

tcpdump for quick command-line captures and Wireshark for deep analysis are the network defender's microscope. The next step reads a capture; here the point is: you can grab the real packets, and filters make that practical.`,
      sample: {
        lang: 'bash',
        caption: 'Capturing just the traffic you care about, to a file',
        code: `# capture TCP traffic to/from a suspect IP, save for Wireshark
sudo tcpdump -i eth0 -w suspect.pcap 'tcp and host 203.0.113.9'

# or a quick live look at DNS queries only
sudo tcpdump -i eth0 -n udp port 53`,
        output: `# live DNS view:
12:04:01.3 IP 10.0.0.5.51222 > 8.8.8.8.53: A? shop.example.com
12:04:01.3 IP 8.8.8.8.53 > 10.0.0.5.51222: A 93.184.216.34
12:04:02.1 IP 10.0.0.5.40111 > 8.8.8.8.53: A? a8f3k2.data.evil.example
# the last query stands out - long random subdomain (tunnelling?)
# suspect.pcap now holds the raw packets for deep analysis.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does a packet capture (pcap) give a defender something that log files alone do not?',
        options: [
          'Captures are smaller than logs',
          'A capture is the exact bytes that crossed the wire — the ground truth — so it shows the full content of unencrypted traffic and lets you reconstruct precisely what happened, confirming or revealing what a summarised log only implies',
          'Logs cannot record network activity',
          'Captures never need filtering',
        ],
        answer: 1,
        explain:
          'Logs summarise; a capture preserves the actual packets. That ground truth lets you read the full content of unencrypted traffic (an HTTP request, a DNS query, a cleartext credential), reconstruct an incident exactly, and verify what logs only suggest. The trade-off is volume — hence capture filters (BPF) to grab only what matters — and that you must capture where you can see the traffic (the host, or a SPAN/tap on a switch).',
        hint: 'What is the difference between a summary of what happened and the exact bytes that happened?',
      },
    },

    {
      id: 'bnet-b-10',
      title: 'Reading a capture',
      read: `Capturing is easy; the skill is **reading** what you captured. Let's walk a simple exchange and the questions a defender asks of any capture.

## Following a conversation

Wireshark's **"Follow TCP Stream"** reassembles a connection's packets into the actual back-and-forth, so you read the HTTP request and response (or whatever the protocol is) as text rather than packet-by-packet. This is the single most useful feature for understanding "what was said" on a connection.

## The questions to ask of any packet or flow

1. **Who to who?** — source and destination IP (internal? external? expected?).
2. **What service?** — the port and protocol (443/HTTPS, 53/DNS, 22/SSH…).
3. **What direction and who started it?** — the SYN direction shows who initiated. A server *initiating* an outbound connection is often wrong.
4. **What's in it?** (if unencrypted) — the content. A cleartext password, a suspicious command, encoded data.
5. **How much and how often?** — a lot of data leaving (exfiltration?), or small regular beats (beaconing to a command server — a later topic).

## Spotting the odd one

In a normal capture, most flows are recognisable: DNS lookups, HTTPS to known services, internal file sharing. The **anomaly** is what you hunt: a connection to a strange country's IP; cleartext where there should be encryption; a workstation talking directly to another workstation on an admin port; a tiny connection that repeats exactly every 30 seconds. The instinct — the same one from reading \`ss\` — is *know what normal looks like, so the abnormal jumps out.*

## Cleartext still exists

Plenty of traffic is still unencrypted — internal protocols, misconfigured services, legacy apps, plain HTTP, Telnet, FTP. A capture will happily show you a password sent in the clear, which is both a finding (that protocol should be encrypted) and a lesson in why confidentiality on the wire matters.

Reading captures is a deep skill you'll keep building, but the frame is simple: for each flow, ask who/what/direction/content/volume, and compare against your sense of normal.`,
      sample: {
        lang: 'text',
        caption: '"Follow TCP Stream" on a plain-HTTP login — a cleartext password',
        code: `Follow TCP Stream (tcp.port == 80):

  POST /login HTTP/1.1
  Host: intranet.example.com
  Content-Type: application/x-www-form-urlencoded

  username=admin&password=Summer2024!     <- SENT IN CLEARTEXT

  HTTP/1.1 302 Found
  Location: /dashboard`,
        output: `Two findings in one stream:
  1. Credentials sent over plain HTTP (port 80) - anyone
     capturing the wire reads the password. Must be HTTPS.
  2. The login succeeded (302 to /dashboard).
Reading the reassembled stream shows exactly what was said.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Reading a captured stream, you see a login sent as `username=admin&password=Summer2024!` over port 80 (plain HTTP). What are the implications?',
        options: [
          'None — HTTP is secure',
          'The credentials were sent unencrypted, so anyone able to capture the traffic can read the password; this is both an immediate exposure (the password should be considered compromised and the service moved to HTTPS) and a demonstration of why confidentiality on the wire matters',
          'The password is safe because it is in a POST body',
          'Port 80 encrypts automatically',
        ],
        answer: 1,
        explain:
          'Plain HTTP (port 80) is unencrypted, so the POST body — including the password — is readable by anyone who can capture the traffic (on the wire, a shared segment, a compromised device in the path). Putting it in a POST body does not help; only TLS (HTTPS) would. The finding is twofold: the exposed credential should be treated as compromised, and the service must use HTTPS. It is a concrete lesson in transit confidentiality and in what packet captures reveal.',
        hint: 'Is a POST body over port 80 encrypted, and who can read what crosses the wire in cleartext?',
      },
    },

    {
      id: 'bnet-b-11',
      title: 'The firewall',
      read: `A **firewall** controls which traffic is allowed to pass, based on rules. It is the most fundamental network control — the gate that enforces "only this traffic, to these places, is permitted."

## What it filters on

A basic firewall makes decisions using layer 3/4 information:

- **Source and destination IP** — from/to where.
- **Port and protocol** — which service, TCP/UDP.
- **Direction** — inbound (from outside) vs outbound (to outside).

A rule is essentially: *"allow/deny [protocol] from [source] to [destination:port]."*

## Stateful firewalls

Modern firewalls are **stateful**: they remember connections. When you make an outbound request, the firewall notes it and automatically allows the *reply* to come back, without you writing a rule for return traffic. It tracks the TCP state (the handshake from earlier) so it can tell a legitimate reply from an unsolicited packet. This is why you generally write rules for *new* connections and the firewall handles the rest of each conversation.

## Default-deny: the golden rule

The single most important firewall principle is **default-deny**: block everything, then explicitly allow only what is needed. The opposite (**default-allow**: permit everything, block known-bad) always loses, because you cannot enumerate every bad thing. Default-deny means an attacker's new technique is blocked *by default* because you never allowed it. You met this as \`ufw\` (Linux) and Windows Firewall profiles; it is the same idea at the network edge.

## Inbound vs outbound

- **Inbound** filtering protects your services from the outside (only expose what must be exposed — the attack-surface idea).
- **Outbound (egress) filtering** is underused and powerful: restricting what internal hosts may connect *out* to breaks malware's command-and-control and exfiltration. If a workstation has no business connecting to arbitrary internet IPs on odd ports, denying that stops a reverse shell from ever reaching its handler. Egress control is a strong, often-missed defence.

## What a firewall does not do

A basic firewall sees IPs and ports, not content — it cannot tell good HTTPS from malware's HTTPS if both go to port 443 to an allowed destination. That is where application-aware firewalls, IDS/IPS and the later levels come in. But the humble default-deny stateful firewall, filtering inbound *and* outbound, is the foundation everything else builds on.`,
      sample: {
        lang: 'text',
        caption: 'A default-deny ruleset, filtering both directions',
        code: `# INBOUND (protect our services): default DENY, then allow only:
allow tcp any -> 443   (web)
allow tcp trusted-admin-net -> 22   (ssh, from admins only)
deny  all   (everything else inbound is dropped)

# OUTBOUND (egress): default DENY, then allow only:
allow tcp any -> 443,80   (web browsing)
allow udp any -> 53       (DNS)
deny  all   (so a reverse shell to 203.0.113.9:4444 is BLOCKED)`,
        output: `Default-deny both ways:
  inbound  -> only 443 (and 22 from admins) is reachable; scans
             of other ports hit a wall.
  outbound -> malware cannot dial out to an arbitrary IP:port,
             so its command channel/exfil is cut off at the edge.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "default-deny" (block everything, then allow only what is needed) fundamentally stronger than "default-allow" (permit everything, block known-bad)?',
        options: [
          'Default-deny is faster to configure',
          'You cannot enumerate every possible malicious thing, so default-allow always has gaps; default-deny blocks anything you did not explicitly permit — including brand-new attacker techniques — by default, making the safe state the automatic one',
          'Default-allow blocks more attacks',
          'They are equally secure',
        ],
        answer: 1,
        explain:
          'Default-allow requires you to predict and blocklist every bad thing — impossible, so new or unforeseen techniques slip through. Default-deny inverts the burden: only explicitly approved traffic passes, so anything unanticipated is blocked automatically. Applied to egress as well as ingress, it also cuts off malware\'s command-and-control and exfiltration by denying unapproved outbound connections. It is the same allow-listing principle as application control on the host, at the network layer.',
        hint: 'Can you list every possible attack in advance? Which posture is safe for the things you didn’t think of?',
      },
    },

    {
      id: 'bnet-b-12',
      title: 'Project: map your network and find the odd flow',
      read: `Put the level together into the network defender's fundamental exercise: **map what a machine (or small network) is talking to, and identify the flow that doesn't belong.** This is the network sibling of the host "checkup" from the Linux and Windows tracks.

The routine, and what each part uses from this level:

1. **What is this machine's addressing?** — \`ip addr\` / \`ipconfig\`: its IP, subnet, gateway (internal vs external reflex).
2. **What is listening?** — \`ss -tulpn\`: every listening port is attack surface; is each expected? Any shell or odd high port listening = backdoor.
3. **What is it connected to right now?** — \`ss -tunap\` (ESTABLISHED): where do the connections go? Internal or external? Which process? Any server dialing *out*?
4. **What names is it resolving?** — DNS queries (via capture or logs): any long/random or known-bad domains?
5. **Capture a sample** — \`tcpdump -w\` for a minute, then read flows: who/what/direction/content/volume for each.
6. **Compare to normal** — the ones that fit the machine's role are fine; the anomaly is the lead.

Run it on your own lab VMs: have the "attacker" VM open a reverse shell or run a scan against the "victim", then use these steps on the victim to *find* it in the connections and the capture. Detecting your own planted activity is exactly how the instinct is built.

> The whole level distilled: a machine's network behaviour should match its purpose. A web server receives connections on 443 and looks up a few known names; it does **not** listen on 4444, dial out to a random foreign IP on an odd port, or resolve strings of random subdomains. Learn each machine's normal, and the abnormal flow — the reverse shell, the scan, the exfiltration, the beacon — stands out. That is where the network defender starts.`,
      sample: {
        lang: 'bash',
        caption: 'netcheck.sh — a first network-triage pass on a host',
        code: `#!/bin/bash
echo "== addressing =="; ip -brief addr; ip route | grep default
echo "== listening (attack surface) =="
sudo ss -tulpn
echo "== established connections =="
sudo ss -tunap | grep ESTAB
echo "== recent DNS (from a short capture) =="
sudo timeout 20 tcpdump -i eth0 -n udp port 53 2>/dev/null | head`,
        output: `== listening (attack surface) ==
tcp LISTEN 0.0.0.0:443  users:(("nginx"))     expected (web)
tcp LISTEN 0.0.0.0:4444 users:(("bash"))      <- BACKDOOR shell
== established connections ==
ESTAB 10.0.0.5:51999 203.0.113.9:4444 users:(("bash"))
                                              <- reverse shell OUT
== recent DNS ==
10.0.0.5 > 8.8.8.8: A? k3q9zx7.c2.evil.example  <- odd domain
# One host: a bound shell, an outbound shell, and a weird
# DNS lookup - one compromise, seen entirely from the network.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your network triage of a web server shows: it is listening on 4444 with bash, has an ESTABLISHED outbound connection from bash to `203.0.113.9:4444`, and just resolved `k3q9zx7.c2.evil.example`. What is the most reasonable conclusion?',
        options: [
          'Three unrelated, harmless quirks',
          'One compromise seen from the network: a backdoor bind shell, an active reverse shell to an external IP, and a lookup of a suspicious command-server domain — the machine’s network behaviour does not match its role (a web server should receive 443 traffic, not run shells and dial out), so investigate and respond',
          'Only the DNS lookup matters',
          'The web server is working normally',
        ],
        answer: 1,
        explain:
          'The findings correlate into one story a web server’s normal behaviour flatly contradicts: a shell listening for inbound connections (bind shell), an outbound shell connection to an external IP (reverse shell), and resolution of a random-looking command-server domain. A web server should receive connections on 443 and resolve a few known names — not run shells or dial out. Recognising that the network behaviour doesn’t match the machine’s purpose, and that the pieces reinforce each other, is the core network-defender instinct: know normal, spot the abnormal, then respond.',
        hint: 'Do the three findings fit a web server’s normal behaviour, and do they point the same way?',
      },
    },
  ],
}

export default level
