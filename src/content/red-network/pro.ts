import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'Network internals, protocol attacks and research',
  summary:
    'The deep end of offensive networking: how TCP/IP actually works at the packet level (so you understand why every scan and attack behaves as it does), crafting your own packets with scapy, researching protocol-design flaws, the real limits of attacking encrypted traffic, routing/BGP attacks, building your own network tooling, and network vulnerability research. Throughout, the depth serves defence — turning "the tool worked" into a precise, fixable, packet-level explanation. Everything is practised only on your own lab or networks you are authorized to test.',
  outcomes: [
    'Explain TCP/IP internals and why scans and attacks behave as they do',
    'Craft and analyse packets directly with scapy',
    'Research protocol-design flaws and reason about new ones',
    'State precisely what can and cannot be done to encrypted traffic',
    'Understand routing/BGP attacks and their internet-scale impact',
    'Build custom network tooling and approach network vuln research',
  ],
  steps: [
    {
      id: 'rnet-p-01',
      title: 'The deep end — and the same rule',
      read: `You have reached the deepest offensive networking level. Skilled took you through multi-hop pivoting, evasion, layer-2 attacks, wireless and covert channels. **Pro is about *why* all of it works** — the packet-level internals, the protocol design, the cryptography — and about building your own tools and finding your own bugs. The rule that opened this track has not changed and never will: **everything here is for networks you own, labs you build, or engagements you are contracted, in writing, to perform.** The depth makes that more important, not less.

## What "pro" means here

- **Read the packets, don't just run the tools.** nmap, scapy, Responder and ntlmrelayx are front-ends for packet behaviour. When you understand the TCP handshake, the flags, and the states, you can reason about any scan result and craft probes no tool has a button for.
- **Understand the protocols as designs.** Every protocol attack is a consequence of a design decision (ARP's lack of authentication, TCP's stateful handshake, TLS's trust model). Reading the design is how flaws are found.
- **Know the true limits.** Especially with encryption: a pro states precisely what can and cannot be seen or broken, without over- or under-claiming.
- **Build and research.** The deepest operators craft packets, write tools, and find new bugs — the final steps look at how.

## Why the depth is defensive

The theme of this whole track culminates here. A tester who can explain *why* the SYN scan behaved as it did, *which* TCP state a firewall revealed, *why* the TLS interception failed, and *what* the fix is, hands the defender something precise and actionable. Depth turns "I got in" into "here is the exact mechanism, at the packet level, and exactly what closes it." Keep that as the purpose of everything below, and keep the boundary — owned or authorized networks — as the fixed point around which it all turns.`,
      sample: {
        lang: 'text',
        caption: 'How the levels of this track build',
        code: `beginner      : ethics, lab, layers, scanning, reading packets
amateur       : scan types, NSE, enumeration, capture, ARP/MITM
intermediate  : Responder/relay, exploitation, pivoting/tunnelling
skilled       : multi-hop pivot, evasion, L2, wireless, covert C2
pro (here)    : packet-level internals, protocol research, crypto
                limits, tooling, and vulnerability research

At every level the boundary is identical:
  own lab / written authorization. Nothing else.`,
        output: `Pro is not "more tools". It is understanding the machinery well
enough to reason from packets, defeat or explain a control because
you understand its design, and hand defenders a packet-level,
fixable finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes "pro"-level offensive networking from the levels before it?',
        options: [
          'Access to more powerful automated scanning tools',
          'Understanding the packet-level internals, protocol designs and cryptographic limits well enough to reason without a tool, craft your own probes, and hand defenders a precise packet-level finding — all still confined to owned or authorized networks',
          'Permission to test networks without written authorization once you are skilled enough',
          'Focusing only on offence and ignoring defence',
        ],
        answer: 1,
        explain:
          'Pro is depth, not more buttons. It means reading TCP/IP at the packet level so you understand why every scan and attack behaves as it does, understanding protocols as designs (so you can reason about — and find — flaws), knowing precisely what can and cannot be done to encrypted traffic, and being able to craft packets, build tools, and research bugs. That depth serves defence: it turns a compromise into a precise, packet-level, fixable mechanism. And the authorization boundary is unchanged — owned lab or written contract, always.',
        hint: 'Skill did not become permission, and pro is not a bigger toolbox — it is understanding the machinery.',
      },
    },

    {
      id: 'rnet-p-02',
      title: 'TCP internals: the handshake and states',
      read: `Every TCP scan and attack you have run is a consequence of how **TCP** establishes and tracks connections. Read it once, properly, and scan results stop being magic.

## The three-way handshake

TCP is connection-oriented: before data flows, both sides synchronise sequence numbers via three packets, controlled by **flags** in the TCP header:

1. **SYN** — client → server: "let's connect, my sequence number is X."
2. **SYN/ACK** — server → client: "OK, mine is Y, and I acknowledge X."
3. **ACK** — client → server: "I acknowledge Y." Connection established.

## Why scans behave as they do

Now every scan result is obvious:

- **SYN scan (\`-sS\`)** — send SYN. **SYN/ACK back = open** (a service would complete the handshake). **RST back = closed** (nothing listening; TCP replies with RST). **No reply = filtered** (a firewall dropped it). It sends RST instead of the final ACK, so the handshake never completes — hence "half-open," fast, and lighter.
- **Connect scan (\`-sT\`)** — completes all three, so the OS logs a real connection.
- **NULL/FIN/Xmas scans** — send unusual flag combinations. Per the RFC, a *closed* port replies RST while an *open* port stays silent, so these can distinguish states and slip past simple filters (they fail against Windows, which does not follow the RFC here — itself a fingerprinting signal).
- **ACK scan** — send a lone ACK to map *firewall rules*: an unfiltered port replies RST regardless of open/closed, so RST-vs-nothing reveals what the firewall filters.

## TCP states and RST

TCP tracks connection **state** (LISTEN, SYN-RECEIVED, ESTABLISHED, TIME-WAIT, and more). A **RST** (reset) aborts a connection immediately, which is why it signals "closed" and why injecting a forged RST can tear down someone's connection (RST injection — a design consequence). Sequence numbers, meanwhile, are what a spoofed-TCP attacker must predict to inject into a session.

## The payoff

You now read a scan not as output but as *protocol behaviour*: RST means the stack said "nothing here," silence means something ate the packet, an open port completes or stays silent depending on the flags. This is the foundation for crafting your own probes next. In the lab, capture a handshake in Wireshark and match each packet's flags to the three steps, then watch a SYN scan produce SYN/ACK, RST, and silence across different ports.`,
      sample: {
        lang: 'text',
        caption: 'The handshake, and why each scan result means what it does',
        code: `HANDSHAKE:  client --SYN-->  server
                   <--SYN/ACK-- server
            client --ACK-->  server   (ESTABLISHED)

SYN SCAN reply -> meaning:
  SYN/ACK  -> OPEN     (service would complete the handshake)
  RST      -> CLOSED   (stack says nothing is listening)
  (nothing)-> FILTERED (a firewall dropped the probe)

NULL/FIN/Xmas: closed->RST, open->silent (RFC); Windows differs
ACK scan: maps FIREWALL rules (unfiltered->RST regardless)`,
        output: `A scan is not magic output; it is TCP behaviour. RST = "nothing
here", silence = "something ate it". Understanding flags + states
lets you craft probes and interpret any result - and explain it
precisely to a defender.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a TCP SYN scan, what does receiving a RST packet in response to your SYN indicate, and why?',
        options: [
          'The port is open, because RST confirms the service',
          'The port is closed — the target’s TCP stack replies with RST when nothing is listening on that port — as opposed to a SYN/ACK (open) or no reply at all (filtered by a firewall)',
          'The port is filtered by a firewall',
          'The connection was successfully established',
        ],
        answer: 1,
        explain:
          'A SYN scan sends the first handshake packet (SYN). If a service is listening, the stack answers SYN/ACK (open) — the scanner then sends RST instead of the final ACK, leaving the handshake half-open. If nothing is listening on the port, TCP responds with a RST (reset), which the scanner reads as closed. If a firewall silently drops the probe, no reply comes back and the port is reported filtered. So RST specifically means "the target’s TCP stack says nothing is listening here" = closed. Understanding these responses as ordinary TCP behaviour — rather than tool output — is what lets you craft custom probes (NULL/FIN/Xmas, ACK scans) and interpret and explain any result at the packet level.',
        hint: 'What does a TCP stack send when a SYN arrives for a port with no listener?',
      },
    },

    {
      id: 'rnet-p-03',
      title: 'Crafting packets with scapy',
      read: `Tools like nmap send packets for you. **scapy** lets you build them yourself, packet by packet — which is how you understand scanning from the inside and probe things no tool covers. (Own lab / authorized only.)

## What scapy is

**scapy** is a Python library and interactive tool for crafting, sending, and dissecting arbitrary packets. You construct a packet layer by layer (recall encapsulation) and send it, then inspect exactly what comes back. It turns the abstract protocol knowledge from the last step into something you can *do*.

## Building a SYN scan by hand

A SYN scan is just: build IP(dst=target)/TCP(dport=port, flags="S"), send it, read the reply's flags. In scapy that is a couple of lines, and it makes the SYN-scan logic concrete: you literally set the SYN flag, send, and check whether the response has SYN/ACK (open) or RST (closed). You have re-implemented nmap's core in a few lines — and now you *understand* it.

## Why craft your own packets

- **Probes no tool has** — test a specific malformed packet, an unusual flag combination, a protocol edge case, or a device's response to something non-standard.
- **Protocol research** — send deliberately weird inputs to see how an implementation reacts (the start of fuzzing and vuln research).
- **Custom tooling** — build exactly the scanner or attack your situation needs (next steps).
- **Understanding** — nothing teaches a protocol like assembling its packets by hand and watching the response.

## The mental shift

With scapy you stop being a *user* of network tools and become someone who can *make* them. Every attack in this track is, underneath, packets on a wire; scapy is where you meet them directly. This is also the honest boundary of "script kiddie" vs engineer — the engineer can build the probe when no tool exists. In the lab, write a few-line scapy SYN scanner, run it against a target, and confirm it produces the same open/closed/filtered logic you learned in the last step — then send a deliberately odd packet and observe the response.`,
      sample: {
        lang: 'python',
        caption: 'A SYN scan, by hand, in scapy (lab target)',
        code: `from scapy.all import IP, TCP, sr1

def syn_scan(host, port):
    pkt = IP(dst=host) / TCP(dport=port, flags="S")   # craft a SYN
    resp = sr1(pkt, timeout=1, verbose=0)             # send, get 1 reply
    if resp is None:
        return "filtered"                             # nothing came back
    if resp.haslayer(TCP):
        if resp[TCP].flags == 0x12:                   # SYN/ACK
            return "open"
        if resp[TCP].flags == 0x14:                   # RST/ACK
            return "closed"
    return "unknown"

for p in (22, 80, 443, 445):
    print(p, syn_scan("10.0.0.101", p))`,
        output: `22 open
80 open
443 closed
445 open

You just re-implemented nmap's core in a few lines. Now you can
craft probes no tool provides (odd flags, malformed inputs) and
you truly understand what a scan does. Own lab / authorized only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is being able to craft packets with a tool like scapy a defining pro-level skill?',
        options: [
          'Because scapy scans faster than nmap',
          'Because it lets you build and send arbitrary packets yourself — re-implementing scan logic to truly understand it, and probing edge cases, malformed inputs, and protocol behaviours that no off-the-shelf tool covers — turning you from a tool user into someone who can build the tool',
          'Because scapy is the only tool that can scan UDP',
          'Because it hides your scans from all detection',
        ],
        answer: 1,
        explain:
          'scapy lets you construct packets layer by layer, send them, and dissect the responses. Re-implementing a SYN scan in a few lines makes the protocol logic concrete — you set the SYN flag, send, and read SYN/ACK (open) vs RST (closed) yourself — so you genuinely understand what a scanner does rather than trusting a black box. More importantly, it frees you from what tools happen to support: you can send unusual flag combinations, malformed packets, or protocol edge cases to probe a device or study an implementation’s behaviour (the beginning of fuzzing and protocol research). That ability to build the probe when no tool exists is what separates an engineer from a tool user, and it underpins custom tooling and vulnerability research. It is not about speed or hiding scans.',
        hint: 'What can you do with hand-crafted packets that a fixed tool’s options cannot?',
      },
    },

    {
      id: 'rnet-p-04',
      title: 'Researching protocol design flaws',
      read: `Every protocol attack you have learned traces back to a **design decision**. Pro-level thinking reads protocols *as designs* — which is how existing flaws are understood and new ones are found.

## Attacks are design consequences

Look back through the track with this lens:

- **ARP spoofing** — ARP has no authentication (a design choice for simplicity in a trusted era). The attack is the *inevitable consequence* of that choice.
- **DNS spoofing / cache poisoning** — DNS trusts responses and (classically) used a tiny, guessable transaction ID. The Kaminsky attack was a design-level insight about that guessability.
- **NTLM relay** — the authentication is not bound to the channel. A design gap, closed by signing/EPA (binding).
- **TCP RST/sequence injection** — TCP trusts packets with the right sequence numbers; predictability enabled injection.
- **LLMNR/mitm6** — trusting unauthenticated local answers, and an enabled-by-default protocol nobody monitors.

**The pattern:** most protocol attacks are "the protocol trusts something it should not," or "a value is predictable that should be random," or "authentication is not bound to context."

## How flaws are found

Protocol research is systematic:

- **Read the specification** critically, asking at every step: *what does this trust? what does it assume? what if that assumption is false?*
- **Compare spec to implementation** — implementations deviate from specs (recall Windows and RFC-scan behaviour); deviations are bugs.
- **Model the trust and state** — draw what each party believes and when; attacks live where beliefs can be desynchronised or forged.
- **Test edge cases** — what the spec leaves undefined, unusual orderings, malformed inputs (scapy/fuzzing).

## Why this is the pro mindset

Tools encode *known* attacks. Research finds the *next* one — and even if you never publish a novel protocol attack, thinking this way lets you reason about a protocol a tool does not cover and explain to a defender the *root* of a class of attacks ("all of these stem from ARP being unauthenticated; segment and use DAI"). That root-cause framing is worth more than any single finding. In the lab, take one protocol (say DHCP or ARP), write down everything it trusts and assumes, and derive its attacks from first principles — you will re-discover the real ones.`,
      sample: {
        lang: 'text',
        caption: 'Protocol attacks as design consequences',
        code: `ATTACK           THE DESIGN FLAW IT EXPLOITS
ARP spoofing     ARP authenticates nothing (trusts any reply)
DNS poisoning    trusts responses; guessable transaction ID
NTLM relay       auth not bound to the channel/target
TCP RST inject   trusts packets with predictable sequence nums
LLMNR / mitm6    trusts unauth local answers; on-by-default

THE RECURRING ROOTS:
  - trusts something it shouldn't
  - a value is predictable that should be random
  - authentication not bound to context`,
        output: `Read protocols AS DESIGNS: what does it trust? what does it
assume? what if that's false? Compare spec to implementation
(deviations = bugs). Root-cause framing ("all of these = ARP is
unauthenticated") is worth more than any single finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the core mindset of protocol-flaw research that lets a pro understand existing attacks and reason about new ones?',
        options: [
          'Memorising the command-line flags of every scanning tool',
          'Reading a protocol as a design — asking what it trusts, what it assumes, and what happens if those assumptions are false — and comparing the specification against implementations, since most attacks reduce to misplaced trust, predictable values, or authentication not bound to context',
          'Running automated scanners until one reports a finding',
          'Assuming every protocol is secure unless a CVE exists',
        ],
        answer: 1,
        explain:
          'Protocol attacks are consequences of design decisions: ARP spoofing exists because ARP authenticates nothing; DNS poisoning because responses are trusted and transaction IDs were guessable; NTLM relay because authentication is not bound to the channel; TCP injection because sequence numbers were predictable. The recurring roots are "trusts something it should not," "a value is predictable that should be random," and "authentication not bound to context." So the research mindset is to read the protocol as a design — interrogating every trust and assumption and asking what breaks if it is false — and to compare the specification against real implementations, whose deviations are themselves bugs. This lets you reason about protocols no tool covers and, crucially, give defenders root-cause framing ("all of these stem from ARP being unauthenticated"), which is worth more than any single finding.',
        hint: 'What questions do you ask of a protocol’s specification, and what three roots do most attacks reduce to?',
      },
    },

    {
      id: 'rnet-p-05',
      title: 'The real limits of attacking encryption',
      read: `Encryption is where over-claiming does the most damage to your credibility. A pro states **precisely** what can and cannot be done to encrypted traffic like **TLS**. Here is the honest picture.

## What TLS actually protects

TLS gives **confidentiality** (contents are encrypted), **integrity** (tampering is detected), and **authentication** (the certificate proves the server's identity, if the client validates it). Against a network attacker sitting in the middle (your ARP/MITM position), a *correctly used* TLS session is genuinely secure: you see that a connection happened and to which host (metadata), but **not the contents**.

## What you can and cannot do

- **Cannot** decrypt a properly-validated TLS session by sniffing it. The keys are negotiated so a passive or active MITM without the private key cannot read it. This is why "I MITM'd them" does not mean "I read their HTTPS."
- **Can** read it *only if* the client is tricked into trusting a certificate you control — which requires either a CA the client trusts (e.g. an enterprise-installed interception CA, or a compromised CA) or a client that does not validate certificates (bad clients, or old/misconfigured software). Sound clients show a warning and refuse.
- **Can** sometimes force a **downgrade** — pushing the client to plaintext (SSL stripping) or a weaker protocol/cipher — but modern browsers, **HSTS**, and current TLS versions defeat most of this. Old, vulnerable configurations remain attackable, which is exactly a finding.
- **Can** learn a lot from **metadata** even without decryption (next step).

## The trust anchor: certificate validation

TLS's whole security against MITM rests on the client **validating the certificate** (trusted CA, correct name, not expired). Every TLS-interception attack is really an attack on that validation. This is the same lesson as enterprise Wi-Fi: *validation is the vulnerability when it is missing.*

## Why precision matters

Say "the session is TLS 1.3 with a valid certificate; I could not and cannot read it — the confidentiality holds" when that is true, and "the client accepted my certificate without validation, so I read everything; enforce validation" when *that* is true. Never blur the two. Credibility comes from being exactly right about what encryption did and did not stop. In the lab, attempt to intercept a TLS session with a self-signed cert against a validating client (it fails, with a warning) and against a non-validating client (it succeeds) — and articulate the difference precisely.`,
      sample: {
        lang: 'text',
        caption: 'What a network MITM can and cannot do to TLS',
        code: `PROPERLY-USED TLS through your MITM:
  CANNOT decrypt by sniffing (no private key) -> content is safe
  CAN see metadata: that a connection happened, to which host

CAN read TLS content ONLY IF:
  - client trusts a cert you control (enterprise CA / compromised
    CA), OR
  - client does NOT validate certs (bad/old/misconfigured client)
  -> sound clients WARN and refuse.

CAN sometimes downgrade (SSL strip / weak cipher) BUT HSTS +
modern TLS defeat most of it. Old configs remain attackable.`,
        output: `TLS security vs MITM rests entirely on the client VALIDATING the
certificate. Be precise: "valid cert, TLS 1.3, could NOT read it"
vs "client didn't validate, so I read everything - enforce
validation." Never blur the two; credibility depends on it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You have a working network MITM and a victim connects to an HTTPS site using a modern, correctly-configured client. What is the accurate statement about the TLS content?',
        options: [
          'You can decrypt and read it because you are in the middle',
          'You cannot decrypt it by sniffing — a properly-validated TLS session stays confidential against a MITM without the private key; you would only read it if the client trusted a certificate you control or failed to validate certificates, which a sound client refuses (with a warning)',
          'TLS provides no protection against a MITM at all',
          'You can read it only if it uses TLS 1.3',
        ],
        answer: 1,
        explain:
          'Being in the middle of the traffic is not the same as being able to read TLS. A correctly-used TLS session negotiates keys such that a MITM without the server’s private key cannot decrypt the contents — you observe only metadata (that a connection occurred and to which host). You could read the content only by defeating certificate validation: getting the client to trust a certificate you control (via a CA it trusts, such as an enterprise interception CA or a compromised CA) or exploiting a client that does not validate certificates. A modern, correctly-configured client validates and will refuse your rogue certificate with a warning. (Downgrade/SSL-stripping attacks exist but are largely defeated by HSTS and modern TLS; old configs remain a finding.) Precision here is what protects your credibility — never claim you read TLS you could not.',
        hint: 'Being in the middle is not the same as holding the key — what does reading the content actually require?',
      },
    },

    {
      id: 'rnet-p-06',
      title: 'Traffic analysis without decryption',
      read: `Even when you cannot read encrypted contents, encrypted traffic **leaks information through its metadata**. Pro-level traffic analysis extracts a surprising amount without breaking any crypto — which is both an attack technique and a crucial defensive insight.

## What metadata reveals

Every connection, even fully encrypted, exposes:

- **Who talks to whom, and when** — source/destination IPs and ports, timing, duration. This is the basis of network-flow (NetFlow) analysis and of most real-world surveillance.
- **Volume and direction** — how much data flows each way, and in what bursts. A large upload to an unusual host is visible even if its contents are not.
- **Timing and patterns** — periodic connections (beaconing) betray C2 despite encryption; interactive vs bulk traffic have different shapes.
- **TLS handshake details** — the **SNI** (server name, often in the clear in the handshake) reveals the destination site; the **JA3/JA3S** fingerprint of the client/server hello can identify the *software* (a specific malware family, or a browser), all before encryption fully engages.
- **Packet sizes and cadence** — can even reveal *what* is happening: which page was visited, which video was streamed, or what a user typed, in some research settings, purely from encrypted-traffic shapes (traffic-analysis side channels).

## Why this cuts both ways

- **Offensively**, metadata analysis lets you map relationships, spot C2, identify software, and infer activity without any decryption — often enough to understand a network you cannot read.
- **Defensively**, it is *the* answer to "everything is encrypted, so we're blind." You are not blind: NDR, NetFlow analytics, JA3 fingerprinting, and beacon detection all work on metadata. This is why encrypted C2 is still catchable (the skilled lesson) and why "encrypt everything" does not make a network invisible to its own defenders.

## The pro framing

The honest statement to a client is powerful: "I could not read your TLS, but from metadata alone I identified your C2 beacon, fingerprinted the malware with JA3, and saw the exfiltration by volume and timing — and so can you, with NDR." That reframes encryption from a wall into a surface you analyse. In the lab, capture encrypted traffic and, without decrypting anything, identify destinations by SNI, fingerprint a client with JA3, and spot a periodic beacon by timing alone.`,
      sample: {
        lang: 'text',
        caption: 'What encrypted traffic still reveals (no decryption)',
        code: `EVEN FULLY ENCRYPTED, you can see:
  who <-> who, when, how long   (flow / NetFlow)
  volume + direction            (a big upload to an odd host)
  timing / periodicity          (beaconing = C2, despite crypto)
  SNI in the TLS handshake      (which site)
  JA3 / JA3S fingerprint        (which client/server SOFTWARE)
  packet sizes + cadence        (infer activity; side channels)`,
        output: `Metadata cuts both ways. Offence: map relationships, spot C2,
fingerprint software, infer activity WITHOUT decryption. Defence:
"everything's encrypted" != blind - NDR/NetFlow/JA3/beacon
detection all work on metadata. Encryption is a surface, not a wall.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A client says "all our traffic is encrypted, so network monitoring is pointless." Why is that wrong?',
        options: [
          'Because encryption can always be broken with enough computing power',
          'Because encrypted traffic still leaks metadata — who talks to whom and when, volume and direction, timing/periodicity (beaconing), the TLS SNI, and JA3 software fingerprints — so NDR, NetFlow analytics and beacon detection can still identify C2, exfiltration and malicious software without decrypting anything',
          'Because encryption only protects the first packet of a connection',
          'Because monitoring tools decrypt all TLS automatically',
        ],
        answer: 1,
        explain:
          'Encryption protects the *contents* of traffic, not its existence or shape. Every connection still reveals metadata: the endpoints and timing (flow/NetFlow data), the volume and direction of data, periodicity that betrays C2 beaconing, the SNI in the TLS handshake (often naming the destination site), and JA3/JA3S fingerprints that identify the client/server software — all without decrypting anything. So a fully-encrypted network is not invisible to its own defenders: network detection and response, NetFlow analytics, JA3 fingerprinting, and beacon detection all operate on metadata, which is exactly how encrypted C2 and exfiltration are caught. That is why "everything is encrypted, so monitoring is pointless" is wrong — encryption is a surface to analyse, not a wall that blinds defence. Monitoring tools do not magically decrypt TLS; they do not need to.',
        hint: 'Encryption hides contents — but does it hide who, when, how much, and the handshake fingerprints?',
      },
    },

    {
      id: 'rnet-p-07',
      title: 'Routing and BGP attacks',
      read: `Zoom out to the largest scale. The internet's traffic is steered by **routing protocols**, and the protocol that glues the whole internet together — **BGP** — was, like ARP, designed for a trusting era. Understanding routing attacks explains internet-scale incidents (studied here, never performed outside a lab you fully control).

## How routing works, briefly

Routers decide where to send packets based on **routing tables**. Inside an organisation, protocols like **OSPF** and **EIGRP** share routes; between organisations and ISPs, **BGP** (Border Gateway Protocol) announces which networks (prefixes) each **autonomous system** can reach. Routers believe these announcements and forward accordingly.

## The design flaw: routing trusts announcements

Classic BGP has **no built-in authentication** of route announcements. An autonomous system can announce a prefix it does not own, and other routers may believe it. The consequences:

- **BGP hijacking** — announce someone else's prefix (often more specifically, since routers prefer more-specific routes) and the internet starts sending *their* traffic to *you*. This has caused real, large-scale outages and interceptions (some accidental misconfigurations, some malicious).
- **Route leaks** — improperly propagating routes, redirecting or black-holing traffic.
- **Interior routing attacks** — on a network you are inside, spoofing OSPF/EIGRP to become a transit point (a routing-level MITM for whole subnets), which ties back to infrastructure attacks.

## Why it matters even if you never touch BGP

Most testers never attack BGP (it requires positions like an ISP or a compromised router, and doing so on the real internet is a serious crime). But understanding it explains a whole class of real incidents, informs why **RPKI** (cryptographic route origin validation), route filtering, and monitoring exist, and connects to the interior routing attacks you *can* test in a lab. The recurring root is familiar: **a protocol trusts announcements it cannot verify.**

## The defensive mirror

- **RPKI / route origin validation** — cryptographically verify who may announce a prefix (the authentication BGP lacked).
- **Route filtering and max-prefix limits** — don't accept implausible announcements from peers.
- **Monitoring** — services that alert on unexpected announcements of your prefixes.
- **Interior**: authenticate routing protocols (OSPF/EIGRP auth), and treat routers as crown jewels.

In the lab, set up interior routing between virtual routers and demonstrate how an unauthenticated OSPF injection reroutes traffic — then enable routing authentication and watch it fail.`,
      sample: {
        lang: 'text',
        caption: 'BGP hijacking: the internet trusts route announcements',
        code: `NORMAL: AS100 announces "I can reach 203.0.113.0/24" (it owns it)
        the internet routes that prefix to AS100.

HIJACK: AS666 announces "I can reach 203.0.113.0/25" (MORE
        specific, and NOT its prefix). Routers prefer the more
        specific route -> traffic for that range flows to AS666.

ROOT FLAW: classic BGP does not authenticate WHO may announce a
prefix (same family as ARP/DNS: trusts unverifiable claims).`,
        output: `Routing trusts announcements it cannot verify -> BGP hijacks/
leaks (real internet-scale incidents). Mirror: RPKI (route origin
validation = the missing authentication), route filtering, max-
prefix, monitoring; interior: authenticate OSPF/EIGRP. Real BGP
attacks are ISP-position + serious crime; study, lab-only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What design property of classic BGP makes BGP hijacking possible, and what defensive mechanism addresses it?',
        options: [
          'BGP encrypts routes with a weak cipher; the fix is stronger encryption',
          'Classic BGP does not authenticate which autonomous system may announce a given prefix, so an AS can announce a prefix it does not own (often more specifically) and attract that traffic — and RPKI / route origin validation adds cryptographic verification of who may announce a prefix',
          'BGP only works over IPv4; migrating to IPv6 fixes it',
          'BGP requires a password that operators leave at default',
        ],
        answer: 1,
        explain:
          'BGP announces which networks (prefixes) each autonomous system can reach, and routers forward based on those announcements — but classic BGP has no built-in authentication of who is entitled to announce a prefix. So an AS can announce a prefix it does not own, frequently as a more-specific route (which routers prefer), and the internet starts sending that traffic to it — a BGP hijack, responsible for real large-scale outages and interceptions, whether malicious or accidental. This is the same recurring root as ARP and DNS: a protocol trusting claims it cannot verify. The defence is RPKI (Resource Public Key Infrastructure) / route origin validation, which cryptographically verifies which AS may originate a prefix — the authentication BGP lacked — complemented by route filtering, max-prefix limits, and monitoring. BGP is not encryption-based, and IPv6 does not address the trust flaw.',
        hint: 'Which recurring root — the same as ARP and DNS — applies, and what cryptographic mechanism supplies the missing verification?',
      },
    },

    {
      id: 'rnet-p-08',
      title: 'Building network tooling',
      read: `Pros do not stop at existing tools. When a target needs a capability no tool provides — a specific protocol probe, a custom scanner, a bespoke fuzzer — you build it. Understanding *how* offensive network tooling is built also tells defenders exactly what to detect. (Build and run only against your own lab / authorized scope.)

## Why build your own

- **Fit** — a specific protocol, an odd service, or a precise probe that off-the-shelf tools do not support. You saw this with scapy: a few lines gives you exactly the scanner you need.
- **Signatures** — well-known tools (nmap, common C2) are fingerprinted (recall JA3, IDS signatures). Custom code has no signature until someone writes one, which for authorized red-team work tests signature-based detection honestly.
- **Scale and automation** — chaining enumeration, parsing, and action into one pipeline tailored to the engagement.
- **Understanding** — writing a tool forces you to understand the protocol completely.

## The building blocks

- **Python + scapy / raw sockets** — for packet-level tools (scanners, custom probes, protocol clients). Fast to write, ideal for research and one-off tools.
- **Go / Rust** — for performance and portable, single-binary tooling (many modern pivoting and scanning tools are written in Go for exactly this).
- **Libraries over reinvention** — impacket (Windows protocols), existing parsers — build on solid protocol implementations rather than re-deriving them.
- **Careful protocol handling** — a custom tool must speak the protocol correctly enough not to crash fragile targets; test in a lab first.

## The defensive mirror is the reason

Every tooling choice is a detection lesson. A custom scanner still produces the *behaviour* of scanning (many connections, characteristic patterns) — so defenders should alert on the behaviour, not a tool's name. A custom protocol client still generates traffic with a fingerprint — so JA3 and anomaly detection matter. Understanding how tools are built *is* the guidance for detecting them behaviourally. In the lab, extend your scapy scanner into a small tool that enumerates a specific service the standard tools handle poorly, then describe the behavioural signal it still emits.`,
      sample: {
        lang: 'text',
        caption: 'Custom network tooling and its detection mirror',
        code: `WHY BUILD                       DETECTION MIRROR (defender hunts)
fit: a probe no tool has        the BEHAVIOUR (scanning pattern),
                                not the tool name
no signature yet (custom code)  behavioural + anomaly detection
scale/automation pipeline       volume/timing anomalies
custom protocol client          traffic fingerprint (JA3), oddities

LANGUAGES:
  Python + scapy/raw sockets -> packet tools, research, one-offs
  Go / Rust                  -> fast, portable single-binary tools
  build on libs (impacket)   -> correct protocols, don't reinvent`,
        output: `Understanding how a tool is built IS the detection guidance:
custom code has no signature, but the BEHAVIOUR (scan patterns,
traffic fingerprints, anomalies) remains. Build only for your own
lab / authorized scope; ship defenders the behavioural hunt.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A tester builds a custom scanner in Go instead of using nmap. What is a key offensive reason, and its defensive mirror?',
        options: [
          'Custom tools are always faster; there is no defensive lesson',
          'Well-known tools are fingerprinted (JA3, IDS signatures) while custom code has no signature yet — which is exactly why defenders must detect the behaviour of scanning (connection patterns, anomalies), not the specific tool',
          'Go programs cannot be detected by any means',
          'Custom tools are legal while nmap is not',
        ],
        answer: 1,
        explain:
          'Off-the-shelf tools like nmap have recognisable signatures — IDS rules, traffic fingerprints (JA3), known patterns — so a custom re-implementation evades signature-based detection until someone writes a new signature, which for authorized red-team work honestly tests whether the client relies on brittle signatures. (Custom tools also fit specific protocols and automate to scale.) The defensive mirror follows directly: because the tool itself can be changed, defenders must detect the underlying *behaviour* — the many connections and characteristic patterns of scanning, volume/timing anomalies, and traffic fingerprints — rather than a particular binary. Understanding how tools are built is therefore the very guidance for detecting them behaviourally. Build and run only within your own lab or authorized scope.',
        hint: 'What does an IDS "know" about nmap that it does not know about fresh custom code — and what must defenders watch instead?',
      },
    },

    {
      id: 'rnet-p-09',
      title: 'Wireless and RF at depth',
      read: `Intermediate and skilled covered Wi-Fi attacks. Pro-level wireless is about understanding the **radio layer itself** — because Wi-Fi is only one slice of a vast RF attack surface, and depth here means reasoning about signals, not just running aircrack. (Own equipment / licensed spectrum / authorized only — RF is heavily regulated.)

## Beyond Wi-Fi: the RF spectrum

Networks and devices communicate over many radio protocols beyond 802.11: **Bluetooth / BLE**, **Zigbee** and **Z-Wave** (IoT/home automation), **LoRa** (long-range IoT), cellular, and countless proprietary protocols in embedded and industrial devices. Each is a network with its own (often weak) security, and many were designed with even less security thought than Wi-Fi.

## Software-defined radio (SDR)

An **SDR** (e.g. HackRF, RTL-SDR) is a radio whose behaviour is defined in software, letting you receive (and, with capable hardware, transmit) across a wide frequency range. It is the scapy of the radio world: instead of being limited to what a Wi-Fi card does, you can observe and craft signals for *arbitrary* protocols. With an SDR you can capture unknown transmissions, reverse-engineer a proprietary protocol from its waveform, and analyse the security of devices no standard tool touches.

## Why depth matters here

- **IoT and embedded** devices frequently use these RF protocols with little or no encryption/authentication — the same design roots as ARP, now on the air. Analysing them is real, current security work.
- **Reverse-engineering RF** — capturing a signal, identifying the modulation, decoding the protocol, and finding its flaws — is a research discipline that mirrors protocol research at the packet level.
- **Physical + RF** — RF extends the physical attack surface: a device's security can fail over the air from outside the building.

## The heavy caveat

RF is **regulated by law** (spectrum licensing, transmission rules). *Receiving* is generally more permissible than *transmitting*; transmitting on licensed bands, or jamming, can be a serious offence. So RF research is done carefully, on your own devices, in ways that respect spectrum law and authorization. The defensive mirror: treat RF as a real attack surface — inventory wireless/IoT devices, prefer protocols with strong crypto, and monitor for rogue transmitters. In a lab, use an RTL-SDR to *receive* and identify signals from devices you own, and reason about their security design.`,
      sample: {
        lang: 'text',
        caption: 'The RF attack surface beyond Wi-Fi',
        code: `RF PROTOCOLS (each a network with its own, often weak, security):
  Bluetooth/BLE, Zigbee, Z-Wave, LoRa, cellular, proprietary IoT

SDR (HackRF / RTL-SDR) = "scapy for radio":
  receive (and, with capable HW, transmit) across wide frequencies
  -> capture unknown signals, reverse-engineer proprietary
     protocols from the waveform, analyse devices no tool touches

CAVEAT: RF is REGULATED. Receiving > transmitting in permissibility;
transmitting on licensed bands / jamming can be a crime.`,
        output: `IoT/embedded RF often has the SAME design flaws as ARP (no auth/
crypto), now on the air. Depth = reason about signals, reverse-
engineer protocols. Respect spectrum law; own devices only.
Mirror: inventory wireless/IoT, strong crypto, rogue-TX monitoring.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a software-defined radio (SDR) described as "the scapy of the radio world," and what legal caveat governs its use?',
        options: [
          'Because it only works with Wi-Fi, and there are no legal limits',
          'Because, like scapy for packets, it lets you observe and craft arbitrary radio signals across many protocols (BLE, Zigbee, LoRa, proprietary IoT) rather than being limited to one card’s behaviour — but RF is legally regulated, so receiving is generally more permissible than transmitting, and transmitting on licensed bands or jamming can be a serious offence',
          'Because it decrypts all wireless traffic automatically',
          'Because it replaces the need for any authorization',
        ],
        answer: 1,
        explain:
          'A software-defined radio (HackRF, RTL-SDR) defines its radio behaviour in software, so it can receive — and with capable hardware transmit — across a wide range of frequencies and protocols, letting you capture unknown transmissions, reverse-engineer proprietary protocols from their waveforms, and analyse devices no standard tool covers. That arbitrary, low-level access to signals is exactly analogous to what scapy gives you for packets, which is why it unlocks the broad RF attack surface (Bluetooth/BLE, Zigbee, Z-Wave, LoRa, cellular, embedded IoT — often with weak or no crypto). The crucial caveat is legal: radio spectrum is regulated, receiving is generally more permissible than transmitting, and transmitting on licensed bands or jamming can be a serious crime — so RF work is done on your own devices, respecting spectrum law and authorization. An SDR does not magically decrypt traffic or remove the need for authorization.',
        hint: 'What does scapy do for packets that an SDR does for radio signals — and why does transmitting raise legal issues that receiving mostly does not?',
      },
    },

    {
      id: 'rnet-p-10',
      title: 'Network vulnerability research',
      read: `The deepest offensive skill is finding your own bugs. **Network vulnerability research** is how the CVEs you have exploited in services, appliances and protocols were discovered. You will not master it in one step, but you should understand the disciplines — practised on your own systems and software you are permitted to test.

## Where network bugs live

- **Network service implementations** — the code that parses protocol messages (an SMB server, a DNS resolver, a VPN appliance's handler). Parsing attacker-controlled input is where memory-safety bugs (overflows, use-after-free) and logic bugs live. Many wormable, critical CVEs (EternalBlue, various VPN CVEs) are exactly this.
- **Protocol design** — the logic flaws from the research step: a protocol that trusts or assumes wrongly.
- **Network devices / firmware** — routers, switches, IoT: often C code, rarely hardened, frequently vulnerable.

## The disciplines

- **Fuzzing** — throw malformed protocol messages at a service and watch for crashes indicating memory-safety bugs. Network fuzzing (with tools built on the protocol, or a scapy-based harness) is a primary way service bugs are found. Triage crashes for exploitability.
- **Reverse engineering** — read a service binary or firmware (Ghidra, IDA) to understand its parsing and find where input reaches sensitive operations. Essential for closed-source appliances.
- **Protocol analysis** — the critical spec-reading from earlier: find where the design or an implementation's deviation creates a flaw.
- **Patch diffing** — compare an appliance's firmware before and after a security update to locate the fix and infer the bug (why appliance exploits often follow advisories).

## From crash to impact

A crash is a lead; turning it into remote code execution is exploit development (bypassing DEP/ASLR and modern mitigations), a craft of its own. You need not be an exploit developer to be a great tester, but knowing the *classes* lets you reason about what a network bug could become.

## Disclosure — the ethical endpoint

Research ends in **responsible disclosure**: report privately to the vendor, allow time to fix, coordinate public disclosure — never weaponise against systems you do not own. The authorization principle scales all the way up: **you find network bugs to get them fixed.** That is offensive networking at its deepest, and its whole purpose. In the lab, point a simple fuzzer (even a scapy loop of malformed messages) at a service you can crash safely, and reason about whether a crash is exploitable and how you would disclose it.`,
      sample: {
        lang: 'text',
        caption: 'Network vuln research: disciplines and endpoint',
        code: `WHERE BUGS LIVE
  service parsers (SMB/DNS/VPN)  -> overflow, UAF, logic (wormable!)
  protocol design               -> trust/assumption flaws
  device firmware               -> C code, rarely hardened

DISCIPLINES
  fuzzing        malformed messages -> crashes -> triage
  reverse eng.   read binary/firmware -> input paths to sensitive ops
  protocol study spec + deviations -> logic flaws
  patch diffing  pre/post firmware -> locate fix -> infer bug

Crash -> RCE = exploit dev (bypass DEP/ASLR/mitigations).`,
        output: `Research is how the CVEs you exploited were found. Ethical
endpoint = RESPONSIBLE DISCLOSURE: report privately, coordinate
a fix, never weaponise against systems you don't own. You find
network bugs to get them fixed. Own systems / permitted only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In network vulnerability research, why is fuzzing a service’s protocol parser such a productive technique, and how does the process end ethically?',
        options: [
          'Fuzzing guesses passwords; it ends by using them',
          'Feeding malformed protocol messages to the code that parses attacker-controlled input frequently triggers crashes revealing memory-safety bugs (the class behind many wormable CVEs) to triage for exploitability — and it ends in responsible disclosure: reporting privately, allowing a fix, and never weaponising against systems you do not own',
          'Fuzzing only finds bugs in open-source software and requires no disclosure',
          'Fuzzing decrypts traffic to read the service’s memory',
        ],
        answer: 1,
        explain:
          'A network service must parse messages that attackers control, and parsing untrusted input is exactly where memory-safety bugs (buffer overflows, use-after-free) and logic flaws hide — the class behind many critical, wormable CVEs like EternalBlue and various VPN appliance bugs. Fuzzing sends large volumes of malformed protocol messages and watches for crashes that flag such bugs, which the researcher then triages for exploitability (turning a crash into code execution is separate exploit-development craft). It works on closed-source targets too (paired with reverse engineering and patch diffing). Ethically, research ends in responsible disclosure: report the bug privately to the vendor, give time to fix, coordinate public disclosure, and never weaponise it against systems you do not own — the authorization principle scaled all the way up. You find bugs to get them fixed.',
        hint: 'What does a service parser handle that makes it bug-prone, and what is the ethical endpoint of finding a bug?',
      },
    },

    {
      id: 'rnet-p-11',
      title: 'The complete picture: offence for defence',
      read: `Step back and see the whole. Across five levels you learned to discover, scan, enumerate, capture, intercept, relay, exploit, pivot, evade, attack layer 2, wireless, and infrastructure, and to read the protocols at the packet level. **Every bit of it exists to make networks stronger.** Pro is where that stops being a slogan and becomes how you work.

## What the depth gives the defender

- Because you understand **TCP and scanning at the packet level**, your finding is not "the port was open" but "this filtered/closed behaviour reveals the firewall rules; here is the exact exposure and the rule to change."
- Because you understand **protocol design**, your finding is not "ARP spoofing works" but "these five attacks all stem from unauthenticated local protocols; segment, enable DAI/DHCP snooping, disable LLMNR — and here is the root cause."
- Because you understand **encryption's real limits**, your finding is precise: "TLS held; I could not read it — but metadata revealed the C2 beacon; deploy NDR."
- Because you understand **routing and infrastructure**, your finding is "the management plane and east-west routing are the crown jewels; here is how to protect them."

## The mindset

A pro network tester is the **best possible teacher for the network's defenders**. You prove what is exploitable, exactly how — down to the packet — and exactly what closes it: at the host, at the switch, at the perimeter, and in the architecture. You do it inside authorization, handle sensitive data carefully, log honestly, and write a report a defender can implement.

## Where to keep going

Networking never stands still: new protocols, IPv6 everywhere, cloud networking (VPCs, SDN, service meshes), zero-trust architectures, encrypted-everything, and new research. Stay in your lab, disclose responsibly, and keep the boundary you started with — owned networks and written authorization — as the fixed point around which all of this turns. That boundary is not a limit on the skill; it is what makes the skill a profession. The final step is your research-grade capstone.`,
      sample: {
        lang: 'text',
        caption: 'From packet-level technique to architectural fix',
        code: `UNDERSTANDING            FINDING THE DEFENDER CAN ACT ON
TCP/scan internals       exact exposure + the firewall rule to change
protocol design          root cause of a whole attack class + the
                         structural fix (segment, DAI, disable LLMNR)
encryption limits        precise: "TLS held; metadata caught the C2;
                         deploy NDR"
routing/infrastructure   protect the management plane + east-west;
                         RPKI, out-of-band mgmt, monitor

Offence proves it. The stronger network is the deliverable.`,
        output: `A pro network tester is the defender's best teacher: proves what
is exploitable, exactly how (to the packet), and exactly what
closes it - host, switch, perimeter, architecture. Inside
authorization, honest logs, an actionable report.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the defining characteristic of a *professional* pro-level network engagement, as opposed to simply achieving compromise?',
        options: [
          'Compromising the maximum number of hosts as quickly as possible',
          'Translating each proven technique into a precise, packet-level or root-cause finding a defender can implement — at the host, switch, perimeter and architecture — done inside authorization, with careful data handling, honest logging, and a report that measurably strengthens the network',
          'Keeping the methods secret so the client cannot replicate the test',
          'Demonstrating the most sophisticated possible attack regardless of scope',
        ],
        answer: 1,
        explain:
          'Achieving compromise is the easy part; the professional value is the translation into something the defender can act on. Because a pro understands TCP and scanning at the packet level, protocol design, encryption’s real limits, and routing/infrastructure, each proven technique becomes a precise, mechanism-level or root-cause finding with a concrete fix — at the host, the switch, the perimeter, and in the architecture (segment, enable DAI/DHCP snooping, disable LLMNR, require signing, deploy NDR, RPKI, out-of-band management). It is delivered inside authorization, with careful handling of sensitive data, honest and complete logging, and a report the client can implement to end up measurably stronger. Offence is the means; the stronger network is the end — the theme this whole track was built to teach.',
        hint: 'Compromise is the start — what makes the work worth paying for is what you hand back, and at what level of precision.',
      },
    },

    {
      id: 'rnet-p-12',
      title: 'Project: research-grade network assessment',
      read: `Your pro capstone is a **research-grade assessment** of your own lab network: not just compromising it, but explaining every step at the packet/protocol level and delivering a defender-grade, architecture-level report. This synthesises the entire track. Do it only on a lab you built and fully control.

## The brief

Treat your multi-tier lab as a full-scope engagement with a mandate to go deep. Reach the objective *and fully explain the machinery*, then write the fix — at every layer from packet to architecture.

## What to produce (a written report; commands optional)

1. **Scope and authorization** — one paragraph: your own lab, the boundary, the assumed starting position.
2. **The path, at packet depth** — the route you took (e.g. NAC bypass → capture/relay → pivot → objective). For **each** step, explain the *packet-level* mechanism: which flags, which protocol behaviour, which trust was abused — not just the tool.
3. **A protocol analysis** — pick one attack (ARP, TLS interception, a relay, a scan behaviour) and explain from first principles *why* it works: the design decision, the trust, the missing binding or authentication.
4. **Encryption honesty** — state exactly what you could and could not read, and what metadata still revealed.
5. **Detection map** — for each step, the signal a defender would see (which log, which flow, which fingerprint) and the blind spots.
6. **Architectural remediation** — prioritised fixes from host to architecture (segmentation, zero-trust, egress control, monitoring, hardened foundations, RPKI/routing where relevant), each mapped to the attack it stops.
7. **Residual-risk honesty** — where a control is present but bounded, say so.

## The standard

If a defender who has never met you could read your report and (a) understand *why* each attack worked at the packet/protocol level, (b) reproduce your detections, and (c) implement your fixes in priority order — you have hit the pro standard. That is the whole point of everything you have learned: **to make the network you attacked stronger than you found it.** Keep it in your lab, keep it authorized, and keep going — the field will keep giving you more to understand, and the boundary you started with will keep it a profession.`,
      sample: {
        lang: 'text',
        caption: 'The research-grade network report skeleton',
        code: `1 Scope & authorization  own lab, boundary, start position
2 Path at packet depth   each step -> flags/protocol/trust abused
3 Protocol analysis      one attack, from first principles: WHY
4 Encryption honesty     what you could/couldn't read + metadata
5 Detection map          per step -> log/flow/fingerprint; blind spots
6 Architectural fixes    host->architecture, mapped to each attack
7 Residual-risk honesty  where a control is present but bounded

Standard: a stranger on the blue team understands WHY (to the
packet), reproduces detections, implements fixes in order.`,
        output: `Passing bar: the report explains the mechanism at packet/protocol
depth, maps the detection, and prioritises architectural fixes
well enough that the network ends up stronger than you found it.
Lab-only, authorized, done. Keep learning; keep the boundary.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the pro capstone, the research-grade network assessment?',
        options: [
          'Reaching the objective as fast as possible with any method',
          'That a defender who has never met you could read the report and understand why each attack worked at the packet/protocol level, reproduce your detections, and implement your prioritised architectural fixes — leaving the network stronger than you found it, all within your lab',
          'Using the largest possible number of tools and attacks',
          'Keeping the exploitation steps out of the report for security',
        ],
        answer: 1,
        explain:
          'The pro capstone is about depth and deliverability, not speed or tool count. The bar is that an unfamiliar blue-team reader can, from your report alone, understand the packet/protocol-level mechanism of each attack (which flags, which protocol behaviour, which trust was abused), reproduce the detections you mapped (which log, flow, or fingerprint, plus the blind spots), and apply your prioritised remediations from host to architecture (segmentation, zero-trust, egress control, monitoring, hardened foundations, routing security) — each mapped to the attack it stops, with honest notes on encryption limits and residual risk. Achieving that means offence has served its true purpose: the network ends up stronger than you found it. Done only on a lab you built and fully control, within the authorization boundary that has governed the entire track.',
        hint: 'Speed and tool count are not it — think about what a stranger on the blue team can do with your report, and at what depth.',
      },
    },
  ],
}

export default level
