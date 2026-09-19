import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Network Security Monitoring',
  summary:
    'Build real network detection: the NSM philosophy, Zeek for rich connection metadata, Suricata/Snort signature detection, NetFlow at scale, and the techniques to catch command-and-control beaconing, exfiltration, encrypted-traffic anomalies and lateral movement — plus how to place, tune and integrate it all with threat intelligence.',
  outcomes: [
    'Explain the NSM philosophy and data types',
    'Use Zeek metadata and Suricata/Snort signatures',
    'Analyse NetFlow/IPFIX for detection at scale',
    'Detect C2 beaconing, exfiltration and lateral movement',
    'Reason about encrypted-traffic analysis (JA3/certs)',
    'Place, tune and threat-intel-enrich network detection',
  ],
  steps: [
    {
      id: 'bnet-i-01',
      title: 'The NSM philosophy',
      read: `**Network Security Monitoring (NSM)** — the discipline articulated by Richard Bejtlich — is the practice of collecting, analysing and escalating network data to detect and respond to intrusions. Its foundational assumption is **prevention eventually fails**, so you must be able to *detect* what got through and *reconstruct* what it did. This is assume-breach, applied to the network.

## The NSM data types

NSM defines complementary kinds of data, each with a role:

- **Full content** — the actual packets (pcap). Ground truth; large; short retention. For deep investigation.
- **Session / flow data** — summaries of conversations (NetFlow-style): who, when, how much. Compact; long retention; the backbone of hunting and baselining.
- **Transaction data / logs** — protocol-level records (a DNS query, an HTTP request, a TLS handshake) — richer than flow, smaller than full content. This is Zeek's domain.
- **Extracted content** — files/objects pulled from traffic (a downloaded executable) for analysis.
- **Statistical data** — aggregate metrics and baselines.
- **Alert data** — IDS/detection output.

A mature NSM stack keeps the compact data (flow, transaction, alert) long-term for breadth, and full content selectively/short-term for depth — the trade-off from the amateur level, formalised.

## Detect, then respond

NSM is not just sensors; it is an **operational loop**: collect → detect → analyse/escalate → respond, with humans and process (the SOC). The network data feeds detection, investigation, and hunting.

## Why the network vantage endures

Even as endpoints get EDR, the network view remains vital: it is **independent of the host** (an attacker who owns a machine can't easily erase what the network sensor saw — "the network doesn't lie"), it covers devices you *can't* put an agent on (IoT, appliances, printers), and it sees relationships (who talked to whom) that a single host doesn't. NSM and endpoint detection are complementary layers.

## The rest of this level

You'll meet the core NSM tools — **Zeek** (transaction data), **Suricata/Snort** (alerts/IDS), **NetFlow** (session data) — and the detections they enable: **beaconing**, **exfiltration**, **encrypted-traffic anomalies**, and **lateral movement**. NSM is the framework that turns "we capture some packets" into "we systematically monitor the network to detect and reconstruct intrusions."`,
      sample: {
        lang: 'text',
        caption: 'The NSM data types, by cost, retention and role',
        code: `Data type         Size    Retention   Best for
-------------------------------------------------------------------
Full content(pcap) huge    hours-days  deep investigation, evidence
Transaction(Zeek)  medium  weeks-mos   what happened (dns/http/tls logs)
Session (NetFlow)  small   months+     hunting, baselining, "who->who"
Alert (IDS)        small   long        known-bad detection
Extracted files    varies  as needed   malware analysis

Strategy: keep the small/medium data LONG (breadth + hunting),
capture full content SELECTIVELY (depth on suspects/alerts).`,
        output: `NSM assumes prevention fails, so it invests in visibility to
DETECT and RECONSTRUCT. Layered data types + an operational
loop (collect->detect->analyse->respond) = the framework.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What core assumption underlies Network Security Monitoring, and how does it shape the approach?',
        options: [
          'That prevention always works, so monitoring is optional',
          'That prevention eventually fails, so you must invest in visibility — layered network data (full content, session/flow, transaction, alerts) and an operational loop — to detect intrusions that got through and reconstruct what they did',
          'That the network cannot be monitored',
          'That only endpoints matter',
        ],
        answer: 1,
        explain:
          'NSM is assume-breach for the network: since no prevention is perfect, you build the visibility to catch and understand what slips past. That means collecting complementary data types — compact session/flow and transaction data kept long-term for breadth and hunting, full content selectively for depth — and running a collect→detect→analyse→respond loop. The network view is prized because it is independent of (and un-erasable by) a compromised host and covers devices you can’t instrument.',
        hint: 'If you assume attackers will sometimes get in, what capability becomes essential?',
      },
    },

    {
      id: 'bnet-i-02',
      title: 'Zeek: turning traffic into records',
      read: `**Zeek** (formerly Bro) is the heart of many NSM deployments. It is not a signature IDS; it is a **traffic analysis framework** that watches the network and writes rich, structured **logs of everything that happens** — a connection, a DNS query, an HTTP request, a TLS handshake, a file transfer — as tidy transaction records.

## What Zeek produces

Zeek generates per-protocol logs, each a searchable record. The key ones:

- **conn.log** — every connection: src/dst, ports, protocol, bytes each way, duration, state. (Session data, enriched.)
- **dns.log** — every DNS query and answer.
- **http.log** — every HTTP request/response: host, URI, method, status, user-agent.
- **ssl.log / x509.log** — every TLS handshake and certificate details (crucial for encrypted-traffic analysis — even without decrypting, you get the server name (SNI), cert issuer/subject, validity, and JA3 fingerprints).
- **files.log** — files seen crossing the wire, with hashes.
- **weird.log**, **notice.log** — anomalies and Zeek's own alerts.

## Why this is transformative

Zeek turns the firehose of packets into **structured, queryable metadata** that is small enough to keep for a long time and rich enough to answer real questions. Instead of grepping pcap, you query logs: "every host that resolved this domain", "every TLS connection with a self-signed cert", "every HTTP request with this user-agent", "connections that moved more than 1 GB". It is the network equivalent of turning raw events into a clean, searchable table.

## Scripting and detection

Zeek has a full scripting language, so you can write custom detection logic that runs over live traffic — detect a specific behaviour, extract a field, correlate across connections, raise a notice. The community and Corelight (the commercial Zeek) provide extensive scripts and packages (e.g. detecting DNS tunnelling, extracting JA3, flagging suspicious certs).

## Where it fits

Zeek gives you the **transaction data** layer of NSM: not the raw packets, not just flow summaries, but detailed protocol-aware records of what happened. Fed into a SIEM/data store, Zeek logs are one of the richest and most cost-effective sources for both automated detection and threat hunting. If you deploy one network-monitoring tool for visibility, Zeek is often it.`,
      sample: {
        lang: 'text',
        caption: 'Zeek turns packets into queryable per-protocol records',
        code: `# conn.log (one line per connection)
ts       id.orig_h  id.resp_h    id.resp_p proto duration orig_bytes resp_bytes
...      10.0.0.5   203.0.113.9  443       tcp   21600.0  41000000   9000  <- 6h, 41MB out

# dns.log
...      10.0.0.31  query=z9q3k.tunnel.evil.example  qtype=TXT  <- tunnel?

# ssl.log  (metadata WITHOUT decrypting)
...      10.0.0.5   203.0.113.9  server_name=(none)  ja3=51c64c77e...  <- no SNI + known-bad JA3

# files.log
...      hash= SHA256:a1b2...  mime=application/x-dosexec  <- an EXE downloaded`,
        output: `Zeek converts the packet firehose into structured, searchable
records per protocol (conn/dns/http/ssl/files). Small enough to
keep long, rich enough to query and hunt - the NSM transaction layer.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does Zeek differ from a traditional signature-based IDS, and why is that valuable?',
        options: [
          'Zeek only blocks traffic; it does not log',
          'Zeek is a traffic-analysis framework that produces rich, structured per-protocol logs (connections, DNS, HTTP, TLS, files) of everything happening — queryable metadata for detection and hunting — rather than only matching packets against known-bad signatures',
          'Zeek only works on encrypted traffic',
          'Zeek and a signature IDS are the same tool',
        ],
        answer: 1,
        explain:
          'A signature IDS answers "does this match a known-bad pattern?" Zeek answers "what happened on the network?" by writing detailed, structured logs for each protocol — conn, dns, http, ssl/x509, files. That transaction data is compact enough to retain and rich enough to query for both custom detection (via Zeek scripts) and open-ended hunting, including insight into encrypted traffic (SNI, certificates, JA3) without decrypting it. It complements, rather than replaces, signature IDS.',
        hint: 'Does Zeek match signatures, or record structured metadata about everything for you to query?',
      },
    },

    {
      id: 'bnet-i-03',
      title: 'Signature IDS: Snort and Suricata',
      read: `Where Zeek describes *what happened*, a **signature IDS/IPS** answers *"does this traffic match a known attack?"* **Snort** (the classic) and **Suricata** (modern, multi-threaded) are the standard engines. They inspect traffic against **rules** and raise **alerts** (IDS) or **block** (IPS).

## IDS vs IPS

- **IDS** (Intrusion **Detection** System) — **passive**: watches a copy of the traffic (via SPAN/tap) and alerts. It cannot drop packets, so it never breaks traffic, but it only *tells* you.
- **IPS** (Intrusion **Prevention** System) — **inline**: traffic passes *through* it, so it can **drop** malicious packets in real time. More powerful, but a false positive can block legitimate traffic, and it can become a bottleneck or a single point of failure.

The trade-off: IPS prevents but risks disruption; IDS is safe but only detects. Many deploy IDS first (tune it), then selectively enable IPS blocking for high-confidence rules.

## Rules

A Suricata/Snort rule has an **action**, a **header** (protocol, source/dest, ports, direction), and **options** (what to match — content strings, PCRE, flags — plus metadata like a message, a signature ID (sid), and a reference/CVE). Rulesets come from **Emerging Threats (ET)** and **Snort/Talos**, covering known exploits, malware C2 patterns, scan signatures, and policy violations.

## Strengths and limits

- **Strength:** precise, immediate detection of *known* threats — a specific exploit, a known malware's C2 traffic, a known-bad user-agent. Well-mapped to CVEs and ATT&CK.
- **Limit:** it catches the *known*. Novel attacks with no signature slip past, and heavy **encryption** blinds content-matching rules (you can still match on unencrypted parts and metadata). This is why signature IDS pairs with Zeek (metadata/hunting) and anomaly methods (later) — defence in depth in detection.

## Tuning is everything

Out of the box, a full ruleset generates enormous noise. You **tune**: disable rules irrelevant to your environment, suppress known false positives, and prioritise. An untuned IDS drowning analysts is the same alert-fatigue failure as elsewhere — a noisy IDS is worse than a focused one. Suricata also does more than signatures (it can emit Zeek-like protocol logs and extract files), blurring the line, but its signature engine is the classic role.

Snort/Suricata give you the **alert** layer of NSM: fast, precise detection of known-bad, that you tune and place (passive IDS or inline IPS) according to your risk tolerance.`,
      sample: {
        lang: 'text',
        caption: 'A Suricata rule and the alert it raises',
        code: `# Rule: detect a known malware user-agent in HTTP
alert http $HOME_NET any -> $EXTERNAL_NET any (
  msg:"ET MALWARE Suspicious User-Agent (EvilBot)";
  flow:established,to_server;
  http.user_agent; content:"EvilBot/1.0";
  classtype:trojan-activity; sid:2099001; rev:1;
  metadata: attack_target Client_Endpoint;
)`,
        output: `[**] [1:2099001:1] ET MALWARE Suspicious User-Agent (EvilBot) [**]
[Classification: A Network Trojan was Detected] [Priority: 1]
10.0.0.31:51002 -> 203.0.113.9:80
# IDS: alerts (passive). IPS: same rule with action "drop" blocks
# it inline. Tune rulesets or drown in false positives.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the fundamental trade-off between deploying an IDS (passive) versus an IPS (inline)?',
        options: [
          'IDS is always better than IPS',
          'An IPS sits inline and can block malicious traffic in real time (prevention) but a false positive can disrupt legitimate traffic and it can be a bottleneck/failure point; an IDS watches passively and only alerts (never breaks traffic) but cannot stop an attack itself',
          'IPS cannot detect anything',
          'They are identical except in name',
        ],
        answer: 1,
        explain:
          'Placement defines the trade-off. Inline (IPS) means traffic passes through it, so it can drop attacks as they happen — real prevention — but a false positive blocks real traffic and the device becomes a potential bottleneck or single point of failure. Passive (IDS) watches a copy via SPAN/tap, so it never disrupts traffic but can only alert, not stop. A common approach is to run as IDS, tune thoroughly, then enable inline blocking selectively for high-confidence rules.',
        hint: 'Which one can drop packets (and thus risk blocking good traffic), and which only observes a copy?',
      },
    },

    {
      id: 'bnet-i-04',
      title: 'NetFlow and flow analysis',
      read: `**Flow data** (NetFlow, IPFIX, sFlow) is the workhorse of large-scale network detection. A flow record summarises one conversation — **source, destination, ports, protocol, byte and packet counts, start/end time, TCP flags** — *without the content*. Routers, switches and firewalls generate it natively, so you get network-wide visibility cheaply.

## Why flow scales where capture cannot

Full packet capture of a large network is impossibly large to keep for long. Flow is tiny by comparison (a record per conversation, not per packet), so you can retain **months** of it across the *entire* network. That long, broad history is exactly what detection and hunting need: you can answer "did *any* host ever talk to this IP, in the last 90 days?" — impossible with short-retention pcap.

## What flow reveals (without content)

Even with no payload, flow exposes powerful signals:

- **Volume & direction** — bytes each way per conversation → **exfiltration** (a host sending far more than usual/normal) and asymmetry flips (a server suddenly uploading).
- **Timing & periodicity** — regular, evenly spaced connections → **beaconing** to a C2 (next step). Flow's timestamps and small-record shape are ideal for this.
- **Fan-out / fan-in** — one source to many destinations (scan/sweep, or worm spread), or many to one (DDoS). Relationship patterns pop out.
- **Duration & size distributions** — long-lived low-volume connections (interactive C2), or many tiny identical flows.
- **New relationships** — a host talking to something it never has before.

## Baselining with flow

Because you have long history, you can **baseline** each host's normal (peers, ports, volumes, timing) and alert on deviation — the statistical, anomaly-based detection that catches what signatures miss. "This database has never before connected outbound to a public IP" or "this workstation's outbound volume is 100× its 90-day norm" are flow-driven detections.

## Tools

NetFlow collectors/analysers (SiLK, nfdump/nfsen, Elastiflow, commercial NDR) ingest and query flow. The mental model: **flow is the network's session/metadata layer at scale** — the map of who-talked-to-whom-and-how-much across everything, kept long enough to hunt in. It won't tell you *what* was said (that needs Zeek transaction data or a pcap), but it is unmatched for volume-, timing- and relationship-based detection across the whole network.`,
      sample: {
        lang: 'text',
        caption: 'Flow answers questions pcap cannot keep long enough to ask',
        code: `Query: any host -> 203.0.113.9 in the last 90 days? (flow, retained)
  10.0.0.31  ->  203.0.113.9:443   2024-04-02 .. 2024-06-18
     6,400 flows, ~180 bytes each, one every ~60s  <- BEACONING

Query: outbound volume vs each host's 90-day baseline
  10.0.0.5 (DB)  today: 14 GB out   baseline: ~5 MB/day  <- EXFIL (2800x)

Query: fan-out (distinct dst per source, 5 min)
  10.0.0.9 -> 512 hosts on :445    <- horizontal SMB sweep / worm`,
        output: `No payload, huge insight: beaconing (timing), exfiltration
(volume vs baseline), sweeps (fan-out), new relationships.
Flow is small enough to keep for months across the WHOLE network -
the scale that detection and hunting need.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Flow data (NetFlow/IPFIX) contains no packet payload. Why is it still one of the most valuable data sources for network detection at scale?',
        options: [
          'It shows the full content of every connection',
          'Its compact per-conversation summaries (addresses, ports, bytes, timing, flags) are small enough to retain for months across the entire network, enabling volume-, timing- and relationship-based detection (exfiltration, beaconing, scans, new connections) and long-lookback hunting that short-retention full capture cannot support',
          'Payload is the only useful part of traffic',
          'Flow can only be kept for a few hours',
        ],
        answer: 1,
        explain:
          'Even without content, flow exposes volume/direction (exfiltration), periodicity (beaconing), fan-out/fan-in (scans, DDoS), and novel relationships — and because each record summarises a whole conversation, it is tiny enough to keep for months across every device. That long, network-wide history powers baselining and hunting ("did anything ever talk to this IP in 90 days?") that full packet capture, being huge and short-lived, simply cannot. Content still matters, but for that you turn to Zeek logs or selective pcap.',
        hint: 'What can you do with months of who-talked-to-whom-and-how-much across the whole network, even without payload?',
      },
    },

    {
      id: 'bnet-i-05',
      title: 'Detecting command-and-control beaconing',
      read: `After a host is compromised, the malware "phones home" to its **command-and-control (C2)** server for instructions. It usually does so on a **schedule** — checking in periodically — which produces **beaconing**: regular, repeated connections that are one of the most detectable behaviours in network traffic.

## Why beaconing is detectable

Malware must call home to be useful, and it typically does so at intervals (every 30s, 60s, 5 min, sometimes hourly). That **periodicity** is unnatural: human/browser traffic is bursty and irregular, but a beacon is a metronome. Over time, the pattern emerges even through encryption, because you don't need the content — just the **timing and size** of the connections (perfect for flow/Zeek conn data).

## The signals

- **Regular intervals** — connections to the same destination at consistent time gaps. Compute the deltas between successive connections to a destination per host; low variance (tight clustering around one interval) is a beacon.
- **Consistent, small size** — check-ins are often small and similar in size ("anything for me?" / "no"). Uniform small transfers repeating is a tell.
- **Long-lived relationship** — the same host↔destination pair persisting for hours/days/weeks.
- **Jitter** — sophisticated malware adds random **jitter** (e.g. ±20%) to the interval to evade naive "exactly every 60s" detection. So detection looks for *approximate* periodicity / low relative variance, and can use statistics (autocorrelation, FFT, interval histograms) rather than exact matches.

## Detection approaches

- **Interval analysis** — per (src,dst), gather connection timestamps, compute inter-arrival deltas, and flag distributions tightly clustered around a value (allowing for jitter). Tools like **RITA** (Real Intelligence Threat Analytics) do exactly this over Zeek data, scoring beacon likelihood.
- **Combine signals** — periodicity + small uniform size + long duration + a suspicious/new destination = high confidence.
- **Enrich the destination** — is it a new domain, a known-bad IP, a domain with no other users? Beaconing to a well-known CDN might be software update checks (benign); beaconing to a random VPS is C2.

## Why it matters

Beaconing detection catches the compromise *after* initial access but *before* (or during) the attacker's actions — a crucial window. And because it relies on behaviour (timing/size) rather than content, it works even against encrypted C2 (HTTPS beacons) that signature IDS can't read. It is a flagship example of behaviour-based network detection: the malware's need to regularly phone home is a weakness you exploit.`,
      sample: {
        lang: 'text',
        caption: 'Beaconing: a metronome hiding in the connection log',
        code: `Connections 10.0.0.31 -> 203.0.113.9:443 (from Zeek conn.log):
  12:00:03   198 bytes
  12:01:04   201 bytes      deltas between connections:
  12:02:02   197 bytes        ~61s, ~58s, ~62s, ~60s, ~59s...
  12:03:04   200 bytes      -> tightly clustered ~60s (low variance)
  12:04:03   199 bytes      -> uniform small size (~200 bytes)
  ... for 3 days              -> long-lived pair, suspicious dest
  (RITA beacon score: 0.97)

Human/browser traffic is bursty and irregular. A metronome
like this = automated check-in = C2 beaconing.`,
        output: `Detect on TIMING (regular intervals, allowing for jitter) and
SIZE (small, uniform), not content - so it catches even
encrypted (HTTPS) C2. The malware MUST phone home; that
regularity is the weakness. (RITA/flow/Zeek do this at scale.)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can command-and-control "beaconing" be detected even when the C2 traffic is encrypted (e.g. HTTPS)?',
        options: [
          'Encryption can always be broken by the IDS',
          'Beaconing is detected from timing and size patterns — regular, repeated check-ins of consistent (often small) size — rather than content, so the periodicity is visible in flow/connection metadata regardless of whether the payload is encrypted',
          'Encrypted traffic cannot beacon',
          'The malware sends its password in the clear',
        ],
        answer: 1,
        explain:
          'Beaconing detection relies on behaviour, not payload: malware phones home on a schedule, producing connections to the same destination at regular intervals with consistent, often small sizes. Those timing and size patterns are visible in flow and Zeek conn data even when the content is TLS-encrypted. Sophisticated beacons add jitter, so detection looks for approximate periodicity (statistically) and combines it with size, duration, and destination reputation — catching C2 that content-based signature IDS cannot read.',
        hint: 'What about repeated check-ins is visible even without reading the payload?',
      },
    },

    {
      id: 'bnet-i-06',
      title: 'Detecting exfiltration and tunnelling',
      read: `The amateur level introduced exfiltration shapes; here you detect them **systematically** with NSM data, including the covert channels attackers use to slip data past controls.

## Volume-based detection (the direct route)

Using flow/Zeek conn data with baselines:

- **Outbound volume anomaly** — a host sending far more than its baseline, especially a server that normally sends little, or to a new/external destination. \`orig_bytes\` in conn.log or byte counts in flow, compared to the host's history.
- **Asymmetry flip** — a machine that normally receives now predominantly sends.
- **New large-transfer destinations** — a big upload to a cloud-storage/paste site or an unfamiliar IP.

## Covert channels (the sneaky route)

Attackers exfiltrate through protocols usually allowed out, evading volume rules by hiding in "normal" traffic:

- **DNS tunnelling** — data encoded in query names (long, high-entropy subdomains), often TXT/NULL records, at high frequency to one domain. Detect via Zeek dns.log: query length, entropy, count of unique subdomains per domain, query rate. A domain receiving thousands of long random subdomain queries from a host is tunnelling.
- **ICMP tunnelling** — data in ping payloads (large/varying payloads, steady rate — from the amateur level).
- **HTTP(S) exfil** — data in POST bodies, headers, or as "images"; over HTTPS you rely on volume/destination/timing since content is hidden.
- **Steganography / protocol abuse** — data hidden in fields of other protocols.

## Entropy and statistics

A powerful cross-cutting signal: **entropy**. Encoded/encrypted/compressed exfiltrated data looks random (high entropy). Long, high-entropy DNS names or unexpectedly high-entropy fields suggest hidden data. Combined with frequency and destination, entropy analysis flags tunnelling that volume thresholds alone miss.

## The detection mindset

Exfiltration detection is: **baseline normal outbound behaviour** (volume, destinations, protocol usage per host) and flag deviations, **plus** watch the classic covert channels (DNS/ICMP) for their specific signatures (length, entropy, frequency). Because exfiltration is the attacker's payoff, catching it — even late, even in a covert channel — can prevent the breach's real damage. Egress filtering (limiting outbound channels) both reduces the options and makes the remaining traffic easier to monitor. And it's fundamentally a network detection: the data has to leave over the wire, where NSM sees it.`,
      sample: {
        lang: 'text',
        caption: 'DNS tunnelling detection via Zeek dns.log statistics',
        code: `Per-domain analysis of dns.log for host 10.0.0.31:

  domain: tunnel.evil.example
    queries: 8,412 in 1h        <- extreme volume to one domain
    unique subdomains: 8,401    <- almost all different
    avg query-name length: 58   <- long (normal is short)
    name entropy: 4.4 bits/char <- high (looks random/encoded)
    qtype: mostly TXT           <- TXT carries more data

  domain: shop.example.com
    queries: 12   subdomains: 1   len: 15   entropy: 2.9  (normal)`,
        output: `DNS tunnelling signature: many long, high-entropy, unique
subdomains of ONE domain, high frequency, often TXT. Volume +
entropy + frequency together flag the covert channel that a
simple byte-count threshold would miss (DNS packets are small).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "entropy" (randomness) of DNS query names a useful signal for detecting DNS tunnelling, alongside query length and frequency?',
        options: [
          'High entropy means the network is fast',
          'Data hidden in DNS names is encoded/encrypted/compressed, which makes the subdomains look random (high entropy); normal domain names are low-entropy and human-readable, so unusually high-entropy, long, frequent subdomains of one domain indicate encoded data being smuggled out',
          'Entropy only matters for encrypted traffic',
          'Low entropy always means tunnelling',
        ],
        answer: 1,
        explain:
          'Legitimate domain labels are short and word-like (low entropy). To carry data, tunnelling encodes it into subdomain labels, which then look random — high entropy — and are long and numerous. Measuring name entropy (bits per character) alongside length and query frequency to a single domain cleanly separates tunnelling from normal lookups, catching a covert channel that byte-volume thresholds miss because individual DNS packets are small. Entropy is a general tell for hidden/encoded data in fields that are normally human-readable.',
        hint: 'What does encoded/encrypted data look like statistically, compared with a real domain name?',
      },
    },

    {
      id: 'bnet-i-07',
      title: 'Making sense of encrypted traffic',
      read: `Most traffic is now encrypted (TLS), so content-based detection is increasingly blind. But encryption does **not** hide everything — a great deal of useful signal remains in the parts that are *not* encrypted and in the *behaviour*. Learning to defend without decrypting is now essential.

## What's still visible in TLS

The TLS handshake (before encryption kicks in) and the connection's shape expose:

- **SNI (Server Name Indication)** — the hostname the client is connecting to, sent in the clear in the ClientHello. So you often know *which site/domain* even for HTTPS (Zeek ssl.log captures it). (Encrypted SNI / ECH is emerging and will erode this — a growing challenge.)
- **The certificate** — issuer, subject, validity dates, whether self-signed. A self-signed cert, a cert for a random string, a very fresh cert, or a mismatch between cert and destination are suspicious (Zeek x509.log).
- **JA3 / JA3S fingerprints** — a hash of the TLS ClientHello parameters (versions, cipher suites, extensions) that fingerprints the **client software**, and JA3S for the server side. Malware families and tools (Cobalt Strike, specific bots) often have distinctive JA3s that differ from browsers, so you can spot "this looks like tool X's TLS" without decrypting. **JARM** actively fingerprints a server's TLS stack similarly.
- **Behaviour/metadata** — timing (beaconing), sizes, direction/volume (exfiltration), destination reputation — all work regardless of encryption (previous steps).

## Detection without decryption

Combine these: a connection with **no/odd SNI**, a **self-signed or suspicious cert**, a **malware-associated JA3**, going to a **new/foreign IP**, with **beacon-like timing** — that's high-confidence C2 even though you never saw the plaintext. This "encrypted traffic analysis (ETA)" is a core modern skill.

## TLS interception (and its costs)

Some organisations **decrypt** at a controlled proxy (TLS inspection / SSL interception): the proxy terminates TLS, inspects, re-encrypts. It restores content visibility for the traffic it handles, but at real cost — a complex trusted-proxy deployment, privacy and legal implications, breakage of certificate pinning and some apps, and the proxy itself becomes a high-value target holding decrypted data. It's used selectively (e.g. for outbound web through a gateway), not universally, and cannot touch traffic that bypasses it.

## The mindset

Assume you usually *cannot* read the content, and get very good at the metadata and behaviour that remain: SNI, certificates, JA3/JARM, timing, volume, and destination reputation. Encryption protects users (good) and hides attackers (hard), but it does not make the network opaque — a skilled defender reads a great deal from the visible edges of encrypted traffic.`,
      sample: {
        lang: 'text',
        caption: 'Fingerprinting malicious TLS without decrypting it (Zeek ssl.log)',
        code: `Connection 10.0.0.31 -> 45.77.x.x:443  (HTTPS, encrypted)
  server_name (SNI): (empty)          <- browsers always send SNI
  cert: self-signed, CN="localhost"   <- not a real service
  validity: issued 2 days ago         <- very fresh
  ja3: 51c64c77e60f3980eea90869b68c58a8  <- known Cobalt Strike JA3
  timing: connection every 60s +/-10%   <- beaconing

None of the payload was decrypted. SNI + cert + JA3 + timing +
destination together = high-confidence C2.`,
        output: `Encryption hides content, not the handshake or the behaviour.
SNI (which site), certificate details, JA3/JARM (which software),
and timing/volume let you detect C2 and anomalies WITHOUT
decrypting. TLS interception restores content but at high cost.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is a JA3 fingerprint, and why is it useful for detecting malware in encrypted traffic?',
        options: [
          'It decrypts the TLS session',
          'It is a hash of the TLS ClientHello parameters (versions, cipher suites, extensions) that fingerprints the client software; because malware/tools often present distinctive TLS characteristics that differ from browsers, a known-bad JA3 flags malicious TLS without decrypting the content',
          'It is the server’s IP address',
          'It only works on unencrypted traffic',
        ],
        answer: 1,
        explain:
          'JA3 hashes the specific way a client negotiates TLS (its ClientHello fields), which tends to be characteristic of the software making the connection. Malware and offensive tools (e.g. Cobalt Strike) frequently have distinctive JA3 hashes unlike normal browsers, so matching a connection’s JA3 against known-bad fingerprints identifies malicious TLS clients without any decryption. Combined with SNI, certificate details, timing and destination, it enables strong encrypted-traffic analysis — reading the visible edges of encrypted connections.',
        hint: 'It fingerprints how the client speaks TLS. What does that reveal about the software, without reading the payload?',
      },
    },

    {
      id: 'bnet-i-08',
      title: 'Detecting lateral movement on the wire',
      read: `The Windows track detected lateral movement from host logs; the network sees it too, often across the whole environment at once. Because lateral movement is fundamentally hosts connecting to *other internal hosts* in unusual ways, NSM data (flow + Zeek) is excellent at catching it.

## The network signatures of lateral movement

- **Internal-to-internal connections that are abnormal** — workstations connecting to *each other* (normally they talk to servers, not peers) on admin/SMB/RPC/WinRM ports (445, 135, 139, 5985, 3389). East-west traffic that breaks the normal client-server pattern is the core tell.
- **Admin-protocol fan-out** — one internal host connecting to *many* others on 445/135/5985/3389 in a short window (an attacker sweeping/spreading, or a tool like PsExec/WMI hitting many targets). Flow fan-out analysis (from scan detection) applies directly.
- **SMB/RPC to many hosts** — file-share and remote-service protocols are the classic movement vectors; a host suddenly using them broadly is suspicious.
- **New internal relationships** — host A has never talked to host B before, now does on an admin port. With flow history you can flag first-time internal pairs on sensitive ports.
- **RDP (3389) between workstations** — interactive movement.
- **Kerberos/auth anomalies on the wire** — Zeek can log Kerberos and SMB; unusual ticket/service access patterns (the AD attacks) have network reflections.

## Why the network view helps

Host logs show movement *on each machine*; the network shows the **relationships across all machines at once**, so you see the *shape* of the spread — a source touching 50 peers on 445 is obvious in flow even if you didn't have logs on all 50 hosts. It also covers hosts you can't instrument. And segmentation (amateur level) makes this both harder for the attacker and *louder* for you, because inter-segment movement must cross monitored chokepoints.

## Detection approach

- **Baseline east-west traffic** — learn the normal internal connection graph (which hosts talk to which, on what ports). Lateral movement is a deviation: new edges, workstation-to-workstation admin traffic, fan-out on admin ports.
- **Watch the admin ports specifically** — 445/135/139/5985/3389 internal usage is where movement rides; alert on abnormal patterns there.
- **Correlate with host telemetry** — the network says "A connected to B, C, D on 445"; the host logs (Windows track) confirm the remote execution. Together they're conclusive.

Lateral movement is the attacker turning one foothold into many; on the network it shows as abnormal internal (east-west) connections, especially admin-protocol fan-out. Baselining the internal connection graph and watching the admin ports is how NSM catches an attacker on the move — a complement to the host-based detection you built earlier.`,
      sample: {
        lang: 'text',
        caption: 'Lateral movement as an abnormal east-west pattern (flow)',
        code: `Internal (east-west) flow, one hour:

  Normal: workstations -> servers on app ports; peers rarely talk.

  ANOMALY:
  10.0.0.31 (a workstation) -> :445 on 10.0.0.32, .33, .34 ... .90
     = one workstation hitting 47 PEER workstations on SMB
     = lateral movement / worm spread (never normal for a workstation)

  10.0.0.31 -> :3389 on 10.0.0.50 (a server it never RDP'd before)
     = new admin relationship on RDP`,
        output: `Lateral movement = abnormal INTERNAL connections, especially
admin-protocol (445/135/5985/3389) fan-out and new host-to-host
pairs. The network shows the SHAPE of the spread across all
hosts at once; correlate with host logs to confirm execution.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'On the network, what pattern is a strong indicator of lateral movement, and why is the network view especially useful for spotting it?',
        options: [
          'A host downloading a large file from the internet',
          'Abnormal internal (east-west) connections — especially one host reaching many peers on admin protocols (SMB/445, RPC/135, WinRM/5985, RDP/3389) or new host-to-host pairs on those ports — and the network view shows the shape of the spread across all hosts at once, including ones you cannot instrument',
          'Normal client-to-server web traffic',
          'Encrypted traffic to a known CDN',
        ],
        answer: 1,
        explain:
          'Lateral movement is hosts connecting to other internal hosts in ways that break the normal client-server pattern — a workstation touching many peers on SMB/RPC/WinRM/RDP, or new relationships on admin ports. The network sees the whole internal connection graph simultaneously, so the fan-out shape is obvious even without logs on every target, and it covers un-instrumented devices. Baselining east-west traffic and watching the admin ports, correlated with host telemetry that confirms remote execution, catches an attacker moving through the environment.',
        hint: 'Do workstations normally connect to each other on SMB/RDP, and what does the network reveal that per-host logs alone do not?',
      },
    },

    {
      id: 'bnet-i-09',
      title: 'Threat intelligence on the network',
      read: `Detection sharpens when you know what to look for. **Threat intelligence** — knowledge of attacker infrastructure and behaviour — plugs directly into network monitoring, letting you flag or block traffic to known-bad destinations and recognise known malicious patterns.

## Network-relevant intelligence

- **IOCs (Indicators of Compromise)** — concrete network artefacts: malicious **IP addresses**, **domains**, **URLs**, **JA3 hashes**, **file hashes** (for files extracted from traffic). These feed directly into IDS rules, DNS/proxy blocklists, and flow/Zeek matching.
- **Reputation feeds** — categorised badness (known C2, malware distribution, phishing, Tor exit nodes, bulletproof hosting).
- **TTPs** — behavioural knowledge (this actor beacons every 60s over HTTPS with this JA3; uses DNS tunnelling; scans then pivots on 445) that shapes behavioural detections.

## How it integrates

- **Match against telemetry** — automatically compare your DNS/Zeek/flow/proxy logs against IOC feeds: did any host resolve a known-bad domain, connect to a known C2 IP, or present a known-bad JA3? This is cheap, high-value, and catches known threats fast.
- **Block at control points** — feed domains/IPs into DNS sinkholing (RPZ), proxy/firewall blocklists, and IPS rules to *prevent* connections to known-bad, not just detect them.
- **Enrich alerts** — when something fires, intel adds context: is this IP known-bad, newly registered, associated with an actor? That turns a raw alert into a prioritised, understandable one.

## The Pyramid of Pain, on the network

The same lesson as the host tracks: **IOCs are brittle** — attackers rotate IPs, domains and hashes cheaply, so IOC matching catches the careless and the known but not the adaptive. **TTP/behavioural** detections (beaconing, tunnelling, lateral-movement patterns from this level) are more durable because they target *how* attackers operate. So use intel both ways: IOC feeds for fast, cheap known-bad matching *and* behavioural detection for the unknown — don't rely on IOCs alone.

## Sources and sharing

Intel comes from commercial feeds, open-source (abuse.ch, ThreatFox, URLhaus, feodotracker), government (CISA), ISACs (industry sharing groups), and your own incidents (an IOC from one intrusion detects the next). Formats like **STIX/TAXII** and tools like **MISP** standardise and automate sharing/ingestion so feeds flow into your detection stack continuously.

## The payoff

Threat intelligence makes your network monitoring **specific to real threats**: you detect and block the infrastructure attackers are actually using, prioritise alerts with context, and recognise known actors' patterns — while your behavioural detections cover what intel doesn't know yet. It's the difference between generic monitoring and monitoring aimed at the adversaries that matter, integrated automatically into the NSM data you're already collecting.`,
      sample: {
        lang: 'text',
        caption: 'Matching network telemetry against threat-intel IOCs',
        code: `IOC feed (e.g. ThreatFox / MISP): known C2 infrastructure
  domain: c2.evil.example      ip: 45.77.10.20      ja3: 51c64c77...

Automatic match against your NSM data:
  dns.log:  10.0.0.31 resolved c2.evil.example        MATCH -> alert
  conn.log: 10.0.0.31 -> 45.77.10.20:443              MATCH -> alert
  ssl.log:  ja3=51c64c77...                           MATCH -> alert
  -> and BLOCK at DNS (RPZ sinkhole) + proxy/firewall + IPS

Behavioural (TTP) layer still runs for UNKNOWN infrastructure:
  beaconing/tunnelling/lateral-movement detections (Pyramid of Pain)`,
        output: `IOC feeds catch known-bad fast and cheaply (match DNS/flow/
ssl/proxy against them; block at control points). But IOCs are
brittle (attackers rotate them), so pair with durable
behavioural detection for the unknown. Use both, not just IOCs.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should network threat intelligence combine IOC matching (known-bad IPs/domains/hashes) with behavioural (TTP) detection, rather than relying on IOCs alone?',
        options: [
          'IOCs are useless and should be ignored',
          'IOC matching quickly and cheaply catches known-bad infrastructure but is brittle — attackers rotate IPs, domains and hashes easily — so it misses adaptive/unknown threats; behavioural detections (beaconing, tunnelling, lateral movement) target how attackers operate and are far more durable, so the two together cover both known and unknown',
          'Behavioural detection is always wrong',
          'IOCs never change, so they are sufficient alone',
        ],
        answer: 1,
        explain:
          'IOC feeds let you match telemetry against — and block — the exact infrastructure attackers are known to use, which is fast and valuable. But per the Pyramid of Pain, IPs/domains/hashes are cheap for attackers to change, so IOC-only detection catches the known and careless and misses the adaptive. Behavioural/TTP detection (the beaconing, tunnelling and lateral-movement methods from this level) targets the harder-to-change *how*, covering unknown infrastructure. Combining brittle-but-precise IOCs with durable behavioural detection gives coverage of both known and novel threats.',
        hint: 'Which is cheaper for an attacker to change — their IPs/domains, or their whole method of operating?',
      },
    },

    {
      id: 'bnet-i-10',
      title: 'Sensor placement and tuning',
      read: `A detection system is only as good as **where it can see** and **how well it's tuned**. Two practical questions decide whether your NSM actually works: placement (visibility) and tuning (signal quality).

## Placement: you can't detect what you can't see

- **Choke points** — put sensors where important traffic converges: the **internet edge** (all in/out traffic), **between segments** (east-west, for lateral movement — the segmentation payoff), in front of **critical assets** (the server VLAN, the DMZ).
- **Getting the traffic** — on a switched network you don't see others' traffic by default. Use a **SPAN/mirror port** (switch copies traffic to the sensor — convenient, but can drop under load and miss errors) or a **network tap** (a hardware device that copies traffic reliably, even at full line rate — preferred for critical links).
- **Encryption/decryption points** — placing web inspection at the proxy where TLS is terminated (if you do interception) gives content visibility there.
- **The blind-spot trap** — traffic that never crosses your sensor is invisible: direct host-to-host traffic within an unmonitored segment, VPN/encrypted tunnels, cloud traffic that doesn't traverse on-prem, a new link nobody instrumented. Map your visibility honestly; attackers exploit the gaps. (This is why segmentation helps: it forces traffic through monitored choke points.)

## Tuning: signal vs noise

An untuned IDS/detection system drowns analysts in false positives — the alert-fatigue failure that makes good detection worthless (the SOC lesson). Tuning is continuous:

- **Disable irrelevant rules** — signatures for software/protocols you don't run.
- **Suppress/allow-list known-good** — your own vulnerability scanners, monitoring systems, backup jobs, and benign periodic traffic (which can look like beaconing!). Software update checks beacon to CDNs — allow-list them.
- **Baseline per environment** — thresholds and anomaly models must fit *your* normal; someone else's tuning won't fit.
- **Prioritise** — not every alert deserves equal attention; rank by confidence and asset criticality.
- **Track rule performance** — true/false-positive rates per rule; fix or retire noisy ones. Detections are code you maintain.

## The balance

- **Placement** determines coverage — the attacks you *could* see. Gaps here are silent failures.
- **Tuning** determines whether you *notice* what you see, or drown in noise.

Both are ongoing engineering, not one-time setup. A perfectly tuned sensor in the wrong place misses the attack; a well-placed but noisy sensor buries it. Get the traffic to the right places (taps/SPAN at choke points, no unmonitored gaps), then relentlessly tune for high-signal alerts — that's what turns NSM tools into actual detection.`,
      sample: {
        lang: 'text',
        caption: 'Placement (coverage) and tuning (signal) both decide success',
        code: `PLACEMENT — get the traffic to the sensor at choke points:
  Internet edge (TAP)  -> all in/out traffic
  Inter-segment (SPAN) -> east-west / lateral movement
  DMZ + server VLAN    -> critical assets
  BLIND SPOTS to map: intra-segment host-to-host, VPN tunnels,
    cloud traffic not traversing on-prem, uninstrumented links

TUNING — make the alerts worth reading:
  disable rules for software you don't run
  allow-list your vuln scanner (else it looks like constant attacks)
  allow-list update-check "beacons" to known CDNs
  baseline thresholds to YOUR normal; track per-rule FP rate`,
        output: `Placement = what you CAN see (coverage; gaps are silent misses).
Tuning = whether you NOTICE it (signal vs alert-fatigue noise).
Both are continuous engineering. A great sensor in the wrong
place, or a well-placed noisy one, both fail.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A network sensor is deployed and running, but a lateral-movement attack between two hosts is never detected. Assuming the detection logic is sound, what is the most likely explanation?',
        options: [
          'The attack was encrypted',
          'A placement/visibility gap — the traffic between those hosts never crossed the sensor (e.g. it stayed within an unmonitored segment), so the sensor could not see it; you can only detect traffic that reaches your sensor, which is why choke-point placement and mapping blind spots are essential',
          'The IDS rules were too aggressive',
          'The sensor was too well tuned',
        ],
        answer: 1,
        explain:
          'Detection can only act on traffic the sensor actually sees. If two hosts communicate within a segment (or over a path) that no SPAN/tap feeds to the sensor, their traffic is invisible regardless of how good the detection logic is — a silent visibility gap. This is why placement at choke points (edge, inter-segment, critical assets), reliable traffic access (taps/SPAN), honest blind-spot mapping, and segmentation that forces traffic through monitored points are as important as the detection rules themselves.',
        hint: 'If the logic is fine but nothing fired, did the relevant traffic ever reach the sensor?',
      },
    },

    {
      id: 'bnet-i-11',
      title: 'Building an NSM stack',
      read: `You've met the pieces; now see how they fit into a working **NSM stack** — the integrated system that collects, detects, stores and lets you hunt across network data. Understanding the architecture lets you build (or reason about) real network monitoring.

## The layers of a stack

1. **Traffic access** — taps/SPAN at choke points feed traffic to the sensors (placement, previous step).
2. **Sensors** — the tools that turn traffic into data:
   - **Zeek** → transaction logs (conn/dns/http/ssl/files…).
   - **Suricata/Snort** → alerts (and Suricata can also emit protocol logs + extract files).
   - **Flow exporters** (from routers/firewalls, or the sensor) → NetFlow/IPFIX.
   - Optional **full-capture** (e.g. **Arkime/Moloch**, **Stenographer**) → searchable pcap for a retention window.
3. **Collection & storage** — ship all of it to a central store/SIEM (Elastic, Splunk, etc.), normalised, indexed and searchable. Long retention for logs/flow, shorter for full content.
4. **Detection** — IDS alerts, Zeek/Suricata scripts, SIEM correlation rules (Sigma), threat-intel matching, and behavioural/anomaly detection (beaconing, exfil).
5. **Analysis & response** — dashboards, hunting queries, and the SOC workflow (triage → investigate → respond).

## Ready-made distributions

You don't have to assemble it from scratch. **Security Onion** is a free, popular Linux distro that bundles Zeek + Suricata + full capture (Stenographer) + the Elastic stack + hunting tools (like an integrated NSM appliance) — an excellent way to learn and even run real NSM. Commercial NDR platforms package similar capability with vendor detection content.

## How the data works together in practice

The layers complement each other in an investigation:

- An **IDS alert** (Suricata) or an **intel match** flags something.
- **Zeek transaction logs** give the context (what domain, what cert, what file).
- **Flow** provides the long-term relationship history and volume/timing (beaconing, exfil).
- **Full capture** (if retained) gives the ground-truth packets for the smoking gun.
- **Correlation** in the SIEM ties it to host telemetry and identity.

## The build mindset

An NSM stack is layered visibility feeding centralized detection and hunting. Start with the highest-value, lowest-cost layers — **flow and Zeek logs** (broad, cheap, long-retention) plus **Suricata** (known-bad) and **DNS logging** — centralized and searchable, with **selective full capture** for depth. Place sensors at choke points, tune continuously, and enrich with threat intel. That stack — whether hand-built, Security Onion, or commercial NDR — is what operationalises everything in this level into a system that actually detects and lets you investigate intrusions across the network.`,
      sample: {
        lang: 'text',
        caption: 'An NSM stack: traffic in, detection and hunting out',
        code: `[ TAP/SPAN at choke points ]
        |
   +----+----------------------------+
   |         SENSORS                 |
   |  Zeek (logs)  Suricata (alerts) |
   |  flow export  full capture(opt) |
   +----+----------------------------+
        |  ship + normalise
        v
   [ SIEM / data store: Elastic/Splunk ]  <- long retention (logs/flow)
        |   detection: IDS + Sigma + intel + behavioural
        v
   [ Dashboards + hunting + SOC workflow ]
# Security Onion bundles Zeek+Suricata+capture+Elastic ready to go.`,
        output: `Layers complement: an alert/intel-match flags it, Zeek logs give
context, flow gives history + timing/volume, full capture gives
the packets, correlation ties in host+identity. Start with flow +
Zeek + Suricata + DNS, centralized; add capture selectively.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In an NSM stack, how do the different data layers (IDS alerts, Zeek logs, flow, full capture) work together during an investigation?',
        options: [
          'You only ever need one of them',
          'They complement each other: an IDS alert or intel match flags something, Zeek transaction logs supply context (domain, cert, file), flow provides long-term relationship history and volume/timing, and full capture (if retained) gives the ground-truth packets — correlated centrally and tied to host/identity data',
          'They all contain identical information',
          'Full capture makes all the other layers unnecessary',
        ],
        answer: 1,
        explain:
          'Each layer has a distinct strength, and investigations chain them: alerts/intel point you at something; Zeek logs explain what protocol/domain/cert/file was involved; flow gives the long-retention who-talked-to-whom-and-how-much (beaconing, exfiltration, history); and selectively retained full capture provides the exact packets for proof. Centralizing and correlating them (and with host/identity telemetry) is what turns separate tools into an NSM capability — which is why stacks like Security Onion bundle them together.',
        hint: 'Does one data type do everything, or does each add a different piece (flag, context, history, ground truth)?',
      },
    },

    {
      id: 'bnet-i-12',
      title: 'Project: deploy NSM and write a detection',
      read: `Bring the level together the way a network defender is judged: stand up an NSM capability, generate a realistic attack in your lab, and prove you **detect** it — with a written, validated detection you can explain.

## The exercise

1. **Deploy** an NSM sensor watching your lab network — the fastest path is **Security Onion** (bundles Zeek + Suricata + full capture + Elastic), or hand-assemble Zeek + Suricata + flow + a data store. Place it where it can see the lab traffic (SPAN/tap, or the VM host's virtual switch).
2. **Confirm visibility** — verify Zeek is writing conn/dns/http/ssl logs and Suricata is running. You can only detect what the sensor sees (placement).
3. **Generate attacks** from your "attacker" VM, safely, in the lab:
   - a port scan / sweep (nmap),
   - a C2 **beacon** (a simple script connecting to a "C2" every 60s, or a lab Cobalt Strike/other framework),
   - **DNS tunnelling** (a tunnelling tool, or a script making long random subdomain queries),
   - a simulated **exfiltration** (a large upload to an external-looking host),
   - **lateral movement** (SMB/RDP from one lab host to peers).
4. **Detect each** — find it across the stack:
   - scan → Suricata scan rules / flow fan-out,
   - beacon → interval analysis over Zeek conn.log (RITA-style),
   - tunnel → dns.log length/entropy/frequency,
   - exfil → flow volume vs baseline,
   - lateral → east-west admin-port connections.
5. **Write a detection** — codify one of these as a repeatable rule (a Suricata rule, a Zeek script, or a SIEM/Sigma query), tune it against your normal traffic (no false positives on benign activity), and **validate** it fires on the attack and stays quiet otherwise.

## The measure of success

An intermediate network defender can say, with evidence: "My NSM stack has visibility at the right choke points; I generated scans, beaconing, tunnelling, exfiltration and lateral movement in the lab and detected each across Zeek/Suricata/flow; and here is a tuned, validated detection (with its false-positive rate) that I can explain and maintain."

> The level distilled: **NSM = layered visibility (flow, Zeek transaction logs, IDS alerts, selective capture) at the right places, feeding detection and hunting.** Signatures (Suricata) catch the known; behaviour (beaconing timing, tunnelling entropy, exfil volume, lateral east-west patterns) catches the rest, even through encryption; threat intel makes it specific; placement decides coverage and tuning decides signal. Build the stack, generate the attacks, detect them, and write the detection down — that is network security monitoring in practice, and the foundation for the architecture, encrypted-traffic depth, and hunting of the skilled and pro levels.`,
      sample: {
        lang: 'text',
        caption: 'A validated Zeek-based beaconing detection (the deliverable)',
        code: `# Detection: periodic connections to one dest (beaconing)
# over Zeek conn.log, e.g. as a scheduled hunt / RITA-style score.

Logic (pseudocode):
  group conn.log by (orig_h, resp_h, resp_p)
  for each pair with >= 20 connections over >= 2 hours:
     deltas = diffs of successive ts
     if stdev(deltas)/mean(deltas) < 0.15   # low jitter = regular
        and mean(resp_bytes) small and uniform:
           score as BEACON, enrich dest with intel, alert

Validation (lab):
  fires on: 10.0.0.31 -> C2 every 60s (+/-10%)   -> DETECTED
  quiet on: browser traffic, NTP, update checks   -> allow-listed
  false-positive rate over 24h of normal lab: 0`,
        output: `Deployed NSM with visibility, generated scan/beacon/tunnel/
exfil/lateral in the lab, detected each across Zeek/Suricata/
flow, and produced ONE tuned, validated detection (0 FP on
normal traffic) I can explain and maintain. That is NSM in practice.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When you write a new network detection (e.g. for beaconing), why is validating it against your normal traffic — not just confirming it fires on the attack — an essential step?',
        options: [
          'It is not important; if it catches the attack, ship it',
          'A detection that fires on the attack but also on benign traffic (browser update checks, NTP, monitoring) produces false positives that cause alert fatigue and get the rule ignored or disabled — so you must confirm it fires on the attack AND stays quiet on normal traffic, tuning/allow-listing until its false-positive rate is acceptable',
          'Validation makes the detection run faster',
          'Normal traffic never resembles attacks',
        ],
        answer: 1,
        explain:
          'Catching the attack is only half the job; a detection that also fires on legitimate activity (many benign things beacon-like — update checks, NTP, monitoring) floods analysts with false positives, and a noisy rule gets muted or removed, so it protects nothing. Validation means proving it fires on the malicious case *and* stays quiet on your normal traffic, tuning and allow-listing benign patterns until the false-positive rate is acceptable. Detections are code you must test both ways and maintain — the alert-quality discipline that makes NSM actually work.',
        hint: 'What happens to a rule that catches the attack but also alerts on everyday benign traffic?',
      },
    },
  ],
}

export default level
