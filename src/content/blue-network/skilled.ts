import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Network architecture and advanced defence',
  summary:
    'Engineer the network so defence is structural: defence-in-depth zoning and zero-trust micro-segmentation, encrypted-traffic analysis, protective DNS, network deception, forensics at scale, detection-as-code, cloud and wireless network security, and DDoS defence — plus hunting across the whole environment.',
  outcomes: [
    'Design defence-in-depth and zero-trust network architecture',
    'Do encrypted-traffic analysis and protective DNS at scale',
    'Deploy network deception and analyse pcap forensically at scale',
    'Engineer network detections as code (Suricata/Zeek/Sigma)',
    'Secure cloud and wireless networks and defend against DDoS',
    'Hunt for threats across network telemetry',
  ],
  steps: [
    {
      id: 'bnet-s-01',
      title: 'Architecting defence in depth',
      read: `A skilled defender doesn't just monitor the network — they **design** it so that security is structural. Good architecture makes attacks harder, contains them when they succeed, and forces them through places you watch. The organising idea is **defence in depth**: multiple independent layers, so no single failure is fatal.

## Zones by trust and function

Divide the network into zones and control the traffic between them (the segmentation lesson, made architectural):

- **Internet / untrusted** — everything outside.
- **DMZ (perimeter)** — internet-facing services (web, mail, VPN) live here, isolated so a compromised public server **cannot directly reach the internal network**. Traffic from the internet reaches the DMZ; only specific, controlled flows go DMZ→internal.
- **Internal zones** — user, server, and sensitive/restricted zones, each separated with default-deny inter-zone policy.
- **Management zone** — device administration (switches, firewalls, hypervisors, out-of-band), tightly isolated and reachable only from admin hosts.
- **Tier-0 / crown jewels** — the most sensitive assets (domain controllers, secrets, critical data), in the most restricted zone.

## Choke points = control + visibility

Every zone boundary is a **choke point**: a firewall (control — enforce least-privilege flows) *and* a sensor location (visibility — monitor inter-zone traffic). Designing the network so important traffic must pass predictable choke points is what makes both enforcement and monitoring possible. Flat networks have no choke points, so nothing is contained or observed.

## Layering controls

Defence in depth means an attacker must defeat *several* independent controls in sequence: perimeter firewall → IPS → segmentation → host firewall → EDR → least privilege → monitoring at each layer. No layer is assumed perfect; each covers the others' gaps. A single misconfiguration or bypass doesn't hand over everything.

## Design for assume-breach

Architect as if any one component *will* be compromised, and ask "what does that give the attacker, and what stops the next step?" A compromised DMZ web server should be boxed in the DMZ. A compromised workstation should be confined by segmentation and unable to reach management or tier-0. This containment-by-design is what turns an incident from catastrophic to survivable.

## The skilled shift

Junior defenders monitor and respond to whatever the network is. Skilled defenders **shape the network** so that attacks are contained by design, forced through monitored choke points, and required to defeat many layers. Architecture is the highest-leverage defence because it changes the terrain the attacker fights on — and it is the foundation the zero-trust and micro-segmentation of the next step push further.`,
      sample: {
        lang: 'text',
        caption: 'Zoned architecture: a compromised web server is boxed in',
        code: `Internet
   |  (perimeter FW + IPS = choke point 1)
 [ DMZ ] web, mail, VPN  <- internet-facing, ISOLATED
   |  (internal FW: only specific DMZ->internal flows) = choke point 2
 [ Internal: user zone | server zone ]   (segmented, default-deny between)
   |  (restricted FW) = choke point 3
 [ Tier-0: domain controllers, secrets ]  <- most restricted
 [ Management zone ]  <- admin only, isolated

Compromise the DMZ web server -> boxed in the DMZ; reaching
internal requires crossing a monitored, filtered choke point.`,
        output: `Zones by trust/function + default-deny between them + a
firewall AND sensor at each boundary. Attacks are contained by
design and forced through choke points you control and watch.
Architecture changes the terrain - the highest-leverage defence.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are internet-facing services placed in a DMZ that is isolated from the internal network?',
        options: [
          'To make them run faster',
          'So that if an internet-facing service is compromised, the attacker is contained in the DMZ and cannot directly reach the internal network — any path inward must cross a controlled, monitored choke point rather than being open',
          'Because DMZ servers cannot be attacked',
          'To avoid using a firewall',
        ],
        answer: 1,
        explain:
          'Internet-facing services are the most exposed and most likely to be compromised, so they are placed in an isolated DMZ. If one falls, the attacker is boxed there: reaching the internal network requires crossing an internal firewall that permits only specific, controlled flows and where you monitor. This containment-by-design (a defence-in-depth choke point) turns a compromised public server from a direct pivot into the internal network into a contained incident — the essence of architecting for assume-breach.',
        hint: 'If the public web server is the most likely thing to fall, where do you want it to be able to reach?',
      },
    },

    {
      id: 'bnet-s-02',
      title: 'Zero trust and micro-segmentation',
      read: `Traditional architecture trusts the internal network: once inside the perimeter, traffic flows freely (the flat-interior problem). **Zero trust** discards that — *never trust, always verify* — and **micro-segmentation** implements it at the network layer, shrinking segments down to individual workloads.

## The zero-trust network principles

- **No implicit trust from location** — being "on the internal network" grants nothing. Every connection is authenticated and authorised, whether it comes from outside or from the next rack.
- **Least-privilege access** — each workload/user may reach only the specific services it needs, nothing more.
- **Verify explicitly and continuously** — identity (of the user *and* the workload/device), not just IP, drives access; re-evaluated, not granted once.
- **Assume breach** — design so a compromise reaches only what that identity is explicitly allowed.

## Micro-segmentation

Where VLAN segmentation creates a few zones, micro-segmentation enforces policy **per workload** — often down to "this app server may talk to that database on 5432, and nothing else, in either direction." Implemented via:

- **Identity/label-based policy** — rules attached to workload identity/tags, not IP addresses (so they follow the workload and survive re-addressing). Cloud security groups, Kubernetes network policies, and host-agent micro-segmentation (e.g. Illumio-style) work this way.
- **East-west enforcement everywhere** — every workload has its own policy, so lateral movement dies at the first hop: a compromised web server can reach *only* its database on the one allowed port, not the rest of the environment.

## Software-Defined Perimeter and NAC

- **SDP / ZTNA** — services are hidden until an identity authenticates; users get access to *specific applications*, not the network. This replaces the "VPN drops you onto the flat internal LAN" model, which gives a compromised VPN client the run of the place.
- **NAC (Network Access Control) / 802.1X** — authenticate *devices* before they get on the network at all, and place them in the right segment based on identity/posture. Controls who is even allowed to connect.

## Why it's the modern direction

The perimeter has dissolved (cloud, remote work, mobile), and flat interiors make one foothold catastrophic. Zero trust plus micro-segmentation means a compromise is confined to exactly what that one identity could reach — often a single workload's single allowed flow — and every attempt beyond that is denied and logged. It is least privilege and assume-breach made architectural and enforced per workload, directly attacking the lateral movement that turns small compromises into big ones. It's harder to deploy than coarse VLANs (you need identity, policy, and visibility into every flow), which is why it's a skilled-level design goal, built on the segmentation and monitoring foundations you already have.`,
      sample: {
        lang: 'text',
        caption: 'Coarse segmentation vs. micro-segmentation, per workload',
        code: `VLAN segmentation (coarse):
  web servers  <-->  DB servers   (whole server VLAN can reach DB VLAN)
  compromise one web server -> reach EVERY DB in the DB zone

Micro-segmentation (identity/label-based, per workload):
  policy: web-app-A  ->  db-A : 5432   (ALLOW)  everything else DENY
  compromise web-app-A -> can reach ONLY db-A on 5432
     -> cannot touch db-B, other web servers, or anything else
  lateral movement dies at the first hop; every deviation is logged`,
        output: `Zero trust = no implicit trust by location; verify every flow by
identity; least privilege per workload. Micro-segmentation
enforces it, so a compromise reaches only that identity's one
allowed flow. Lateral movement, contained at the workload.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does micro-segmentation (zero trust at the network layer) limit an attacker compared with traditional VLAN segmentation?',
        options: [
          'It prevents workloads from ever being compromised',
          'It enforces least-privilege policy per individual workload (often by identity/label, not IP), so a compromised workload can reach only the specific services its policy allows — rather than the whole zone it sits in — confining lateral movement to a single allowed flow and logging everything else',
          'It removes the need for authentication',
          'It only works for internet-facing servers',
        ],
        answer: 1,
        explain:
          'Coarse VLAN segmentation still trusts everything within a zone, so compromising one server in the server VLAN can reach every other server there. Micro-segmentation applies least-privilege policy at the individual workload level — commonly bound to workload identity/labels rather than IP — so a compromised web app can reach only its one permitted database on its one port, and any other attempt is denied and logged. It confines lateral movement to a single allowed flow, the zero-trust principle (no implicit trust by location) enforced per workload.',
        hint: 'After compromising one server, can the attacker reach the whole zone, or just that workload’s one allowed flow?',
      },
    },

    {
      id: 'bnet-s-03',
      title: 'Encrypted-traffic analysis at scale',
      read: `The intermediate level introduced reading encrypted traffic via metadata; the skilled defender operationalises **encrypted-traffic analysis (ETA)** across the whole environment, because with most traffic now TLS, this is where a large fraction of detection has to happen.

## The visible surface, systematised

Build detection and enrichment on everything TLS still exposes:

- **SNI / server name** — which host is being contacted (Zeek ssl.log), the primary "where is this going" for HTTPS. Watch for the SNI/destination reputation, new domains, and mismatches.
- **Certificates** — issuer, subject, validity, chain, self-signed status (x509.log). Systematically flag: self-signed certs to external hosts, certs for IPs or random strings, very fresh certs, certs whose subject doesn't match the SNI/destination. **Certificate Transparency (CT) log monitoring** lets you watch for certs issued for *your* domains (catching phishing/impersonation) and study adversary infrastructure.
- **JA3 / JA3S / JARM** — fingerprint client software, server response, and server TLS stack. Maintain allow-lists of expected JA3s (your browsers, your apps) and match against known-bad JA3s (malware/tooling). A rare JA3 in your environment is a lead (stacking, applied to TLS fingerprints).
- **Behavioural** — timing (beaconing), sizes, volume/direction (exfiltration), even *sequences* of packet sizes and inter-arrival times.

## ML and statistical ETA

Vendors and research use **machine learning on encrypted-flow features** — packet size sequences, timing, byte distributions, TLS parameters — to classify traffic (this is a browser vs. this is a file transfer vs. this looks like C2) and detect anomalies **without decryption**. Cisco's ETA and modern NDR products do this. You don't need to build the models, but understand the principle: enough behavioural and metadata features distinguish traffic types and surface malicious patterns even when content is opaque.

## Fingerprint stacking across the fleet

A powerful skilled technique: **stack JA3 (and SNI, and cert issuer) across the environment.** Legitimate software is uniform, so common fingerprints are your normal; the rare JA3 seen on one host — matching no browser or approved app — is exactly where malicious TLS clients hide (the long-tail hunting method, applied to encrypted traffic).

## The interception decision, at scale

TLS inspection (decrypting at a proxy) restores content for the traffic it handles, but at real operational, privacy, and reliability cost (breaks pinning, misses bypassing traffic, creates a decrypted-data honeypot). Skilled practice is **selective**: decrypt where it's justified and lawful (e.g. outbound user web through a gateway), and rely on ETA everywhere else — which is most places. The trend (encrypted SNI/ECH, DoH) is *reducing* even metadata visibility, making behavioural ETA and endpoint/host telemetry ever more important.

The skilled posture: assume you generally can't read content, and build systematic, fleet-wide detection on TLS metadata (SNI, certs, JA3/JARM, CT monitoring) and behaviour, using stacking to find rare fingerprints and ML/NDR to classify — decrypting only selectively where it's worth the cost.`,
      sample: {
        lang: 'text',
        caption: 'Fleet-wide JA3 stacking surfaces the rare, malicious TLS client',
        code: `Stack JA3 fingerprints across all hosts (Zeek ssl.log):

  JA3                                count  hosts  note
  --------------------------------------------------------------
  a0e9f5d64349fb13...(Chrome)        482k    611   normal browser
  b32309a26951912b...(Firefox)        88k    140   normal browser
  e7d705a3286e19ea...(Windows/edge)  120k    600   normal
  51c64c77e60f3980...                    9      1   <- RARE: 1 host,
                                                     known Cobalt Strike JA3

Rare JA3 on ONE host, matching no browser + a known-bad
fingerprint = malicious TLS client. No decryption needed.`,
        output: `ETA at scale: build on SNI, certs (+ CT monitoring), JA3/JA3S/
JARM and behaviour; stack fingerprints to find the rare/unknown;
use ML/NDR to classify. Decrypt only selectively. As ECH/DoH
erode metadata, behaviour + host telemetry matter even more.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "stacking" JA3 (TLS client) fingerprints across the whole environment an effective way to find malicious encrypted traffic?',
        options: [
          'It decrypts all the traffic',
          'Legitimate software produces a small set of common JA3 fingerprints (your browsers and approved apps), so a rare JA3 seen on only one or few hosts — especially one not matching any known-good client, or matching a known-bad fingerprint — stands out as a likely malicious TLS client, without any decryption',
          'JA3 fingerprints reveal the password',
          'Every connection has a unique JA3, so stacking is meaningless',
        ],
        answer: 1,
        explain:
          'JA3 fingerprints how a client negotiates TLS, and legitimate software is uniform, so the environment is dominated by a handful of common browser/app fingerprints. Aggregating JA3 across all hosts makes the long tail visible: a fingerprint appearing on just one host, matching no approved client (or matching a known malware/tool JA3), is a high-value lead — the same frequency/outlier hunting used elsewhere, applied to encrypted-traffic metadata, requiring no decryption. Combined with SNI, cert details and behaviour, it drives ETA at scale.',
        hint: 'Is legitimate TLS-client software uniform across the fleet, and where does a malicious client’s fingerprint appear in the counts?',
      },
    },

    {
      id: 'bnet-s-04',
      title: 'Protective DNS and DNS security',
      read: `DNS is both a top defensive vantage point (the beginner/intermediate lessons) and, increasingly, a visibility battleground. The skilled defender builds **DNS security architecture**: using DNS as a control and detection layer, while adapting to encrypted DNS that threatens to blind it.

## Protective DNS (PDNS) — DNS as a control

Because nearly every connection starts with a lookup, controlling DNS is a powerful, cheap defensive layer:

- **DNS filtering / RPZ (Response Policy Zones)** — the resolver refuses or **sinkholes** queries for known-bad domains (malware C2, phishing, DGA), returning a safe address or NXDOMAIN. This *blocks* the connection before it happens and *detects* the attempt (the host that asked is flagged). Feed it threat-intel domain lists.
- **Category and policy filtering** — block newly registered domains (heavily abused), risky categories, and domains against policy.
- **Централized resolvers with full logging** — force all clients to use your logging resolvers (block direct external DNS) so you have complete visibility and control.

Protective DNS (as promoted by CISA/NSA) is one of the highest ROI controls: one chokepoint, blocking and logging the first step of most attacks.

## Detecting DGA and tunnelling (recap, at scale)

- **DGA (Domain Generation Algorithms)** — malware generates many random-looking domains to find its live C2; detect via query-name entropy/linguistic features and NXDOMAIN bursts (lots of failed lookups to random names).
- **DNS tunnelling** — long, high-entropy, high-frequency subdomains (intermediate level), at scale via analytics.

## DNSSEC — integrity, not confidentiality

**DNSSEC** cryptographically **signs** DNS records so resolvers can verify answers weren't tampered with (defending against cache poisoning / spoofed answers). It provides *integrity/authenticity*, **not** confidentiality — queries are still visible. Useful, but a different property from the encrypted-DNS protocols below.

## The encrypted-DNS challenge (DoH / DoT)

**DNS over HTTPS (DoH)** and **DNS over TLS (DoT)** encrypt DNS queries — good for user privacy against on-path snoopers, but they can **blind the defender**: if a host (or malware) uses DoH to an external resolver (or as a covert C2 channel — "DoH C2"), your DNS logging and RPZ filtering are bypassed, because the queries no longer go to your resolver in cleartext. Skilled responses:

- **Force internal DoH/DoT to your own resolver** — provide encrypted DNS *you* run and log, and **block external DoH/DoT** (block known DoH provider IPs/domains, disable browser DoH via policy) so clients can't bypass your protective DNS.
- **Detect DoH usage** — connections to known public DoH endpoints, or the TLS/behavioural signature of DoH, flag hosts evading your DNS controls.

## The architecture

Route all clients through **your logging, filtering resolvers** (protective DNS with RPZ + threat intel + newly-registered-domain blocking), **block bypass** (external DNS, unsanctioned DoH/DoT), run **DGA/tunnelling analytics** on the query logs, and use **DNSSEC** for answer integrity. DNS is simultaneously your best early-warning/blocking layer and a channel attackers try to encrypt away — the skilled defender keeps DNS visible and controlled, and detects attempts to escape it.`,
      sample: {
        lang: 'text',
        caption: 'Protective DNS blocks and logs; blocking external DoH keeps it working',
        code: `Client -> [ your logging resolver + RPZ + threat intel ]
  query c2.evil.example  -> RPZ match -> SINKHOLE (blocked + logged)
     -> the C2 connection never happens; the host is flagged
  query k3q9zx.dga.example (+ 400 NXDOMAINs) -> DGA pattern -> alert

BYPASS ATTEMPT (malware using DoH to evade your DNS):
  host -> https://dns.public-doh.example (DoH)   <- skips your resolver!
  Defense: block known DoH endpoints + disable browser DoH by policy
           + provide/force your OWN logged DoH -> visibility restored`,
        output: `Protective DNS = block + log the first step of most attacks (one
cheap chokepoint). DNSSEC = answer integrity (not privacy). DoH/
DoT can BLIND you if clients use external ones - so force clients
to your logged resolver and block external encrypted DNS.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'DNS over HTTPS (DoH) improves user privacy but can undermine a defender’s DNS visibility. Why, and how do defenders respond?',
        options: [
          'DoH deletes DNS logs on the server',
          'If a host (or malware) sends DNS queries via DoH to an external resolver, those queries are encrypted and bypass the organisation’s logging/filtering resolver — evading protective DNS; defenders respond by providing/forcing their own logged DoH resolver and blocking external DoH endpoints so clients cannot bypass DNS controls',
          'DoH makes all DNS queries malicious',
          'DoH only affects internal DNS, never external',
        ],
        answer: 1,
        explain:
          'Protective DNS works because clients use the organisation’s resolver, which logs and can sinkhole bad domains. DoH lets a client (or malware) send encrypted DNS straight to an external resolver, bypassing that chokepoint entirely — so queries aren’t logged or filtered, and DoH can even serve as a covert C2 channel. Defenders keep DNS controlled by running/forcing their own logged (DoH) resolver and blocking or disabling external DoH (known endpoints, browser policy), plus detecting DoH usage that indicates bypass.',
        hint: 'If encrypted DNS goes to someone else’s resolver, whose logging and filtering does it skip — and how do you stop that?',
      },
    },

    {
      id: 'bnet-s-05',
      title: 'Network deception',
      read: `Deception is as powerful on the network as on hosts and in AD: plant things on the network that have **no legitimate use**, so any interaction with them is, by definition, suspicious — near-zero-false-positive detection that also wastes attackers' time and reveals their methods.

## Honeypots

A **honeypot** is a decoy system that exists only to be attacked. Because nothing legitimate should talk to it, every connection is hostile and worth studying:

- **Low-interaction** honeypots (e.g. simple emulated services) — cheap, catch scanning and automated attacks, low risk.
- **High-interaction** honeypots (real systems, carefully isolated) — reveal full attacker behaviour and tooling, but need strong containment so they can't be used as a foothold.
- **Placement matters:** an **internal honeypot** is a superb lateral-movement detector — nothing internal should be probing it, so a connection means an attacker (or worm) is already inside and moving. That is far higher-signal than an internet-facing honeypot (which just sees constant background scanning).

## Honeynets and deception platforms

A **honeynet** is a whole network of decoys. Modern **deception platforms** distribute realistic decoy hosts, services, and breadcrumbs across the real environment so that an attacker exploring after a compromise keeps hitting traps: decoy file shares, fake credentials that lead to decoy systems, decoy database servers. The attacker can't easily tell real from fake, so their reconnaissance and lateral movement trigger alerts and slow them down.

## Tarpits

A **tarpit** deliberately *slows* attackers: it accepts connections but responds extremely slowly (e.g. TCP tarpits that hold scan connections open), wasting the attacker's time and resources and making mass scanning painful. Defensive friction.

## Breadcrumbs and network canaries

- **Decoy credentials / connections** seeded so that using them leads to a monitored decoy — any use is an alert.
- **Canary services** — a fake service on a port nothing should use; a connection to it is a tripwire.
- These pair with the AD/host deception from earlier tracks for coverage across identity, endpoint, and network.

## Why network deception excels

- **Near-zero false positives** — legitimate systems don't touch decoys, so an alert strongly implies a real intruder.
- **Catches what evades signatures** — a novel attack still trips a decoy when it probes it.
- **Early and internal** — internal honeypots catch lateral movement early, before the attacker reaches real crown jewels.
- **Intelligence and friction** — you learn the attacker's tools and TTPs safely, and you waste their time.

Deception sidesteps the false-positive problem that plagues detection: instead of trying to recognise bad activity among mountains of legitimate traffic, you create things that *only* an attacker would touch. Well-placed internal honeypots and breadcrumbs are among the highest-signal, lowest-noise network detections a skilled defender can deploy — especially against the lateral movement that is otherwise hard to catch cleanly.`,
      sample: {
        lang: 'text',
        caption: 'An internal honeypot: a high-signal lateral-movement tripwire',
        code: `Decoy "FILESRV-07" (a honeypot) placed in the server segment:
  - looks like a real file server (SMB, plausible name/shares)
  - used by NOTHING legitimate; documented as a decoy
  - every connection to it is logged and alerts

Normal operation: 0 connections (nothing legit touches it).

During an intrusion:
  10.0.0.31 -> FILESRV-07:445  (SMB enumeration)   -> ALERT
  10.0.0.31 tried decoy credential on it            -> ALERT
= an attacker is inside and moving laterally. Near-zero FP,
  caught early, before they reach the REAL file server.`,
        output: `Deception plants things only an attacker would touch, so an
alert almost certainly means a real intruder. Internal
honeypots catch lateral movement cleanly; tarpits and
breadcrumbs add friction and intelligence. Highest signal,
lowest noise - it sidesteps the false-positive problem.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an internal honeypot (a decoy system inside the network) an especially high-signal detector of lateral movement?',
        options: [
          'It blocks the attacker automatically',
          'Nothing legitimate has any reason to connect to a decoy internal system, so a connection to it strongly implies an attacker who is already inside and probing/moving — giving a near-zero-false-positive alert for lateral movement, which is otherwise hard to detect cleanly',
          'It patches vulnerabilities on real servers',
          'Internal honeypots only detect external scanning',
        ],
        answer: 1,
        explain:
          'Deception works because the bait has no legitimate use. An internal honeypot should receive zero connections in normal operation, so any interaction almost certainly comes from an attacker already inside, enumerating or moving laterally. That makes it a near-zero-false-positive, early detector of exactly the behaviour (lateral movement) that is noisy and hard to catch with signatures — and, unlike an internet-facing honeypot drowning in background scanning, its signal is clean.',
        hint: 'Who, other than an intruder, would ever connect to a decoy that nothing legitimate uses — and where is it placed?',
      },
    },

    {
      id: 'bnet-s-06',
      title: 'Network forensics at scale',
      read: `When an incident spans weeks and terabytes, ad-hoc Wireshark isn't enough. **Network forensics at scale** means indexed, searchable capture and metadata that let you answer investigative questions across huge volumes and long timeframes.

## Full-packet capture at scale

- **Arkime** (formerly Moloch) — the standard open-source large-scale full-packet-capture-and-index system. It captures traffic, indexes rich metadata (sessions, protocols, fields), and gives a web UI to search across enormous pcap and pivot to the raw packets. This is how you keep and *search* days/weeks of full capture across busy links.
- **Retention strategy** — full capture is huge, so you keep a rolling window (as long as storage allows) plus longer-retention metadata (Zeek logs, flow) — the layered NSM model. During an incident, the full-capture window is gold for the smoking-gun packets; the long metadata gives the history.

## The forensic techniques

- **Session reconstruction** — reassemble conversations (like Follow Stream, at scale) to see exactly what was transferred.
- **File carving / extraction** — pull files out of captured traffic (malware downloaded, data exfiltrated) for hashing and analysis. Zeek's files.log and Arkime/NetworkMiner extract objects from the stream.
- **Protocol reconstruction** — rebuild emails, HTTP objects, transferred files from the raw packets.
- **Timeline construction** — order network events (connections, DNS, transfers, alerts) into the incident narrative, correlated with host timelines (the plaso/super-timeline idea, extended to the network).
- **Pivoting** — from one indicator (an IP, a domain, a JA3, a file hash) find all related sessions across the whole capture/metadata store, expanding scope.

## Investigative questions at scale

Network forensics answers the questions an incident demands:

- "Everything host X did on the network in the last 30 days" (flow/Zeek/Arkime).
- "Who else talked to this C2 IP?" (scope the breach across all hosts).
- "What files were transferred to/from this host?" (carving).
- "Reconstruct exactly what was exfiltrated" (session reconstruction).
- "When did the attacker first appear, and what was the sequence?" (timeline).

## Evidence handling

As in host forensics: preserve captures with integrity (hashes), maintain chain of custody if it may be legal, and record your process. Captured packets are strong evidence — handled properly.

The skilled shift is from analysing *a* capture to investigating *across* a large, indexed body of network data over time — using Arkime-style capture, Zeek/flow metadata, carving and reconstruction, timelines, and pivoting to scope and reconstruct an intrusion. It's the network arm of DFIR, and it's what makes "what exactly happened, everywhere, over the whole campaign?" answerable.`,
      sample: {
        lang: 'text',
        caption: 'Pivoting across indexed capture to scope a breach (Arkime-style)',
        code: `Start from one indicator (a C2 IP from an alert): 45.77.10.20

Search all indexed sessions (weeks of capture + metadata):
  ip == 45.77.10.20
  -> 10.0.0.31, 10.0.0.44, 10.0.0.90 all talked to it  <- scope: 3 hosts
Pivot on the JA3 seen:  ja3 == 51c64c77...
  -> also 10.0.0.12                                     <- scope: +1 host
Carve files transferred to 45.77.10.20 from those hosts:
  -> finance_export.zip (14 GB)  <- what was exfiltrated, reconstructed
Timeline: first contact 3 weeks ago on 10.0.0.31 (patient zero)`,
        output: `At scale: indexed full capture (Arkime) + Zeek/flow metadata let
you PIVOT from one indicator to full scope, CARVE the exfiltrated
files, and build the TIMELINE across weeks and terabytes -
answering "what exactly happened, everywhere?" That is network DFIR.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an indexed large-scale capture system (like Arkime) plus long-retention metadata essential for investigating a real, weeks-long intrusion, rather than just opening a pcap in Wireshark?',
        options: [
          'Wireshark cannot open pcap files',
          'A real incident spans huge volumes and long timeframes, so you need indexed, searchable capture and long-retention metadata (Zeek/flow) to pivot from an indicator to full scope across all hosts, carve transferred files, and build a timeline over weeks — investigative questions ad-hoc single-file analysis cannot answer at that scale',
          'Metadata is useless for forensics',
          'Full packet capture can be kept forever cheaply',
        ],
        answer: 1,
        explain:
          'Investigating a campaign means answering scale/time questions: everything a host did over 30 days, who else contacted a C2, what files were exfiltrated, when the attacker first appeared. That requires indexed, searchable full capture (Arkime) for a rolling window plus long-retention metadata (Zeek/flow) for history — enabling pivoting from one indicator to full scope, file carving, session reconstruction, and timeline building across terabytes. Opening a single pcap in Wireshark analyses a slice; network forensics at scale investigates the whole intrusion over time.',
        hint: 'Can you answer "who else touched this C2 over the last month, and what was stolen?" from a single pcap file?',
      },
    },

    {
      id: 'bnet-s-07',
      title: 'Detection engineering for the network',
      read: `The skilled defender doesn't just use detections — they **write, test, tune and maintain** them as code. Network detection engineering means crafting Suricata rules, Zeek scripts, and portable analytics, mapped to ATT&CK, version-controlled, and validated — the network parallel to the detection-as-code discipline from the host tracks.

## Writing signature rules (Suricata/Snort)

A good rule is specific enough to avoid noise and general enough to catch variants:

- **Anchor on stable indicators** — a protocol structure, a distinctive byte pattern, a behaviour — rather than something trivially changed. Per the Pyramid of Pain, a rule on a *technique/behaviour* outlasts one on a single IP or exact string.
- **Use the right buffers** — Suricata's protocol keywords (http.uri, dns.query, tls.sni, ja3.hash) match the right part precisely, reducing false positives vs raw content matches.
- **Metadata** — every rule carries an ATT&CK technique, a clear message, a reference, and documented false positives.

## Zeek scripting for behavioural detection

For logic beyond signatures — correlate across connections, compute statistics, track state — write **Zeek scripts**: detect beaconing intervals, count fan-out for scans, flag first-time internal connections on admin ports, raise a notice on a suspicious cert. Zeek's language is built for stateful, protocol-aware detection that signatures can't express.

## Portable analytics (Sigma & SIEM)

Detections that run over collected logs (Zeek/flow/proxy/DNS in the SIEM) are written as queries — and **Sigma** provides a vendor-neutral format that compiles to different SIEM backends (the host-track lesson, applied to network data). This keeps network detections portable and version-controlled.

## The engineering lifecycle

Treat network detections exactly like software:

- **Version control & review** — rules/scripts/queries in a repo, peer-reviewed.
- **Test against known-good and known-bad** — a rule must fire on the attack (validate with emulation/replay of malicious pcap) *and* stay quiet on your normal traffic (replay benign pcap / run against baseline). Tools let you replay pcap through Suricata to test.
- **Tune & track** — measure per-rule false-positive rates; fix or retire noisy rules; a rule firing constantly on benign traffic is negative value (alert fatigue).
- **Map to ATT&CK** — know your coverage across techniques (initial access, C2, exfil, lateral movement) and where the gaps are.

## Balancing signatures and behaviour

Layer them: **signatures** (Suricata) for precise known-bad, **behavioural** (Zeek scripts, flow analytics) for the unknown and encrypted (beaconing, tunnelling, exfil, lateral patterns), and **intel matching** for known infrastructure — prioritising durable behavioural detections high in the Pyramid of Pain while keeping cheap IOC/signature coverage.

Network detection engineering is the discipline that turns "we have some IDS rules" into a managed, tested, version-controlled, ATT&CK-mapped detection capability with known coverage and quality — the same maturity the host tracks demand, applied to the wire.`,
      sample: {
        lang: 'text',
        caption: 'A tested, ATT&CK-mapped network detection lifecycle',
        code: `# 1. Write (Suricata, anchored on a stable protocol field + JA3):
alert tls any any -> any any (msg:"Suspicious self-signed cert to external";
  tls.cert_subject; content:"CN=localhost"; tls.version:1.2;
  metadata: attack.command_and_control t1573; sid:2100001; rev:1;)

# 2. Test:  replay malicious pcap  -> rule FIRES (validated)
#           replay 24h benign pcap -> 0 alerts (no false positives)
# 3. Version control + peer review; map to ATT&CK T1573
# 4. Deploy; track FP rate weekly; retire/fix if noisy`,
        output: `Network detections as code: write (anchored on durable
indicators), TEST both ways (fires on attack via pcap replay,
quiet on normal), version-control + review, map to ATT&CK,
tune and track FP rate. Layer signatures + Zeek behaviour +
intel. Managed coverage and quality, not a pile of rules.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A key practice in network detection engineering is replaying both malicious and benign packet captures through a new rule before deploying it. Why both?',
        options: [
          'To make the rule run faster',
          'Replaying malicious pcap confirms the rule actually fires on the attack (it works), and replaying benign/normal pcap confirms it stays quiet on legitimate traffic (no false positives) — you must validate both, because a rule that misses the attack is useless and one that floods on benign traffic causes alert fatigue and gets ignored',
          'Only the malicious replay matters',
          'Benign traffic can never trigger a rule',
        ],
        answer: 1,
        explain:
          'A detection has two failure modes: missing the attack, and firing on legitimate activity. Replaying malicious pcap validates that the rule catches the threat; replaying representative benign traffic validates that it doesn’t generate false positives (many benign patterns superficially resemble attacks). Both must pass before deployment, because a rule that doesn’t fire on the attack protects nothing and a noisy one causes alert fatigue and gets muted. Testing both ways — as code, in version control, mapped to ATT&CK — is the essence of detection engineering.',
        hint: 'What are the two ways a detection can fail, and which replay checks each?',
      },
    },

    {
      id: 'bnet-s-08',
      title: 'Cloud network security',
      read: `Workloads have moved to the cloud, where the network model differs from on-prem — no physical taps, different controls, but the same defensive principles (segmentation, least privilege, visibility, monitoring). The skilled defender applies network defence in cloud environments (AWS/Azure/GCP).

## The cloud network primitives

- **VPC / VNet** — your private virtual network in the cloud, subnetted like on-prem.
- **Security groups / NSGs** — stateful, instance/interface-level firewalls (effectively per-workload micro-segmentation built in). Default-deny and least-privilege apply: allow only needed flows. These are the primary segmentation control in cloud.
- **Network ACLs** — subnet-level, stateless filtering (a coarser layer).
- **No implicit trust** — cloud strongly encourages identity-based and per-resource controls, aligning naturally with zero trust.

## Cloud network visibility

You can't plug in a tap, so cloud provides native telemetry:

- **VPC Flow Logs** (AWS) / **NSG Flow Logs** (Azure) / **VPC Flow Logs** (GCP) — the cloud's NetFlow: source/dest, ports, protocol, bytes, accept/reject. The primary network-visibility source; feed it to your SIEM for the same volume/relationship/anomaly detection as on-prem flow.
- **DNS query logging** (Route 53 Resolver logs, etc.) — cloud DNS visibility (protective DNS lessons apply).
- **Traffic Mirroring** (VPC Traffic Mirroring, Azure vTAP) — the cloud equivalent of a SPAN/tap: mirror packets to a sensor (Zeek/Suricata) for deep inspection where needed.
- **Cloud-native detection** — GuardDuty (AWS), Defender for Cloud (Azure), and cloud NDR analyse flow/DNS/threat-intel for you.

## Cloud-specific concerns

- **Misconfiguration is the top risk** — an overly-open security group (0.0.0.0/0 to a database or RDP/SSH), a public S3 bucket, an exposed management port. Continuously audit for these (CSPM — Cloud Security Posture Management).
- **The management plane** — the cloud API/console is a network-independent control plane; compromise of cloud credentials can reconfigure networking entirely, so protecting and monitoring the control plane (identity) is as important as the data plane.
- **East-west and hybrid** — traffic between cloud workloads, and between cloud and on-prem (VPN/Direct Connect), needs segmentation and monitoring just like a physical network.
- **Ephemerality & scale** — instances come and go; IP-based rules and monitoring must handle churn (another reason for identity/tag-based policy).

## Same principles, different levers

The defensive concepts transfer directly: **segment** (security groups as per-workload micro-segmentation), **least privilege** (default-deny flows), **visibility** (flow logs, DNS logs, traffic mirroring), **monitor and detect** (SIEM + cloud-native tools + your Zeek/Suricata via mirroring), **reduce exposure** (audit for open groups/public resources). What changes is the *mechanism* (API-driven, no physical access) and some risks (misconfiguration, the control plane). A skilled network defender is comfortable applying the same architecture and monitoring thinking in the cloud, using flow logs and traffic mirroring for visibility and security groups for micro-segmentation.`,
      sample: {
        lang: 'text',
        caption: 'Cloud network defence: the same principles, cloud levers',
        code: `Segmentation:  security groups = per-instance stateful firewall
   web-sg  allow :443 from internet; allow :5432 -> db-sg only
   db-sg   allow :5432 FROM web-sg only; deny all else  (micro-seg)

Visibility:    VPC Flow Logs -> SIEM (the cloud's NetFlow)
   detect: exfil (volume), beaconing (timing), rejects (scans)
   Route53 Resolver DNS logs -> protective DNS + DGA/tunnel detection
   VPC Traffic Mirroring -> Zeek/Suricata for deep inspection

Top risk - MISCONFIG (audit continuously):
   sg allows 0.0.0.0/0 -> :3389   <- RDP open to the whole internet!`,
        output: `Cloud = same principles (segment, least privilege, visibility,
monitor, reduce exposure), different levers: security groups
(micro-seg), flow/DNS logs + traffic mirroring (visibility),
CSPM for misconfig. Plus a new crown jewel: the control plane.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does a network defender gain packet-level and flow visibility in a cloud environment (AWS/Azure/GCP) where you cannot install a physical tap?',
        options: [
          'You cannot get any visibility in the cloud',
          'The cloud provides native telemetry: VPC/NSG Flow Logs (the cloud’s NetFlow) for flow-level visibility, DNS resolver query logging, and Traffic Mirroring/vTAP to send copied packets to a sensor (Zeek/Suricata) — feeding the same volume/relationship/anomaly detection and deep inspection as on-prem, via cloud-native mechanisms',
          'You must move all workloads back on-premises',
          'Only the cloud provider can ever see the traffic',
        ],
        answer: 1,
        explain:
          'Cloud replaces physical taps with API-driven telemetry: flow logs (VPC/NSG) give NetFlow-equivalent visibility for volume/relationship/anomaly detection and long-retention hunting; DNS resolver logging gives protective-DNS visibility; and Traffic Mirroring/vTAP copies packets to a sensor running Zeek/Suricata for deep inspection where needed — complemented by cloud-native detection (GuardDuty/Defender for Cloud). The principles (segment via security groups, least privilege, visibility, monitor, reduce exposure) transfer; only the mechanisms differ, and misconfiguration and the control plane become key concerns.',
        hint: 'What are the cloud equivalents of NetFlow and a SPAN/tap?',
      },
    },

    {
      id: 'bnet-s-09',
      title: 'Wireless and access-layer security',
      read: `Wireless and the wired access layer are where devices *join* the network — a critical boundary. A skilled defender secures Wi‑Fi against its specific attacks and controls what is even allowed to connect at all.

## Wi‑Fi threats

- **Rogue access points** — an unauthorised AP plugged into your network (by an insider for convenience, or an attacker) that bypasses your perimeter and offers a way in. Detect via wireless scanning / WIDS that inventories APs and flags unknown ones.
- **Evil twin** — an attacker's AP impersonating your legitimate SSID to lure clients into connecting to *them* (then MITM). Clients that auto-connect to a familiar SSID are the target. Detect via APs broadcasting your SSID from unexpected BSSIDs/locations.
- **Deauthentication attacks** — forging deauth frames to knock clients off (to force reconnection, capture handshakes, or DoS). Management-frame protection (802.11w) mitigates.
- **Handshake capture & offline cracking** — capturing the WPA handshake to crack a weak pre-shared key offline (the roasting pattern, on Wi‑Fi). Strong keys / enterprise auth defend.

## Wi‑Fi defences

- **WPA3** (or WPA2-Enterprise at minimum) — modern encryption; WPA3 resists offline cracking far better. Avoid WPA/WEP entirely (broken).
- **WPA2/3-Enterprise (802.1X)** — per-user authentication against a RADIUS server (not a shared password), so credentials are individual and revocable, and there's no single PSK to crack or leak.
- **Guest isolation** — guest Wi‑Fi on its own segment, isolated from internal (the segmentation lesson).
- **Management-frame protection (802.11w)** — against deauth/spoofing.
- **Wireless IDS (WIDS)** — detect rogue/evil-twin APs and wireless attacks.

## NAC and 802.1X on the wired access layer

The same "control who joins" principle applies to wired ports:

- **802.1X / NAC (Network Access Control)** — a device must **authenticate** (and often pass a **posture check** — patched, compliant, running EDR) before the switch port grants network access. Unauthenticated or non-compliant devices get denied, quarantined, or placed in a restricted VLAN.
- **Dynamic segmentation** — NAC can assign a device to the right VLAN/segment based on its identity and role (a printer to the printer VLAN, a corporate laptop to the user VLAN, an unknown device to quarantine).
- **Port security** — limit MACs per port, disable unused ports, prevent rogue devices and some layer‑2 attacks.

## Why the access layer matters

Perimeter and internal controls assume you know what's on the network. The access layer decides *what gets on it at all*. A rogue AP or an unauthorised device plugged into a port bypasses your carefully designed zones. NAC/802.1X (wired and wireless-enterprise) enforce that only authenticated, compliant, correctly-placed devices connect — closing the "someone plugged something in" gap. Combined with Wi‑Fi hardening (WPA3/enterprise, WIDS, guest isolation) and layer‑2 protections (from the amateur level: DHCP snooping, DAI, port security), the access layer becomes a controlled, monitored front door rather than an open one.`,
      sample: {
        lang: 'text',
        caption: 'Controlling who joins: NAC/802.1X on wired and Wi‑Fi',
        code: `WIRED port + 802.1X/NAC:
  device plugs in -> must AUTHENTICATE (802.1X) + POSTURE check
    corporate laptop, compliant  -> user VLAN
    unknown / non-compliant      -> quarantine VLAN (or denied)
  -> a rogue device plugged in cannot just get on the network

WIRELESS:
  WPA3 / WPA2-Enterprise (802.1X per-user, no shared PSK to crack)
  WIDS: alerts on rogue AP + evil-twin (your SSID, wrong BSSID)
  802.11w: blocks deauth spoofing;  guest SSID isolated segment`,
        output: `The access layer decides what gets on the network AT ALL.
NAC/802.1X: authenticate + posture-check + segment devices before
access. Wi-Fi: WPA3/enterprise, WIDS for rogue/evil-twin APs,
guest isolation. Close the "someone plugged something in" gap.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the core security benefit of NAC / 802.1X on the network access layer (wired ports and enterprise Wi‑Fi)?',
        options: [
          'It speeds up the network',
          'It requires a device to authenticate (and often pass a posture/compliance check) before it is granted network access, so unauthorised or non-compliant devices are denied or quarantined and compliant ones are placed in the correct segment — controlling what is allowed onto the network at all and closing the "rogue device plugged in" gap',
          'It encrypts all traffic on the LAN',
          'It replaces the need for firewalls',
        ],
        answer: 1,
        explain:
          'Perimeter and internal controls assume you know what’s on the network; NAC/802.1X governs what gets on it in the first place. A device must authenticate (via 802.1X to a RADIUS server) and frequently pass a posture check before the switch port or Wi‑Fi grants access, so a rogue or non-compliant device is denied or quarantined, and authorised devices are dynamically placed in the right VLAN/segment. That closes the "someone plugged in an unauthorised device / connected a rogue AP" gap that otherwise bypasses your carefully designed zones.',
        hint: 'Perimeter and segmentation controls assume you know what’s connected. What decides whether a device is allowed to connect at all?',
      },
    },

    {
      id: 'bnet-s-10',
      title: 'Defending against DDoS',
      read: `**Distributed Denial of Service (DDoS)** attacks flood a target with traffic from many sources to exhaust its resources and make it unavailable — an attack on the **Availability** leg of the CIA triad. Defending against it is a distinct network-security discipline.

## The categories

- **Volumetric** — sheer bandwidth: floods (UDP, ICMP) and **amplification/reflection** attacks (send small spoofed requests to third-party servers — DNS, NTP, memcached — that reply to the *victim* with much larger responses, multiplying the traffic). Measured in Gbps/Tbps; the goal is to saturate the link.
- **Protocol** — exhaust connection-state resources: **SYN floods** (half-open connections, from the beginner handshake lesson), and similar. Measured in packets per second; targets firewalls, load balancers, and connection tables.
- **Application-layer (L7)** — low-volume but expensive requests that exhaust server resources: floods of costly HTTP requests (searches, logins), Slowloris (holding connections open). Hard to distinguish from real users because each request looks legitimate.

## Defences

- **Overprovisioning & scaling** — more capacity/auto-scaling absorbs smaller attacks (but can't beat a Tbps flood, and can be costly).
- **Upstream / cloud scrubbing** — the primary defence against large volumetric attacks: route traffic through a **DDoS mitigation provider** (Cloudflare, Akamai, AWS Shield, etc.) with enormous capacity that **scrubs** (filters out attack traffic) and forwards only clean traffic. You cannot filter a 1 Tbps flood at your own link — it's already saturated — so mitigation must happen *upstream*, in the provider's network, before it reaches you.
- **Rate limiting & connection limits** — cap requests/connections per source; **SYN cookies** (the Linux sysctl) defeat SYN floods without holding state.
- **Anti-spoofing (BCP38)** — networks filtering spoofed source addresses reduce reflection attacks (a community-wide defence).
- **CDNs & caching** — absorb and distribute load, hiding the origin.
- **L7 protections** — WAF, bot management, CAPTCHAs, and behavioural analysis to separate real users from attack requests for application-layer floods.

## The key insight: mitigate upstream

The defining principle of volumetric DDoS defence is that **you cannot defend at the choke point being flooded** — if your internet link is saturated, no on-premise firewall can help, because the traffic has already consumed the bandwidth. Defence must happen *before* your link, in a provider's high-capacity network that scrubs the attack and sends you only clean traffic. This is why cloud-based DDoS mitigation (with anycast to absorb and distribute floods globally) is the standard for anything internet-facing that matters.

## Preparation

DDoS defence is largely about **preparedness**: have mitigation in place *before* the attack (arranging it mid-attack is too late), know your traffic baselines to detect an attack early, have a runbook (who to call, how to reroute through scrubbing), and design for it (CDN, scaling, rate limits). Availability is a security property; DDoS is the attack on it, and upstream scrubbing plus preparation is how you keep services up.`,
      sample: {
        lang: 'text',
        caption: 'Why volumetric DDoS must be mitigated upstream, not at your link',
        code: `Attack: 800 Gbps DNS amplification flood at your service.

WITHOUT upstream scrubbing:
  your 10 Gbps internet link  <-- 800 Gbps flood
  link SATURATED before any packet reaches your firewall.
  Your on-prem firewall is useless - the bandwidth is already gone.

WITH cloud DDoS mitigation (traffic routed through provider):
  800 Gbps -> [ provider's Tbps-scale scrubbing network ]
     -> filters attack traffic (anycast absorbs + distributes)
     -> forwards ONLY clean traffic (a few Gbps) to your link
  service stays up.`,
        output: `Volumetric DDoS defence MUST happen upstream: you cannot filter
a flood at a link it has already saturated. Route through a
high-capacity scrubbing provider. Arrange it BEFORE the attack -
DDoS defence is preparedness. (SYN cookies/rate limits handle
protocol floods; WAF/bot mgmt handle L7.)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why must large volumetric DDoS attacks be mitigated "upstream" (in a provider’s scrubbing network) rather than by your own firewall?',
        options: [
          'On-premise firewalls are always misconfigured',
          'If the attack saturates your internet link, the bandwidth is already consumed before traffic reaches your firewall, so filtering there cannot help; defence must occur upstream in a high-capacity provider network that scrubs the attack and forwards only clean traffic, before it reaches your (now un-saturated) link',
          'Firewalls cannot inspect UDP',
          'Upstream mitigation is only about cost, not effectiveness',
        ],
        answer: 1,
        explain:
          'A volumetric flood works by overwhelming bandwidth. Once your internet link is saturated, everything — including your firewall’s ability to help — is already choked, because the malicious packets have consumed the pipe before your equipment sees them. So mitigation must happen before your link, in a provider’s Tbps-scale, anycast scrubbing network that filters the flood and forwards only clean traffic. This is why cloud DDoS mitigation is standard for important internet-facing services, and why it must be arranged in advance (protocol floods use SYN cookies/rate limits; L7 uses WAF/bot management).',
        hint: 'If the flood has already filled your internet pipe, can any device on your side of that pipe still help?',
      },
    },

    {
      id: 'bnet-s-11',
      title: 'Threat hunting on the network',
      read: `With rich network telemetry (flow, Zeek, DNS, alerts) centralized, the skilled defender **hunts** — proactively searching for the intrusions that automated detection missed, driven by hypotheses rather than alerts. This is the network application of the hunting method from the host tracks.

## The hunt loop, on network data

1. **Hypothesis** grounded in TTPs: "if an attacker has a foothold, they'd beacon to C2" / "they'd tunnel data over DNS" / "they'd move laterally on SMB" / "they'd have a long-lived connection to a rare external host."
2. **Gather** the relevant telemetry across the environment (flow, Zeek conn/dns/ssl logs, DNS, proxy).
3. **Analyse** — apply the techniques below to test the hypothesis.
4. **Conclude** — find evil (→ incident), or gain confidence *and* discover visibility gaps.
5. **Operationalise** — a productive hunt becomes an automated detection.

## Network hunting techniques

- **Stacking / frequency analysis** — the workhorse (from every track): aggregate an attribute across the environment and examine the **rare values**. Rare JA3 fingerprints, rarely-contacted external destinations, uncommon user-agents, unusual ports, single-host DNS domains — the long tail is where evil hides, because legitimate traffic is uniform.
- **Beaconing analysis** — hunt for periodic connections (interval regularity over Zeek/flow) to any destination, not just known-bad — catches unknown C2.
- **Outlier/volume analysis** — hosts sending unusually much (exfil), new external relationships, connections at unusual times, protocol/port anomalies.
- **First-seen analysis** — flag first-ever connections: a host talking to a destination or on a port it never has before, especially internal admin ports (lateral movement) or new external domains (C2).
- **Long-connection analysis** — unusually long-lived connections (interactive C2, tunnels).
- **DNS hunting** — high-entropy/long/frequent queries (tunnelling), NXDOMAIN bursts (DGA), newly registered domains, rare domains contacted by one host.

## The value of hunting

- **Catches the unknown** — hunting finds intrusions no rule anticipated, shortening dwell time (the attacker's undetected window).
- **Reveals visibility gaps** — a hypothesis you *couldn't* test (no data) is itself a finding, feeding back into your telemetry (placement, log sources).
- **Feeds detection engineering** — successful hunts become automated detections, so you never manually hunt the same thing twice.

## Why the network is great for hunting

Network telemetry gives an **environment-wide, host-independent view** with **long retention** (flow/Zeek metadata), so you can hunt across everything, over time, from a vantage the attacker can't erase. "Show me every host's rarest external destinations, the periodic connections, the new internal admin-port relationships, the high-entropy DNS" — these fleet-wide, long-lookback questions are exactly what network data answers well.

Hunting is what turns a monitoring stack from reactive (wait for alerts) to proactive (go find what the alerts missed). The techniques — stacking for the rare, beaconing for C2, outliers/first-seen for anomalies, DNS analysis for tunnelling/DGA — applied hypothesis-first across your network telemetry, are how a skilled defender uncovers the intrusions that slipped through.`,
      sample: {
        lang: 'text',
        caption: 'A network hunt: stacking rare external destinations by host',
        code: `Hypothesis: undetected C2 lives among rarely-contacted external hosts.

Stack: distinct internal hosts per external destination (30 days flow)
  destination        # internal hosts contacting it
  --------------------------------------------------
  cdn.bigsite.example      603   (normal - everyone uses it)
  updates.vendor.example   240   (normal)
  185.220.x.x                1   <- ONE host, rare dest: examine
     -> beacon-like timing (~5min), long-lived, no SNI, odd JA3
     -> = previously-undetected C2. Now operationalise as a detection.`,
        output: `Hunting = hypothesis-first search for what detection missed.
Techniques: stack for the RARE (destinations, JA3, domains),
beaconing for C2, outliers/first-seen for anomalies, DNS
entropy for tunnelling. Network telemetry (fleet-wide, long
retention, host-independent) is ideal. Findings -> new detections.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes threat hunting on the network from relying on automated detections and alerts?',
        options: [
          'Hunting waits for alerts to fire, then investigates',
          'Hunting is proactive and hypothesis-driven: you posit how an attacker would behave (e.g. beacon to C2, tunnel over DNS, move laterally) and search the telemetry for it — using techniques like stacking for rare values, beaconing and outlier analysis — to find intrusions no rule anticipated, shorten dwell time, and turn findings into new detections',
          'Hunting only uses blocked-traffic logs',
          'Hunting and automated detection are the same thing',
        ],
        answer: 1,
        explain:
          'Automated detection catches the known (what you wrote rules for); hunting proactively seeks the unknown. You start from a hypothesis about attacker behaviour and interrogate your network telemetry — stacking attributes to find rare outliers (destinations, JA3, domains), analysing beaconing timing, volume outliers, first-seen relationships, and DNS entropy — to uncover intrusions no rule caught. That shortens dwell time, reveals visibility gaps, and feeds successful hunts back as new automated detections. Network telemetry’s fleet-wide, long-retention, host-independent view makes it ideal for this.',
        hint: 'Does hunting wait for an alert, or start from a hypothesis and go looking?',
      },
    },

    {
      id: 'bnet-s-12',
      title: 'Project: a network detection & response capability',
      read: `Bring the level together into what a skilled network defender is judged on: an engineered, measured **network detection-and-response capability** — architecture that contains, visibility everywhere it matters, detections you built and validated, deception, and hunting — for a realistic environment.

## The capability, assembled

**Architecture (contain by design)**
- Defence-in-depth zoning (DMZ, internal, tier-0, management) with default-deny between zones; zero-trust micro-segmentation for critical workloads; NAC/802.1X controlling access; segmentation forcing traffic through monitored choke points.

**Visibility (see what matters)**
- Sensors at choke points (taps/SPAN on-prem; flow logs + traffic mirroring in cloud); Zeek transaction logs, Suricata alerts, flow, and DNS logging — centralized in a SIEM with long retention; selective full capture (Arkime) for depth. Blind spots mapped.

**Detection (catch known and unknown)**
- Suricata signatures + threat-intel matching (known-bad); Zeek scripts and flow analytics for behaviour (beaconing, exfil, tunnelling, lateral movement); encrypted-traffic analysis (SNI/cert/JA3, fingerprint stacking); protective DNS (RPZ + DGA/tunnel detection). All detections version-controlled, tested (pcap replay), ATT&CK-mapped, tuned.

**Deception (high-signal tripwires)**
- Internal honeypots and network breadcrumbs — near-zero-FP lateral-movement detection.

**Response & hunting**
- Network forensics at scale (Arkime, carving, timelines, pivoting) for investigation; a hunting program running the techniques (stacking, beaconing, outliers, DNS) on a schedule; DDoS mitigation arranged upstream for availability.

## Validate and measure

Emulate attacks in the lab/controlled scope — scan, beacon, tunnel, exfil, lateral movement — and confirm each is detected (and where designed, blocked); measure detection coverage against ATT&CK (network techniques) and MTTD. Close gaps (visibility → placement/log sources; detection → new rule/script; containment → segmentation). Track coverage, MTTD, and detection quality (FP rates) over time.

## The measure of success

A skilled network defender can say, with evidence: "The architecture contains breaches (zoned, micro-segmented, access-controlled); I have visibility at the right choke points feeding centralized telemetry; my validated detections cover the key network TTPs (signatures + behaviour + ETA + protective DNS), version-controlled and tuned; deception catches lateral movement cleanly; I can investigate at scale and hunt for what's missed; and here are my ATT&CK coverage, MTTD, and FP-rate metrics improving over time."

> The level distilled: **engineer the network so defence is structural.** Architecture contains and forces attacks through monitored choke points; zero-trust micro-segmentation kills lateral movement; visibility (on-prem taps and cloud flow logs/mirroring) feeds detection you write, test and tune as code; ETA and protective DNS handle the encrypted/DNS reality; deception provides clean signal; forensics-at-scale and hunting find and reconstruct what got through; DDoS mitigation protects availability. That integrated, validated, measured capability — not a pile of tools — is network defence engineered at the skilled level, and the foundation the pro level pushes into ML/NDR, evasion, and the frontier.`,
      sample: {
        lang: 'text',
        caption: 'A network detection-and-response capability scorecard',
        code: `Area                    Built                 Validated           Metric
------------------------------------------------------------------------------
Architecture            zoned + micro-seg     lateral contained   0 flat paths
Visibility              taps + cloud flow     coverage confirmed  92% choke pts
Signatures + intel      Suricata + feeds      pcap-replay tested  FP <8%
Behavioural detection   Zeek/flow: beacon/    emulated + fired    MTTD 6 min
                        exfil/lateral
ETA + protective DNS    JA3 stack + RPZ       DGA/tunnel detected 0 FP DNS
Deception               internal honeypots    tripped in lab      0 FP
Hunting + forensics     scheduled + Arkime    found unknown C2    dwell -60%
DDoS                    upstream scrubbing    tabletop drilled    ready`,
        output: `Engineered (contain by design), visible (right choke points),
detecting known + unknown (tested, tuned, ATT&CK-mapped),
deception for clean signal, hunt + forensics for the rest,
DDoS handled - all validated and measured, improving over time.
That is a network DR capability, not a pile of tools.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What most distinguishes a skilled network defender’s "detection and response capability" from simply deploying an IDS?',
        options: [
          'Using a more expensive IDS',
          'It is an engineered, integrated, measured system — architecture that contains breaches (zoning, micro-segmentation, access control), visibility at the right choke points feeding centralized telemetry, validated and tuned detections covering known and unknown TTPs (signatures + behaviour + ETA + protective DNS), deception, forensics-at-scale and hunting — with metrics (ATT&CK coverage, MTTD, FP rates) that improve over time',
          'Turning off encryption so everything is visible',
          'Blocking all traffic by default with no exceptions',
        ],
        answer: 1,
        explain:
          'An IDS is one tool; a capability is an engineered system. It starts with architecture that contains breaches and forces traffic through monitored choke points (zoning, zero-trust micro-segmentation, NAC), adds visibility everywhere it matters (on-prem taps, cloud flow/mirroring) feeding centralized telemetry, layers detection for both known (signatures, intel) and unknown (behaviour, ETA, protective DNS) — all version-controlled, tested and tuned — plus deception for clean signal, forensics-at-scale and hunting to find what got through, and DDoS mitigation for availability, with coverage/MTTD/FP metrics improving over time. Integrated, validated and measured, not a single product.',
        hint: 'Is it about one better tool, or an integrated, validated, measured system spanning architecture, visibility, detection, deception, and hunting?',
      },
    },
  ],
}

export default level
