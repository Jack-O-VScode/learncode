import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Packet analysis and network monitoring',
  summary:
    'Turn packets into findings. Master Wireshark and tcpdump filters, understand and detect layer‑2 attacks (ARP spoofing), read TCP problems and the family of stealth port scans, spot rogue DHCP and ICMP tunnelling, reason about firewalls and VLAN segmentation, recognise exfiltration, and use the network log sources a defender lives in.',
  outcomes: [
    'Filter captures precisely in Wireshark and tcpdump',
    'Detect ARP spoofing and other layer‑2 attacks',
    'Recognise the port-scan family and TCP anomalies',
    'Spot rogue DHCP servers and ICMP/covert channels',
    'Reason about stateful firewalls and VLAN segmentation',
    'Recognise exfiltration patterns and use network logs',
  ],
  steps: [
    {
      id: 'bnet-a-01',
      title: 'Wireshark display filters',
      read: `Capturing is easy; finding the needle is the skill. Wireshark's **display filters** (different from capture/BPF filters) slice a loaded capture down to exactly what matters. Fluency here is what makes packet analysis fast.

## The building blocks

- **By protocol:** \`http\`, \`dns\`, \`tls\`, \`arp\`, \`icmp\`, \`smb2\`.
- **By address:** \`ip.addr == 203.0.113.9\` (either direction), \`ip.src ==\`, \`ip.dst ==\`.
- **By port:** \`tcp.port == 443\`, \`udp.port == 53\`.
- **By field:** \`http.request.method == "POST"\`, \`http.response.code == 404\`, \`dns.qry.name contains "evil"\`, \`tcp.flags.syn == 1 && tcp.flags.ack == 0\` (bare SYNs — scan hunting).
- **Combine** with \`&&\`, \`||\`, \`!\`: \`ip.addr == 10.0.0.5 && !tls\`.

## The analyst workflow

1. **Filter broad, then narrow** — start with a host or protocol, then add conditions.
2. **Follow the stream** — right-click → Follow TCP/HTTP Stream to read a whole conversation as text.
3. **Use Statistics** — *Conversations* (who talked to whom, how much), *Protocol Hierarchy* (what the capture is made of), *Endpoints* — to orient in a big capture before drilling in.
4. **Colour and columns** — Wireshark colours anomalies (black = TCP problems) and you can add columns for fields you care about.

## Why it matters

A capture of a busy network is millions of packets. Display filters turn "somewhere in here is the attack" into "show me every POST to this host that got a 200", or "show me all bare SYNs from this source", or "show me DNS queries longer than 50 characters". The same interrogate-don't-browse instinct as grep on logs and \`ss\` on connections — asked of raw packets.`,
      sample: {
        lang: 'text',
        caption: 'Display filters that answer specific defensive questions',
        code: `# every failed-auth-looking HTTP response to one host:
http.response.code == 401 && ip.dst == 10.0.0.5

# bare SYNs from one source (port-scan hunting):
tcp.flags.syn == 1 && tcp.flags.ack == 0 && ip.src == 10.0.0.9

# suspicious long DNS names (tunnelling):
dns && frame.len > 90

# cleartext credentials anywhere in the capture:
http.request.method == "POST" && !tls`,
        output: `Statistics > Conversations (a fast orientation):
  Address A        Address B       Packets  Bytes
  10.0.0.5      203.0.113.9         48211   61 MB   <- huge transfer!
  10.0.0.5      8.8.8.8               902    120 KB
# Conversations view instantly surfaces the 61 MB flow to a
# public IP - a likely exfiltration lead - before you read a packet.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In Wireshark, what is the difference between a capture (BPF) filter and a display filter?',
        options: [
          'They are the same thing with different names',
          'A capture filter decides which packets get recorded in the first place (applied during capture), while a display filter narrows what is shown from an already-captured set — so a capture filter reduces data collected, and a display filter interrogates data you already have',
          'Display filters only work on encrypted traffic',
          'Capture filters run after the capture is complete',
        ],
        answer: 1,
        explain:
          'Capture (BPF) filters are applied while capturing and permanently limit what is written (useful to keep volume down and focus on, say, one host). Display filters are applied afterward to a loaded capture and let you slice and re-slice it non-destructively to answer specific questions. You use capture filters to control what you collect and display filters (with a much richer field syntax) to analyse it.',
        hint: 'One decides what gets recorded; the other decides what gets shown from what was recorded.',
      },
    },

    {
      id: 'bnet-a-02',
      title: 'ARP and layer‑2 attacks',
      read: `On a local network, machines find each other's hardware (**MAC**) addresses using **ARP** (Address Resolution Protocol). ARP is trusting and unauthenticated — which makes **ARP spoofing** one of the classic local-network attacks, and detecting it a core amateur skill.

## How ARP works

To send to \`192.168.1.10\`, a host needs that IP's MAC address. It broadcasts "who has 192.168.1.10?"; the owner replies "me, at MAC aa:bb:...". The asker caches the answer. There is **no authentication** — any machine can answer, and hosts believe the reply.

## ARP spoofing / poisoning

An attacker on the LAN sends forged ARP replies: "192.168.1.1 (the gateway) is at *my* MAC". Victims update their cache and start sending the gateway's traffic to the attacker instead. Do the same in both directions and the attacker becomes a **man-in-the-middle (MITM)** — all the victim's traffic flows through them, to read (and if unencrypted, capture credentials) or modify, before forwarding it on so nothing looks broken.

## Detecting it

- **Duplicate/changing MAC for an IP** — the tell-tale sign. If the gateway's IP suddenly maps to a new MAC (or two MACs claim the same IP), that is ARP poisoning. Tools like \`arpwatch\` alert on ARP changes; in Wireshark, \`arp.duplicate-address-detected\` and a flood of unsolicited ARP replies stand out.
- **A host receiving traffic it shouldn't** — the MITM's machine sees everyone's packets.
- **Gratuitous ARP storms** — many unsolicited "here is my mapping" replies.

## Defending it

- **Dynamic ARP Inspection (DAI)** on managed switches — the switch validates ARP against trusted DHCP bindings and drops forgeries. The primary enterprise defence.
- **Static ARP entries** for critical hosts (e.g. the gateway) so forged replies are ignored — practical for a few key mappings.
- **Encryption everywhere** — even a successful MITM cannot read TLS-protected content (it can still see metadata and attempt downgrade), so HTTPS/SSH limit the damage.
- **Port security / 802.1X** to control who is even on the LAN.

ARP spoofing is a reminder that layer 2 is trust-based: on a shared local network, an attacker who is *on* it can redirect traffic. Watching for duplicate MAC mappings and deploying DAI are how you catch and stop it.`,
      sample: {
        lang: 'text',
        caption: 'ARP poisoning: the gateway’s IP suddenly has the attacker’s MAC',
        code: `Normal ARP cache on the victim:
  192.168.1.1 (gateway)  ->  00:11:22:aa:bb:cc   (the real router)

After the attacker sends forged ARP replies:
  192.168.1.1 (gateway)  ->  66:66:66:de:ad:00   (the ATTACKER's MAC)

Now the victim sends all internet-bound traffic to the attacker,
who reads/modifies it and forwards to the real gateway = MITM.

Detection: arpwatch logs "flip flop 192.168.1.1 00:11:22..-> 66:66..";
Wireshark shows two MACs claiming one IP (arp.duplicate-address).`,
        output: `The gateway IP mapping to a NEW/second MAC is the signature of
ARP spoofing. Defend with Dynamic ARP Inspection on switches,
static ARP for key hosts, and encryption to blunt the MITM.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the tell-tale sign of an ARP-spoofing man-in-the-middle attack on a local network?',
        options: [
          'A host uses too much bandwidth',
          'An IP address (often the gateway) suddenly maps to a different or a second MAC address — because the attacker is sending forged ARP replies claiming that IP, so victims send its traffic to the attacker instead',
          'A new DNS server appears',
          'The firewall logs a blocked port',
        ],
        answer: 1,
        explain:
          'ARP is unauthenticated, so an attacker forges replies binding a legitimate IP (typically the gateway) to their own MAC. The signature is a changed or duplicated MAC for an IP — the gateway "moving" to a new hardware address, or two MACs claiming one IP. Tools like arpwatch and Wireshark’s duplicate-address detection catch it; Dynamic ARP Inspection on switches, static ARP for key hosts, and pervasive encryption defend against it.',
        hint: 'ARP maps IP to MAC. What changes when an attacker forges those replies?',
      },
    },

    {
      id: 'bnet-a-03',
      title: 'The port-scan family and TCP anomalies',
      read: `Reconnaissance almost always starts with **scanning** — mapping which hosts are up and which ports are open. Recognising the scan variants (and the TCP anomalies they produce) lets you catch an attacker at the earliest stage.

## Host discovery vs port scanning

- **Ping/host sweep** — probing many IPs (ICMP echo, or a SYN/ACK to a common port) to find live hosts. A single source touching a whole subnet is the sweep signature.
- **Port scan** — probing many *ports* on a host to find services.

## The scan variants (nmap's family)

Each manipulates TCP flags differently, so each has a distinct fingerprint:

- **SYN (half-open) scan** — the default: SYN, read SYN-ACK (open) or RST (closed), never completes. A burst of bare SYNs across ports.
- **Connect scan** — completes the full handshake (used without raw-socket privileges); shows as many short-lived full connections.
- **FIN, NULL, XMAS scans** — send unusual flag combinations (FIN alone; no flags; FIN+PSH+URG "lit up like a Christmas tree") to evade simple filters and infer state from the (lack of) response. These flag combos are *abnormal* — no legitimate connection sends a bare FIN or a NULL packet — so they are strong signals in themselves.
- **UDP scan** — probes UDP ports (slower; open UDP ports often stay silent, closed ones send ICMP port-unreachable).
- **Version/OS detection** — deeper probes to fingerprint services and the OS.

## The detection signatures

- **One source → many ports on one host** (port scan) or **one source → one port across many hosts** (sweep/spray) in a short window.
- **A spike of RSTs** (many closed ports being probed).
- **Illegal flag combinations** (NULL/FIN/XMAS) — inherently suspicious.
- **ICMP port-unreachable bursts** (UDP scanning).

## Other TCP anomalies worth reading

- **Retransmissions / dup ACKs** — usually network trouble, but excessive ones can indicate problems or manipulation.
- **RST floods** — can be scanning, or an attempt to tear down connections.
- **Tiny/overlapping fragments** — sometimes IDS evasion (a later topic).

Scans are the opening move of most attacks. IDS/IPS (later) automate scan detection, but the amateur defender should recognise the shapes directly: a source fanning across ports, illegal flag combos, and sweep patterns are reconnaissance you want to catch and correlate with what happens next.`,
      sample: {
        lang: 'bash',
        caption: 'Spotting a scan in a capture with tshark',
        code: `# count destination ports touched per source (port-scan tell)
tshark -r capture.pcap -Y 'tcp.flags.syn==1 && tcp.flags.ack==0' \\
  -T fields -e ip.src -e tcp.dstport | sort -u | \\
  awk '{c[$1]++} END{for(s in c) print c[s], s}' | sort -rn`,
        output: `1017 10.0.0.9     <- one source sent SYNs to 1017 different
                    ports: a port scan.
   3 10.0.0.5
# NULL/FIN/XMAS scans show as illegal flag combos, e.g.
#   tcp.flags == 0x000  (NULL)   tcp.flags == 0x029 (XMAS)
# no legitimate traffic uses those - strong signals by themselves.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are NULL, FIN, and XMAS scans (packets with no flags, a lone FIN, or FIN+PSH+URG set) considered strong indicators of malicious activity in themselves?',
        options: [
          'They carry large payloads',
          'These flag combinations never occur in legitimate TCP connections — normal traffic follows the SYN/SYN-ACK/ACK handshake — so a packet with no flags, a bare FIN, or the XMAS combination is inherently anomalous and signals scanning or evasion attempts',
          'They are encrypted',
          'They always come from the gateway',
        ],
        answer: 1,
        explain:
          'Legitimate TCP uses well-defined flag sequences (SYN to open, ACK during the connection, FIN/RST to close in context). A packet with no flags set (NULL), a lone FIN outside a connection, or FIN+PSH+URG (XMAS) is not something a normal stack sends — these are crafted probes designed to elicit state-revealing responses and evade naive filters. Their very abnormality makes them high-signal: seeing them is itself evidence of scanning.',
        hint: 'Does normal TCP ever send a packet with no flags, or a lone FIN out of the blue?',
      },
    },

    {
      id: 'bnet-a-04',
      title: 'tcpdump and BPF in depth',
      read: `Wireshark is for deep analysis; **tcpdump** with **BPF** (Berkeley Packet Filter) syntax is for fast, scriptable capture and triage on any box — often a server with no GUI. Mastering BPF lets you grab exactly the right traffic under pressure.

## Reading tcpdump output

Each line: timestamp, \`src > dst\`, flags and details. Useful flags to the command:

- \`-i eth0\` interface, \`-n\` no name resolution, \`-nn\` no port names either, \`-c 100\` stop after 100 packets, \`-w file.pcap\` write raw, \`-r file.pcap\` read, \`-A\` print ASCII payload, \`-X\` hex+ASCII, \`-s 0\` full packet.

## BPF filter language

- **Primitives:** \`host 10.0.0.5\`, \`src host\`, \`dst host\`, \`net 192.168.1.0/24\`, \`port 443\`, \`portrange 1-1024\`, \`tcp\`/\`udp\`/\`icmp\`.
- **Combine:** \`and\`, \`or\`, \`not\` — e.g. \`tcp and dst port 443 and not host 10.0.0.1\`.
- **Bit matches** for flags: \`tcp[tcpflags] & tcp-syn != 0\` (SYNs), \`tcp[tcpflags] == tcp-rst\` (RSTs), \`tcp[13] & 2 != 0\` (raw offset form). These let you hunt handshake anomalies from the command line.

## Practical defensive one-liners

- Who is scanning? \`tcpdump -nn 'tcp[tcpflags] & tcp-syn != 0 and tcp[tcpflags] & tcp-ack == 0'\`
- Cleartext HTTP creds passing by: \`tcpdump -nnA 'tcp port 80'\` (then eyeball POSTs).
- Traffic to a suspect IP: \`tcpdump -nn host 203.0.113.9 -w suspect.pcap\`.
- DNS activity: \`tcpdump -nn udp port 53\`.

## Why BPF matters

BPF runs **in the kernel**, so filtering is efficient even at high traffic rates — you capture only what matches without drowning the box or the disk. On an incident, being able to say "capture just this host's TCP traffic to that port, to a file, on a headless server" in one line is exactly the skill that turns a hunch into evidence. tcpdump + BPF is the universal, always-available network microscope; Wireshark then reads the pcap you saved.`,
      sample: {
        lang: 'bash',
        caption: 'BPF one-liners for triage on a headless server',
        code: `# bare SYNs only (find a scanner), no name resolution, first 20
sudo tcpdump -nn -c 20 'tcp[tcpflags] & tcp-syn != 0 and tcp[tcpflags] & tcp-ack == 0'

# everything to/from a suspect host, saved for Wireshark
sudo tcpdump -nn -w suspect.pcap host 203.0.113.9

# peek at cleartext HTTP payloads (creds sent over port 80)
sudo tcpdump -nnA 'tcp port 80 and (tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x504f5354)'`,
        output: `14:20:01 IP 10.0.0.9.44122 > 10.0.0.5.22:   Flags [S]
14:20:01 IP 10.0.0.9.44123 > 10.0.0.5.23:   Flags [S]
14:20:01 IP 10.0.0.9.44124 > 10.0.0.5.25:   Flags [S]
# one source, bare SYNs, marching across ports = a scan,
# caught with a single kernel-level BPF filter on a GUI-less box.
# (0x504f5354 = "POST" - the last filter isolates HTTP POSTs.)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is BPF filtering (as used by tcpdump) efficient enough to use on a busy server during an incident?',
        options: [
          'It only works on small networks',
          'BPF filters run in the kernel, so unwanted packets are discarded before they reach userspace — you capture only what matches without overwhelming the machine or disk, making targeted capture practical even at high traffic rates',
          'It compresses every packet',
          'It captures nothing until the incident is over',
        ],
        answer: 1,
        explain:
          'BPF is a small filtering program executed in the kernel’s packet path, so packets that don’t match are dropped immediately rather than copied to userspace and written to disk. That efficiency lets you capture precisely the traffic you need (one host, one port, SYNs only) on a busy production server without saturating CPU or storage — exactly what you want when turning a hunch into targeted evidence during an incident.',
        hint: 'Where does the filtering happen, and what does that avoid copying and storing?',
      },
    },

    {
      id: 'bnet-a-05',
      title: 'DHCP and rogue servers',
      read: `When a device joins a network, **DHCP** (Dynamic Host Configuration Protocol) automatically gives it an IP address, subnet mask, **gateway**, and **DNS servers**. Because DHCP hands out those last two, a **rogue DHCP server** is a powerful attack — and detecting one is an amateur defensive skill.

## The DHCP exchange (DORA)

1. **Discover** — the new client broadcasts "any DHCP servers out there?"
2. **Offer** — a server replies with an available address and settings.
3. **Request** — the client asks for the offered lease.
4. **Acknowledge** — the server confirms.

It is broadcast-based and, like ARP, unauthenticated on a basic network — the client trusts whatever offer arrives first.

## The rogue DHCP attack

An attacker runs their own DHCP server on the LAN. If their offer reaches clients first, clients accept it — and the attacker sets:

- **The gateway to the attacker's IP** → all the client's traffic routes through the attacker (MITM, like ARP spoofing but via DHCP).
- **The DNS server to the attacker's IP** → the attacker answers *every* name lookup, redirecting the victim to malicious servers of their choosing.

Either turns the attacker into a man-in-the-middle or a traffic redirector. A rogue DHCP can also be *accidental* (someone plugs in a home router), causing outages — so detecting unexpected DHCP servers matters for availability too.

## Detecting and defending

- **Detect** — more than one DHCP server offering on a segment where there should be one; DHCP **Offer/Ack packets from an unexpected source MAC/IP**. In a capture, \`bootp\`/\`dhcp\` filter and check who is answering. Clients suddenly getting an odd gateway or DNS server is a downstream symptom.
- **Defend** — **DHCP Snooping** on managed switches: designate which switch ports are allowed to send DHCP server replies ("trusted"), and drop server replies from all others. This is the primary control — a rogue DHCP on an untrusted port is silenced. It also builds the binding table that Dynamic ARP Inspection uses (the two pair up).

DHCP is another trust-based bootstrap protocol: whoever answers first configures your gateway and DNS. Watching for unexpected DHCP servers and enabling DHCP Snooping keeps that bootstrap trustworthy.`,
      sample: {
        lang: 'text',
        caption: 'Two DHCP servers answering — one is rogue',
        code: `Wireshark filter: dhcp   (or bootp)

  DHCP Offer  from 192.168.1.1  (00:11:22:aa:bb:cc)  gw=192.168.1.1
                                                     dns=192.168.1.1
  DHCP Offer  from 192.168.1.66 (66:66:66:de:ad:00)  gw=192.168.1.66
                                                     dns=192.168.1.66
# TWO offers on a network that should have ONE DHCP server.
# The second sets ITSELF as gateway AND DNS = rogue DHCP:
# it becomes MITM and controls the victim's name resolution.`,
        output: `Multiple DHCP offers (especially one setting itself as gateway
and DNS) = a rogue DHCP server. Defend with DHCP Snooping on
switches: only trusted ports may send DHCP server replies.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a rogue DHCP server so dangerous, and what is the primary switch-based defence?',
        options: [
          'It only slows down IP assignment; no defence is needed',
          'DHCP hands clients their gateway and DNS server, so a rogue DHCP can set itself as the gateway (MITM) and/or DNS (redirect all name lookups); DHCP Snooping — designating only trusted switch ports as allowed to send DHCP server replies — is the primary defence',
          'It steals passwords directly from the switch',
          'It can only cause outages, never interception',
        ],
        answer: 1,
        explain:
          'Because clients accept the first DHCP offer and it dictates gateway and DNS, an attacker’s rogue DHCP can route all of a victim’s traffic through themselves (MITM) and control every DNS answer (redirecting to malicious hosts). DHCP Snooping counters it: the switch only permits DHCP server responses from designated trusted ports and drops them elsewhere, silencing a rogue server — and its binding table also underpins Dynamic ARP Inspection.',
        hint: 'What two critical settings does DHCP give a client, and what could an attacker do by controlling them?',
      },
    },

    {
      id: 'bnet-a-06',
      title: 'ICMP and covert channels',
      read: `**ICMP** (Internet Control Message Protocol) is the network's messaging/diagnostic protocol — the thing behind \`ping\` and \`traceroute\`. It is useful, mostly benign, and quietly abusable, so a defender should understand both its legitimate role and its darker uses.

## Legitimate ICMP

- **Echo request/reply** (ping) — "are you there?"
- **Time exceeded** — powers \`traceroute\` (each hop that discards a TTL-expired packet sends this back).
- **Destination unreachable** — "no route" / "port closed" (a closed UDP port replies this — used by UDP scanning).
- **Redirect** — "use a better gateway" (abusable; the Linux track disabled accepting these via sysctl).

## The abuses a defender watches for

- **ICMP tunnelling / covert channel** — ICMP echo packets can carry arbitrary data in their payload. Attackers hide a command channel or exfiltrate data inside ping traffic, because ICMP is often allowed out when other protocols are filtered. The tell: pings with **large or unusual payloads**, **high volume**, or **non-standard patterns** (normal ping payloads are small and uniform).
- **Ping sweeps** — ICMP echo to many hosts to map what is alive (host discovery, from the scan step).
- **ICMP floods (DoS)** — overwhelming a target with ICMP (smurf attacks and similar).
- **ICMP redirect attacks** — forging redirects to reroute a victim's traffic (MITM), which is why hosts should ignore them.

## Detecting ICMP abuse

- **Payload size and content** — legitimate echo payloads are small and consistent (often the OS's standard pattern). Large, varying, or high-entropy ICMP payloads suggest tunnelling. In Wireshark, inspect \`icmp\` packet data length and content.
- **Volume and direction** — a steady stream of ICMP to one external host, or lots of ICMP where little is expected, is suspicious.
- **Baseline** — know your normal ICMP (a bit of ping/monitoring) so a tunnel's abnormal volume stands out.

## The lesson

Any protocol that is *allowed* can be *abused* to carry data — ICMP, DNS (earlier), even HTTP(S). The general defensive principle: don't just ask "is this protocol permitted?" but "does this *use* of the protocol look normal?" Small uniform pings are fine; ping packets stuffed with data flowing steadily to one host are a covert channel. Egress filtering (block outbound ICMP where not needed) and payload/volume monitoring keep ICMP honest.`,
      sample: {
        lang: 'text',
        caption: 'Normal ping vs. an ICMP tunnel',
        code: `NORMAL echo request (Wireshark, icmp):
  Type: 8 (Echo request)  Data length: 48 bytes
  Data: standard OS pattern (0x0809...373839, repeating)

ICMP TUNNEL:
  Type: 8 (Echo request)  Data length: 1024 bytes  <- large
  Data: high-entropy / looks encrypted, DIFFERENT each packet
  ...one every ~1s, steadily, to a single external host
# ICMP is often allowed outbound, so it becomes a covert
# command/exfil channel. Small uniform payload = normal;
# big, varying payload at a steady rate = tunnelling.`,
        output: `The signal is payload size, variability and volume, not the
protocol itself. "Is this USE of ICMP normal?" beats "is ICMP
allowed?" Block outbound ICMP where unneeded; monitor payloads.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How would you distinguish ICMP tunnelling (a covert channel hidden in ping traffic) from legitimate ping activity?',
        options: [
          'Any ICMP traffic is malicious',
          'Legitimate echo requests have small, uniform payloads; ICMP tunnelling shows large, high-entropy or varying payloads, often at a steady volume to a single host — so payload size/variability and traffic volume, not the mere presence of ICMP, reveal the covert channel',
          'Tunnelling uses a different port than ping',
          'You cannot tell them apart',
        ],
        answer: 1,
        explain:
          'Normal ping payloads are small and follow a consistent OS pattern. Tunnelling stuffs data into the ICMP payload, so the tell is large, variable, high-entropy payloads flowing steadily to one destination — the protocol is the same, but its *use* is abnormal. This illustrates the general principle: any allowed protocol can be abused as a data carrier, so defenders judge whether the usage looks normal, and apply egress filtering plus payload/volume monitoring.',
        hint: 'ICMP has no ports. What about the packets — their size, content, and rate — betrays a hidden channel?',
      },
    },

    {
      id: 'bnet-a-07',
      title: 'Detecting scans and sweeps at scale',
      read: `You can spot a scan in a capture; the amateur goal is to detect scanning **systematically** — turning the patterns from earlier into repeatable detection logic you could run on logs or flows across the whole network.

## The core patterns, as detection logic

- **Vertical scan (port scan)** — one **source → one destination**, **many ports**, short time window. Detection: count distinct destination ports per (src,dst) pair; a high count is a scan.
- **Horizontal scan (sweep)** — one **source → one port → many destinations**. Detection: count distinct destination IPs per (src, dstport). A source hitting port 445 across a whole subnet is hunting for SMB (often pre-ransomware lateral movement).
- **Block scan** — many ports across many hosts (the combination).
- **Slow / "low and slow" scans** — spread over hours/days to stay under thresholds. Detection needs a longer time window and correlation; naive per-minute thresholds miss them.

## Thresholds and their trade-offs

Detection usually counts events in a window against a threshold ("more than N distinct ports/hosts from one source in T minutes"). The tension:

- **Too sensitive** → false positives (a vulnerability scanner you run, a backup job, a busy server) drown you.
- **Too lax** → slow scans slip through.

So you **tune** thresholds to your environment and **allow-list** known scanners (your own vuln scanning, monitoring). This is the same alert-quality discipline as host detection: a scan alert that fires on legitimate activity trains people to ignore it.

## Beyond thresholds

- **Failed-connection ratio** — scanners generate lots of connections that get RSTs or no reply (probing closed ports/dead hosts). A source with a high ratio of failed to successful connections is scanning, even below a raw count threshold.
- **Fan-out** — the shape (one-to-many) matters more than volume; distributional/anomaly methods (later levels) catch what fixed thresholds miss.

## Why detect scans

Scanning is the reconnaissance that precedes most attacks, so catching it is an **early warning** — often before exploitation. Even when you cannot stop the scan, detecting it tells you *who* is interested and in *what*, and lets you watch that source closely for the next stage. Systematic scan detection (built into IDS/flow tools you meet next level) is a foundational network detection.`,
      sample: {
        lang: 'bash',
        caption: 'Scan detection logic over flow-like data',
        code: `# VERTICAL scan: distinct dst ports per (src -> dst), flag > 100
awk '{print $1, $2, $4}' flows.txt | sort -u | \\
  awk '{c[$1" "$2]++} END{for(k in c) if(c[k]>100) print c[k], k}'

# HORIZONTAL sweep: distinct dst hosts per (src, dstport), flag > 50
awk '{print $1, $4, $3}' flows.txt | sort -u | \\
  awk '{c[$1" "$2]++} END{for(k in c) if(c[k]>50) print c[k], k}'`,
        output: `# vertical:
1017 10.0.0.9 10.0.0.5      <- 1017 ports on one host = port scan
# horizontal:
243 10.0.0.9 445            <- port 445 across 243 hosts = SMB
                              sweep (pre-lateral-movement / worm)
# Tune thresholds and allow-list your own scanners to cut noise.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A source connects to TCP port 445 across 243 different hosts in a subnet in a few minutes. What kind of scan is this and why does it matter?',
        options: [
          'A vertical port scan of one host',
          'A horizontal sweep — one source probing a single service (SMB/445) across many hosts — which often precedes lateral movement or worm/ransomware spread, making it an important early-warning signal',
          'Normal file-sharing traffic',
          'A DNS query flood',
        ],
        answer: 1,
        explain:
          'One source → one port → many destinations is a horizontal (sweep) scan: the attacker is hunting everywhere for a specific service. Port 445 is SMB, a prime target for lateral movement and worm/ransomware propagation (EternalBlue-era). Detecting this fan-out early — by counting distinct destination hosts per (source, port) and tuning thresholds/allow-lists — gives warning before the follow-on exploitation, which is the value of systematic scan detection.',
        hint: 'Is this one-host-many-ports or one-port-many-hosts, and what does probing SMB everywhere usually lead to?',
      },
    },

    {
      id: 'bnet-a-08',
      title: 'Firewalls in practice',
      read: `The beginner level introduced the firewall's principles (stateful, default-deny, ingress and egress). Now go one layer deeper into how firewall policy is actually built and reasoned about — because misconfigured firewall rules are a common, real vulnerability.

## How rules are evaluated

Firewalls process rules as an **ordered list**, usually **first-match wins**. This means **order matters enormously**: a broad "allow" placed before a specific "deny" lets the traffic through before the deny is ever reached. Reading a ruleset means reading it *in order*, as the firewall does.

## The anatomy of a ruleset (Linux nftables/iptables, and the same idea everywhere)

- **Chains/hooks** for direction: input (to the host), output (from it), forward (through it, for a router/firewall).
- Each rule matches on source/dest IP, port, protocol, interface, and connection **state**, then takes an action: **accept**, **drop** (silent), or **reject** (send an error back).
- The **policy** (default action) should be **drop** — default-deny — with explicit accepts above it.
- **State matching** (\`ct state established,related accept\`) near the top efficiently allows the return traffic of connections you initiated, so you only write rules for *new* connections.

## Common firewall misconfigurations (findings)

- **Overly broad rules** — \`allow any -> any:any\`, or a management port open to the whole internet (RDP/SSH/database exposed) rather than to admin ranges.
- **Rule-order mistakes** — a permissive rule shadowing a restrictive one.
- **No egress filtering** — outbound wide open, so malware freely reaches its C2 (the beginner egress lesson).
- **Stale rules** — allows for services/hosts that no longer exist, quietly widening the attack surface. Firewall rulesets need periodic review and pruning, like any config.
- **"Temporary" allows** that became permanent.

## Reading and auditing

Auditing a firewall means: is it default-deny? Are management interfaces restricted to admin sources? Is egress controlled? Are there broad or shadowed rules? Are there stale entries? Tools and firewall logs help, but the skill is reading the ordered ruleset the way the firewall executes it and spotting the rule that is broader than intended.

The firewall is only as good as its rules. Understanding first-match ordering, stateful return traffic, and the common misconfigurations lets you both build sound policy and find the hole in someone else's.`,
      sample: {
        lang: 'bash',
        caption: 'A default-deny nftables policy — and an order bug to avoid',
        code: `# GOOD (nftables): state first, specific allows, default drop
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;
    ct state established,related accept
    tcp dport 443 accept
    ip saddr 10.99.0.0/24 tcp dport 22 accept   # ssh: admins only
    # everything else hits policy drop
  }
}`,
        output: `# ORDER BUG to watch for (first-match wins):
#   tcp dport 22 accept              <- allows SSH from ANYWHERE
#   ip saddr 10.99.0.0/24 tcp dport 22 accept   (never reached)
# The broad allow above shadows the intended restriction, so
# SSH is open to the internet. Read rules IN ORDER, as the
# firewall does, and audit for broad/shadowing/stale rules.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a firewall that evaluates rules first-match-wins, why does rule order matter so much?',
        options: [
          'Order does not affect the outcome',
          'The first rule that matches a packet decides its fate, so a broad "allow" placed before a more specific "deny" (or restriction) lets traffic through before the restriction is ever evaluated — meaning a mis-ordered permissive rule can silently defeat an intended restriction',
          'Only the last rule is ever used',
          'Rules are evaluated randomly',
        ],
        answer: 1,
        explain:
          'With first-match evaluation, the firewall stops at the first rule that matches. A permissive rule (e.g. "allow SSH from anywhere") placed above a restrictive one ("allow SSH only from the admin subnet") means the broad rule matches first and the restriction is never reached — SSH is effectively open to the world. Reading a ruleset in execution order, and watching for broad/shadowing/stale rules, is essential to both building and auditing firewall policy.',
        hint: 'If the firewall stops at the first matching rule, what does a broad allow placed before a specific deny do?',
      },
    },

    {
      id: 'bnet-a-09',
      title: 'Segmentation and VLANs',
      read: `A flat network — where every device can reach every other — means one compromised machine can attack everything (the lateral-movement problem from the Windows track). **Segmentation** divides the network into zones with controlled traffic between them, containing a breach. It is one of the most important architectural defences.

## VLANs

A **VLAN** (Virtual LAN) logically splits one physical switch into separate broadcast domains, so devices in different VLANs cannot talk directly at layer 2 — traffic between them must go through a **router/firewall** where you can filter it. This lets you group by function and control the flows:

- Put **user workstations**, **servers**, **VoIP phones**, **printers/IoT**, **management**, and **guest** each in their own VLAN.
- Devices in a VLAN talk freely within it, but crossing VLANs is filtered.

## Designing segments

Group by **trust level and function**, then define the *allowed* flows between segments (default-deny between segments, allow only what's needed — the firewall principle applied internally):

- Workstations may reach servers on specific service ports, but **not each other** (kills workstation-to-workstation lateral movement — the host-firewall lesson at the network layer).
- The **management** network (switch/firewall admin, iLO/iDRAC) is tightly restricted — reachable only from admin hosts.
- **IoT/guest** networks are isolated from everything sensitive (a compromised smart TV or guest laptop can't touch servers).
- A **DMZ** holds internet-facing services, separated from the internal network so a compromised web server can't directly reach the core.

## Why it contains breaches

Segmentation means a foothold in one zone does **not** grant reach to others — the attacker hits a firewall between segments. It converts "one machine fell → everything is reachable" into "one machine fell → the attacker is boxed into its segment and must break through monitored chokepoints to go further." Those chokepoints are also where you **watch** (IDS/logging on inter-segment traffic), so lateral movement between zones is both harder and louder.

## The pitfalls

- **VLAN hopping** — misconfigured switch ports (e.g. leaving ports on the native VLAN, or auto-trunking enabled) can let an attacker jump VLANs; disable unused trunking, set proper native VLANs, and lock down ports.
- **Over-permissive inter-VLAN rules** — segmentation with "allow any between VLANs" is segmentation in name only. The value is in the *restrictive* inter-segment policy.

Segmentation is defense-in-depth made structural: assume any one segment can fall, and design so that falling doesn't spread. It underpins the zero-trust and micro-segmentation ideas you'll meet in the skilled level.`,
      sample: {
        lang: 'text',
        caption: 'Flat vs. segmented: what a compromised workstation can reach',
        code: `FLAT network:
  compromise WKSTN-A  ->  can reach servers, DB, other workstations,
                          management, printers - everything. Lateral
                          movement is free.

SEGMENTED (VLANs + default-deny inter-VLAN policy):
  Workstations VLAN --(only :443 to App VLAN)--> Servers VLAN
  Workstations VLAN --X--> other workstations (blocked)
  Workstations VLAN --X--> Management VLAN (blocked)
  compromise WKSTN-A -> boxed into its VLAN; every hop out crosses
                        a filtered, MONITORED chokepoint.`,
        output: `Segmentation turns "one machine fell = everything reachable"
into "one machine fell = contained to its zone." The inter-zone
firewalls are both barriers and monitoring chokepoints.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does network segmentation (e.g. VLANs with restrictive inter-segment policy) limit the damage of a compromised host?',
        options: [
          'It prevents the host from being compromised',
          'It divides the network into zones so traffic between them must pass through a filtering, monitored chokepoint; a foothold in one segment cannot freely reach others, containing lateral movement and forcing the attacker through barriers where you can also detect them',
          'It encrypts all internal traffic',
          'It only helps against external attackers',
        ],
        answer: 1,
        explain:
          'Segmentation confines a breach: with default-deny policy between zones, a compromised workstation can’t roam to servers, management, or peer workstations without crossing a firewall that both blocks unauthorised flows and provides a monitoring point. It converts a flat "reach everything" network into contained zones with inspected chokepoints — the structural form of defence in depth, and the foundation for micro-segmentation and zero trust. (Beware VLAN hopping and over-permissive inter-VLAN rules, which undermine it.)',
        hint: 'After segmentation, what must an attacker cross to get from one zone to another, and what happens there?',
      },
    },

    {
      id: 'bnet-a-10',
      title: 'Recognising data exfiltration',
      read: `The end goal of many attacks is **exfiltration** — getting stolen data *out*. The network is where exfiltration is most visible, because the data must leave, so recognising its patterns is a high-value skill.

## The shapes of exfiltration

- **Large outbound transfers** — an unusual volume of data leaving, especially from a host/server that normally sends little, to an external or unfamiliar destination. A workstation uploading gigabytes at 2am is a classic tell.
- **Unusual destinations** — data going to a cloud-storage or paste site the organisation doesn't use, a new/foreign IP, or a freshly registered domain.
- **Protocol abuse / covert channels** — hiding data where inspection is weak: **DNS tunnelling** (data in query names, from the DNS step), **ICMP tunnelling** (previous step), data smuggled in HTTP(S) headers or as "images". Attackers pick channels that are usually allowed out.
- **Encrypted uploads to blend in** — using HTTPS to a legitimate-looking service so content is hidden; here you rely on volume, destination, and timing rather than content.
- **"Low and slow"** — trickling data out in small pieces over a long time to avoid volume thresholds.

## Detection approaches

- **Volume baselining** — know each host's normal outbound data volume by direction and time; alert on significant deviations (a host sending 100× its usual). Flow data (next level) is ideal for this.
- **Destination reputation** — outbound to known-bad, newly registered, or never-before-seen domains/IPs; to cloud-storage/paste sites against policy.
- **Ratio anomalies** — a host that normally *receives* suddenly *sending* a lot (asymmetry flip).
- **Protocol anomalies** — DNS/ICMP carrying too much data; HTTP(S) to odd destinations at odd times.
- **DLP (Data Loss Prevention)** — content-aware controls that detect/block sensitive data (card numbers, classified markings) leaving — a complementary, content-based layer where you can inspect.

## The mindset

Exfiltration is the payoff, so it is worth catching even late — it may be your last chance to prevent the breach's real harm. And it is fundamentally a **network** event: data has to traverse the wire to leave. Watching outbound volume, destinations, and protocol misuse — with baselines so the abnormal stands out — is how a defender spots data leaving before it's all gone. Egress filtering (beginner level) both **limits** the channels available and makes the remaining ones easier to monitor.`,
      sample: {
        lang: 'text',
        caption: 'Exfiltration signatures in outbound traffic',
        code: `Flow summary (outbound), a defender reviewing the day:

  Host        Dest              Bytes out   Normal?   Note
  10.0.0.5    203.0.113.9        14.2 GB    no        DB server sending
                                                       14 GB out - never does
  10.0.0.22   dropmefiles.example  3.1 GB   no        paste/file site,
                                                       against policy
  10.0.0.31   c2.evil.example     small, but 4,000 DNS queries/hr
                                                       = DNS tunnelling

All three: data leaving to unusual places / via unusual channels.`,
        output: `Exfiltration is a NETWORK event - the data must leave. Watch
outbound VOLUME (vs each host's baseline), DESTINATION (odd/new/
policy-violating), and PROTOCOL abuse (DNS/ICMP carrying data).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the network an especially good place to detect data exfiltration, and what signals reveal it?',
        options: [
          'Exfiltration never touches the network',
          'Stolen data must traverse the network to leave, so it is inherently visible there; the signals are anomalous outbound volume (vs a host’s baseline), unusual or policy-violating destinations, and protocol abuse (DNS/ICMP tunnelling, data hidden in HTTP) — often best caught by baselining and flow analysis',
          'Only encrypted traffic can be exfiltration',
          'Exfiltration is only visible on the host, never the network',
        ],
        answer: 1,
        explain:
          'Whatever an attacker steals has to leave over the network, making exfiltration fundamentally a network-observable event. You catch it by comparing outbound volume to each host’s normal (a server suddenly sending gigabytes), watching destinations (new/foreign/paste-and-cloud-storage sites), and spotting protocol abuse (DNS/ICMP tunnelling, oversized HTTP uploads). Baselines and flow data make the anomalies stand out, and egress filtering both limits channels and eases monitoring. Catching it — even late — can prevent the breach’s real harm.',
        hint: 'To steal data, where must it go, and what three things about that traffic look abnormal?',
      },
    },

    {
      id: 'bnet-a-11',
      title: 'Network log sources',
      read: `You cannot capture every packet forever, so much day-to-day network defence runs on **logs and summaries** from network devices. Knowing these sources — what each shows and its limits — is essential to practical monitoring.

## The key sources

- **Firewall logs** — allowed/denied connections: source, destination, port, action, sometimes bytes. Great for "what was blocked?" (scan attempts, egress denies) and "who connected to what?" High volume; usually you log denies and key allows.
- **Proxy / web gateway logs** — for organisations that route web traffic through a proxy: the **URLs** visited, HTTP methods, status, bytes, user, and category. Even for HTTPS, the proxy sees the destination (and, if it does TLS inspection, more). A rich source for spotting malware C2 domains, policy violations, and downloads.
- **DNS logs** — every name resolved (from the DNS step): the single best source for "what did hosts try to reach?" — C2 domains, DGA/random domains, tunnelling. Often the highest signal-to-effort ratio.
- **Flow data (NetFlow/IPFIX/sFlow)** — a *summary* of each conversation: src/dst IP, ports, protocol, bytes, packets, duration — **without the content**. Cheap to keep at scale, so it gives long retention and a fleet-wide view; ideal for volume baselining, exfiltration and beaconing detection, and answering "who talked to that IP in the last 90 days?" You meet this properly next level.
- **VPN / remote-access logs** — who connected remotely, from where, when.
- **DHCP logs** — which MAC had which IP at a given time (essential for attributing an IP in an old log to a device).
- **IDS/IPS alerts** — signature/anomaly detections (next level).

## Logs vs full capture

- **Full packet capture** = ground truth and content, but huge and short-retention.
- **Logs/flow** = summaries, so cheap to keep for months and searchable at scale, but lacking packet content.

The practical model: keep **flow and logs long-term** for broad visibility and hunting, and **full capture selectively** (a suspect host, a segment, triggered by an alert) for deep evidence. Flow tells you *that* two hosts exchanged 14 GB; the pcap (if you have it) tells you *what* was in it.

## Attribution needs correlation

A firewall log shows an IP; to know *which device and user* that was at that time, you correlate with DHCP (IP→MAC), and directory/VPN logs (→ user). Real investigations chain these sources together. Centralising them (into a SIEM) is what makes that correlation and long-term hunting possible — the network side of the centralized-logging lesson from the host tracks.`,
      sample: {
        lang: 'text',
        caption: 'Different sources, different views of the same host',
        code: `Firewall log:  10.0.0.31 -> 203.0.113.9:443 ALLOW  (bytes: 41M)
Proxy log:     10.0.0.31 GET https://c2.evil.example/gate  200
DNS log:       10.0.0.31 resolved c2.evil.example (new domain)
Flow (NetFlow):10.0.0.31 <-> 203.0.113.9  proto TCP  bytes 41M
               dur 6h  packets: many small, regular  <- beaconing
DHCP log:      10.0.0.31 leased to MAC aa:.. = laptop "FIN-JDOE"

Correlated: JDOE's laptop resolved and beaconed to a new C2
domain over HTTPS, moving 41 MB. No single source said it all.`,
        output: `Each source is a partial view: firewall (connections), proxy
(URLs), DNS (intent), flow (volume/patterns, long retention),
DHCP (IP->device). Correlating them - in a SIEM - is how you
attribute and reconstruct. Keep flow/logs long, capture selectively.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the key trade-off between keeping flow data (NetFlow/IPFIX) and keeping full packet captures?',
        options: [
          'Flow data includes packet content; captures do not',
          'Flow data is a compact summary of each conversation (addresses, ports, bytes, duration) without content, so it is cheap to retain long-term and search at scale for baselining and hunting; full captures include the actual content (ground truth) but are large and can only be kept briefly — so defenders keep flow/logs long-term and capture selectively',
          'They are identical in size and detail',
          'Captures are cheaper to store than flow data',
        ],
        answer: 1,
        explain:
          'Flow records summarise conversations without payload, making them small enough to retain for months and analyse fleet-wide — perfect for volume baselining, beaconing/exfiltration detection, and long-lookback hunting ("who talked to that IP 60 days ago?"). Full packet captures carry the actual content (essential deep evidence) but are enormous and short-lived. The practical strategy is long-term flow/logs for breadth plus selective full capture (a suspect host or alert-triggered) for depth.',
        hint: 'Which one has content but is huge, and which is a searchable summary you can keep for months?',
      },
    },

    {
      id: 'bnet-a-12',
      title: 'Project: find the attack in a capture',
      read: `Bring the level together into the packet-analyst's core exercise: given a capture (or a set of network logs), **work systematically to find and characterise the malicious activity** — reconnaissance, a MITM, or exfiltration.

## The workflow

1. **Orient** — open the capture and use *Statistics → Protocol Hierarchy* and *Conversations*: what protocols, who are the top talkers, any surprisingly large flows? This points you before you read a single packet.
2. **Check layer 2** — \`arp\` filter: any IP mapping to a new/duplicate MAC? (ARP spoofing / MITM.) Any rogue DHCP (\`dhcp\`)?
3. **Hunt reconnaissance** — bare SYNs (\`tcp.flags.syn==1 && tcp.flags.ack==0\`) fanning across ports/hosts from one source; illegal flag combos (NULL/FIN/XMAS); ICMP sweeps.
4. **Examine name resolution** — \`dns\`: long/random subdomains (tunnelling), new/suspicious domains, high query volume to one domain.
5. **Look for covert channels & exfiltration** — oversized/steady ICMP (\`icmp\`); large outbound flows to odd destinations; small regular "beats" to one host (beaconing).
6. **Read the interesting streams** — Follow TCP/HTTP Stream on the suspect flows: cleartext credentials, commands, encoded data, what was actually said.
7. **Characterise and correlate** — tie it together: who, what, when, how much; correlate with logs (DHCP for device, proxy/DNS for domains) to attribute.

## Practise on your own lab

On your lab VMs, have the "attacker" perform an activity — an nmap scan, an ARP-spoof MITM (e.g. with ettercap/bettercap), a simulated exfiltration or DNS tunnel — capture it on the victim/sensor, then **find it** using these steps. Detecting your own planted activity is exactly how the analyst instinct is built, safely.

> The level distilled into one habit: **orient with statistics, then interrogate with filters, then read the streams.** Layer 2 (ARP/DHCP) for MITM, the handshake and flag anomalies for scans, DNS/ICMP for covert channels, and volume/destination for exfiltration. Know what normal traffic looks like, drive the capture with pointed questions, and the attack — the scan, the poisoned ARP, the tunnel, the data leaving — surfaces. That is packet analysis as a defender does it, and it is the foundation for the automated detection (IDS, NSM, flow) you build next.`,
      sample: {
        lang: 'text',
        caption: 'Working a capture top-down, from statistics to the smoking gun',
        code: `1. Statistics > Conversations:
     10.0.0.9 -> 10.0.0.5   4,102 pkts   (tiny, many)  <- scan?
     10.0.0.5 -> 198.51.100.7  9.4 GB    (huge out)    <- exfil?
2. arp:  192.168.1.1 now maps to 66:66:66:de:ad:00      <- MITM!
3. tcp.flags.syn==1 && !tcp.flags.ack:  10.0.0.9 -> :1-1024  <- port scan
4. dns:  z9q3k.tunnel.evil.example x800/hr               <- DNS tunnel
5. Follow TCP Stream (the 9.4 GB flow): a .zip of /finance/*  <- data theft`,
        output: `From statistics (orient) to filters (find) to streams (confirm):
one capture yielded a MITM, a port scan, a DNS tunnel, and a
9.4 GB data theft. Orient, interrogate, read - the packet
analyst's method, and the base for automated NSM next level.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the most effective general workflow for finding an attack in a large packet capture?',
        options: [
          'Read every packet in order from first to last',
          'Orient first with statistics (protocol hierarchy, conversations, top talkers) to spot anomalies, then interrogate with targeted display filters (ARP/DHCP for MITM, SYN/flag patterns for scans, DNS/ICMP for covert channels, volume/destination for exfiltration), then follow the suspect streams to confirm — narrowing from overview to evidence',
          'Only look at encrypted traffic',
          'Randomly sample packets until something looks wrong',
        ],
        answer: 1,
        explain:
          'A large capture is far too big to read linearly. The efficient method mirrors the whole level: use Statistics to orient (what protocols, who talked most, any oddly large flows), then apply pointed display filters for each attack class (layer‑2 MITM, scans, covert channels, exfiltration), then Follow Stream on the suspects to see exactly what happened, correlating with logs to attribute. Orient → interrogate → confirm turns "somewhere in here is the attack" into found, characterised evidence — and is the manual foundation for the automated NSM/IDS tooling next.',
        hint: 'Do you read a million packets one by one, or start with an overview and drill into the anomalies?',
      },
    },
  ],
}

export default level
