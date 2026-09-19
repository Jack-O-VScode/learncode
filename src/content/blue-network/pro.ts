import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'The deep end: NDR, evasion and the frontier',
  summary:
    'The frontier of network defence: NDR and machine-learning anomaly detection, advanced encrypted-traffic analysis, how attackers evade IDS and how to catch the evasion, modern C2 (domain fronting, DoH C2), analytics at massive scale, the shrinking-visibility future, data-science hunting, adversary emulation on the wire, network DFIR at scale, infrastructure intelligence, and OT/ICS defence.',
  outcomes: [
    'Reason about NDR and ML-based network anomaly detection',
    'Detect advanced C2 (domain fronting, DoH C2) and IDS evasion',
    'Adapt to shrinking visibility (ECH, DoH) with behaviour and endpoints',
    'Hunt with data-science methods and pivot on adversary infrastructure',
    'Run network adversary emulation and DFIR at scale',
    'Apply network defence to OT/ICS and the frontier',
  ],
  steps: [
    {
      id: 'bnet-p-01',
      title: 'NDR and machine-learning anomaly detection',
      read: `**Network Detection and Response (NDR)** is the mature product category built on everything in this track: continuous network monitoring, behavioural and ML-driven detection, and integrated response. At the pro level you must reason about what ML on network data can and cannot do — its real value and its real limits.

## What NDR adds

NDR platforms combine the layers you've learned — flow, transaction metadata (Zeek-like), signatures, threat intel, encrypted-traffic analysis — with **behavioural analytics and machine learning**, plus **response** (alert, integrate with firewalls/EDR to isolate, or auto-block). Think of it as the network sibling of EDR: rich telemetry + analytics + response, network-wide.

## What ML does well on network data

ML shines where there's lots of structured behavioural data and the goal is finding deviation:

- **Baselining and anomaly detection** — learn each entity's normal (peers, ports, volumes, timing, protocols) and flag significant deviations, at a scale and subtlety humans and fixed thresholds can't match. Catches novel behaviour with no signature.
- **Beaconing detection** — statistical/periodicity analysis (autocorrelation, FFT) over connection timing, robust to jitter.
- **Encrypted-traffic classification** — classify traffic type and flag malicious patterns from flow/TLS features **without decryption** (the ETA lesson, ML-powered).
- **Clustering & peer-group analysis** — group similar entities; flag the one behaving unlike its peers (statistical stacking).

## The real limits (and why humans stay central)

- **"Anomalous" ≠ "malicious."** ML finds *deviation*; most deviations are benign (new software, a project, travel). Output is **leads for a human**, not verdicts. Poorly tuned, it floods the SOC (alert fatigue) — worse than fewer, higher-quality detections.
- **Baseline poisoning & drift** — an attacker present during learning can normalise their activity; legitimate behaviour changes over time, needing retraining. Adversaries can also craft activity to stay within "normal."
- **Explainability** — a black-box "anomaly score" an analyst can't understand or act on has little operational value. Good NDR shows *why* something is anomalous.
- **Not magic** — ML complements signatures, behavioural rules, intel and hunting; it doesn't replace them. The best programs layer deterministic detections (precise, explainable) with ML (broad, novel-catching) and human hunting/judgement.

## The pro perspective

Treat NDR/ML as a powerful *layer*, not a silver bullet: excellent at surfacing behavioural anomalies and unknown threats across huge data, at scale and subtlety beyond rules — but producing *leads* that need human triage, requiring tuning and retraining, vulnerable to poisoning, and best combined with the deterministic, explainable detections and hunting you already know. The mature stance is neither "ML solves detection" nor "ML is useless," but "ML is a valuable, imperfect layer whose anomalies humans must validate, deployed alongside signatures, behaviour, intel and hunting."`,
      sample: {
        lang: 'text',
        caption: 'ML anomaly detection: a lead for a human, not a verdict',
        code: `NDR model baselines host 10.0.0.31 over 30 days, then scores:

  feature deviation                          contribution
  ------------------------------------------------------------
  new external destination (never contacted)     +0.30
  outbound volume 40x this host's norm           +0.35
  connection timing highly periodic (~300s)      +0.25
  rare JA3 for this environment                  +0.20
  = anomaly score 0.94 (HIGH)  ->  analyst LEAD, with reasons

Analyst validates: is this a new backup job (benign) or C2+exfil?
The model surfaced it; the human decides. Explainable > black box.`,
        output: `ML/NDR excels at baselining + anomaly detection at scale and
subtlety beyond rules, catching novel behaviour. But "anomalous"
!= "malicious": it produces LEADS a human validates, needs tuning/
retraining, and can be poisoned. A layer alongside signatures,
behaviour, intel and hunting - not a silver bullet.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the correct way to think about machine-learning anomaly detection (as in NDR) for network security?',
        options: [
          'It fully automates detection and replaces analysts',
          'It is a powerful layer that baselines behaviour and surfaces anomalies at scale and subtlety beyond fixed rules — catching novel threats — but "anomalous" is not "malicious", so it produces leads a human must validate, needs tuning/retraining, can be poisoned, and works best alongside deterministic detections, intel and hunting',
          'It is useless because it produces false positives',
          'It only works on unencrypted traffic',
        ],
        answer: 1,
        explain:
          'ML on network data is genuinely valuable: it baselines entities and flags deviations humans and static thresholds would miss, catching novel behaviour and enabling encrypted-traffic classification. But its output is *deviation*, and most deviation is benign, so it generates leads for human triage rather than verdicts; it needs tuning and retraining, can be evaded or poisoned, and should be explainable to be actionable. The mature view treats it as one imperfect but powerful layer, combined with precise/explainable deterministic detections, threat intel, and human hunting — neither silver bullet nor useless.',
        hint: 'Does ML output a verdict or a lead, and does it replace or complement rules and human judgement?',
      },
    },

    {
      id: 'bnet-p-02',
      title: 'Advanced C2 detection',
      read: `Sophisticated attackers design their command-and-control to blend into normal traffic and defeat the detections you've built. A pro defender understands these advanced C2 techniques and the (often behavioural) ways to catch them.

## The evasive C2 techniques

- **Domain fronting** — the C2 traffic's TLS SNI shows a legitimate, high-reputation domain (e.g. a big CDN), but the actual (encrypted) HTTP Host header routes it to the attacker's backend on that same CDN. So SNI-based detection sees a trusted destination while the traffic really goes to the attacker. (Major CDNs have curbed classic domain fronting, but "domain borrowing"/CDN abuse variants persist.)
- **C2 over legitimate services** — using Slack, Discord, Telegram, GitHub, Google Docs, Pastebin, or cloud storage as the C2 channel. The traffic goes to a genuinely legitimate, allow-listed service, so destination reputation is useless — the maliciousness is in *how* it's used.
- **DoH-based C2** — command-and-control tunneled through DNS-over-HTTPS to a public resolver, bypassing your DNS logging/RPZ entirely (the DoH visibility problem, weaponised).
- **Malleable C2 profiles** — frameworks like Cobalt Strike let the attacker shape their traffic to mimic normal patterns (specific user-agents, URI structures, headers, jitter, sleep times) — deliberately defeating signatures and simple beaconing detection.
- **Low-and-slow** — very long sleep intervals (hours), so beaconing periodicity is spread thin and easy to miss.

## Detecting advanced C2

Since destination and content are unreliable, lean on **behaviour and subtle metadata**:

- **Beaconing analysis robust to jitter/long sleeps** — statistical periodicity over long windows catches even high-jitter, long-interval beacons (long-retention flow is key).
- **JA3/JARM and TLS anomalies** — malleable C2 still often has a tell-tale TLS fingerprint; a rare JA3 to a "legitimate" destination is suspicious (fingerprint stacking).
- **Behavioural anomalies on legit services** — a host that never used Telegram/Pastebin/Discord now doing so periodically; a server (not a user) talking to a chat service; data volumes wrong for the service (a "chat" moving megabytes). It's the *usage pattern*, not the destination.
- **DoH detection** — flag/block external DoH usage so DoH-C2 can't hide (the protective-DNS lesson); a host beaconing over DoH is anomalous.
- **Correlate with host/endpoint** — network alone struggles here; EDR seeing the *process* making these connections (a non-browser using DoH, an office app talking to a CDN oddly) closes the gap. Advanced C2 detection is where network + endpoint correlation really pays off.

## The mindset

Advanced C2 deliberately defeats destination-, content-, and simple-signature-based detection by hiding in trusted services and mimicking normal traffic. So you fall back to **behaviour** (periodicity even through jitter, usage patterns abnormal for the service/host, TLS fingerprints) and **cross-layer correlation** (which process, on which host, doing this). It's an arms race: as detection improves, C2 evolves — which is why behavioural detection, fingerprinting, protective DNS, and endpoint correlation, together, are the durable answer rather than any single content or destination rule.`,
      sample: {
        lang: 'text',
        caption: 'C2 over a legitimate service: destination reputation is useless',
        code: `Connection: 10.0.0.50 (a DATABASE server) -> api.telegram.example:443
  destination reputation: LEGITIMATE (Telegram) - passes IOC/rep checks
  SNI/cert: valid Telegram                        - looks fine
  BUT:
   - a DATABASE server has no business using a chat API
   - periodic: every ~120s (+/- jitter)            - beacon pattern
   - has never contacted this service before        - first-seen
   - EDR: the process is not a chat client, it's an injected thread

Malicious USE of a legitimate service. Destination reputation
can't catch it; behaviour + host correlation can.`,
        output: `Advanced C2 hides in trusted services (Slack/Telegram/CDN via
domain fronting), tunnels over DoH, and mimics normal traffic
(malleable profiles). Detect on BEHAVIOUR (periodicity, usage
abnormal for the host/service, TLS fingerprint) + ENDPOINT
correlation (which process) - not destination or content.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does using a legitimate service (like Telegram, Discord, or a CDN via domain fronting) for command-and-control defeat destination-reputation and SNI-based detection, and how is it caught instead?',
        options: [
          'It cannot be caught at all',
          'The traffic goes to a genuinely legitimate, allow-listed destination (so reputation/SNI checks pass), meaning the maliciousness is in how the service is used — caught by behavioural signals (periodic beaconing, usage abnormal for that host/service, TLS fingerprint) and correlation with endpoint data showing which process is really making the connection',
          'The service encrypts the reputation data',
          'Only by blocking all use of those services',
        ],
        answer: 1,
        explain:
          'When C2 rides a legitimate service (or fronts behind a trusted CDN domain), the destination and SNI look benign and pass reputation checks — the whole point. So detection shifts to behaviour and context: a host (especially a server) using a service it never has, periodic beacon-like timing, data volumes wrong for the service, a suspicious TLS fingerprint — and, crucially, endpoint correlation revealing that a non-legitimate process is making the connection. It’s an arms race where behavioural + cross-layer detection is the durable answer, not destination or content rules.',
        hint: 'If the destination is genuinely legitimate, what is actually abnormal — the where, or the how/who?',
      },
    },

    {
      id: 'bnet-p-03',
      title: 'IDS evasion and detecting it',
      read: `Attackers actively try to slip past network detection. A pro defender understands the classic **IDS/IPS evasion** techniques — and knows that evasion itself often produces detectable anomalies.

## The evasion techniques

Most exploit the gap between how the **IDS** interprets traffic and how the **target host** does (the "insertion/evasion" problem from Ptacek & Newsham's classic research):

- **Fragmentation** — split the attack across many small IP fragments or TCP segments so no single packet matches a signature; the target reassembles them into the attack, but a naive IDS that doesn't reassemble the same way misses it. Overlapping fragments with different content exploit differences in how IDS vs host resolve the overlap.
- **TTL manipulation** — craft packets with TTLs that reach the IDS but expire before the host (or vice versa), so the IDS and host see different data streams.
- **Protocol ambiguity** — exploit cases where the RFC is ambiguous and the IDS and host resolve it differently (e.g. overlapping TCP segments, unusual options).
- **Encoding/obfuscation** — encode the attack (URL encoding, unicode, case tricks, padding) so it doesn't match a literal signature but still executes on the target.
- **Encryption** — the ultimate evasion of content signatures (the ETA problem).
- **Traffic timing/volume** — spreading activity out (low-and-slow) to stay under thresholds.

## Defending against evasion

- **Proper reassembly (target-based normalization)** — a good IDS reassembles fragments and streams the *same way the target host would*, using knowledge of the target OS. Suricata/Snort have stream reassembly and target-based policies precisely for this. Configure them correctly (a misconfigured or under-resourced IDS that drops/skips reassembly is easy to evade).
- **Normalization at an inline device** — an IPS/normalizer can re-assemble and re-emit clean traffic, removing ambiguity before it reaches the host.
- **Detect the evasion itself** — evasion often looks weird: unusual fragmentation, overlapping segments with conflicting data, odd TTL patterns, malformed packets, excessive tiny fragments. These anomalies are themselves signals — legitimate traffic rarely fragments pathologically or uses overlapping segments. Zeek's weird.log and IDS anomaly rules flag them.
- **Defence in depth** — don't rely on the network IDS alone. If evasion beats the network layer, endpoint detection (EDR) still sees the exploit *execute* on the host, and behavioural/anomaly detection catches the *effect* (a new process, a connection out). Layered detection means one evaded layer isn't the whole game.

## The insight

Evasion exploits interpretation gaps and signature literalness — but it comes at a cost: the evasive traffic is often abnormal (pathological fragmentation, overlaps, odd TTLs), and the attack still has to *work* on the target, where endpoint and behavioural detection can catch it. So the pro answer is threefold: (1) configure network detection to reassemble/normalize like the target (closing the gap), (2) treat evasion artefacts as detection signals in themselves, and (3) layer network with endpoint and behavioural detection so beating one layer doesn't mean going undetected. As with EDR evasion on the host, blinding one sensor is itself noisy and rarely blinds them all.`,
      sample: {
        lang: 'text',
        caption: 'Fragmentation evasion, and how the evasion itself is a signal',
        code: `Attack signature: "GET /cgi-bin/exploit"

EVASION - split across tiny overlapping fragments:
  frag1: "GET /cgi-"     frag2 (overlap): "XX/exploit"  frag3: ...
  naive IDS reassembles wrong -> no signature match -> MISS
  target OS reassembles to "GET /cgi-bin/exploit"      -> exploited

DEFENCES:
  1. IDS with target-based reassembly -> sees the real request -> catch
  2. Detect the EVASION: overlapping fragments w/ conflicting data,
     pathological tiny fragments, odd TTLs = abnormal (Zeek weird.log)
  3. Layer: EDR sees the exploit EXECUTE on the host regardless`,
        output: `Evasion exploits IDS-vs-host interpretation gaps + signature
literalness. Counter: reassemble/normalize like the TARGET,
treat evasion artefacts (weird fragmentation/overlaps/TTLs) as
signals, and layer network + endpoint so beating one isn't
beating all. Blinding a sensor is itself noisy.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Many IDS evasion techniques (fragmentation, TTL games, overlapping segments) exploit the gap between how the IDS and the target host interpret traffic. What is the primary defence against this class of evasion?',
        options: [
          'Turn off the IDS',
          'Configure the IDS to reassemble fragments and TCP streams the same way the target host would (target-based normalization), and/or normalize traffic at an inline device — closing the interpretation gap — while also treating evasion artefacts (pathological fragmentation, overlaps, odd TTLs) as signals and layering with endpoint detection',
          'Only inspect encrypted traffic',
          'Block all fragmented packets, which are always malicious',
        ],
        answer: 1,
        explain:
          'These evasions work because the IDS and the host reassemble/interpret the traffic differently, so the IDS sees something benign while the host sees (and executes) the attack. The core fix is target-based reassembly/normalization: make the IDS reconstruct streams and resolve ambiguities the way the actual target OS does (Suricata/Snort support this), optionally normalizing at an inline device. Additionally, the evasive traffic is itself anomalous (weird fragmentation/overlaps/TTLs) and can be flagged, and endpoint detection catches the exploit executing regardless — layered defence so beating the network IDS isn’t going undetected.',
        hint: 'If the trick is that the IDS and host see different data, what must you make the IDS do?',
      },
    },

    {
      id: 'bnet-p-04',
      title: 'The shrinking-visibility future',
      read: `Network visibility is steadily eroding as more of the traffic — and even the metadata — becomes encrypted. A pro defender understands this trajectory and how defence adapts, because strategies that rely on reading traffic are becoming less viable.

## What is disappearing

- **TLS everywhere** — already, most traffic is encrypted, so content inspection at the network is largely gone (the ETA reality).
- **Encrypted SNI / ECH (Encrypted Client Hello)** — historically the SNI revealed *which site* even in HTTPS; ECH encrypts it, removing one of the last widely-available metadata signals. As ECH deploys, "which domain is this HTTPS going to?" becomes unanswerable at the network for that traffic.
- **Encrypted DNS (DoH/DoT)** — moves DNS visibility away from network observers (the protective-DNS challenge). If clients use external DoH, you lose the query visibility that was among your best signals.
- **QUIC / HTTP3** — traffic over UDP with encryption baked in, harder to inspect with tools built for TCP; more of the connection is encrypted earlier.
- **Certificate-pinned / proprietary protocols** — resist interception.

## What remains, and where defence moves

Even with heavy encryption, some things persist — and the strategic response is to lean on them and on other layers:

- **Behaviour and metadata that survive** — you still see *that* a connection happened, to *some IP*, its *timing, volume, and duration*. Beaconing, exfiltration-by-volume, and connection patterns remain detectable from flow even without SNI or content. Destination *IP* reputation (though IPs are shared/CDN'd) still has some value.
- **TLS fingerprinting (JA3/JARM)** — still works even with ECH (it fingerprints the handshake characteristics, not the SNI), so client/tool identification persists.
- **Endpoint visibility becomes primary** — as the *network* goes dark, the *host* is where you see the plaintext (before encryption), the process making the connection, and the intent. The strategic shift is toward **EDR/host telemetry** for what the network can no longer show. Network + endpoint correlation, already valuable, becomes essential.
- **Controlled decryption where justified** — enterprises may run their own DoH resolver, TLS inspection proxies, and force clients through them — retaining visibility for traffic they control, at the usual cost.
- **Identity and application-layer controls** — zero trust, application-level logging (the app sees its own plaintext), and cloud/SaaS logs (the service logs the activity) fill gaps the wire can't.

## The strategic takeaway

The trend is clear: **the network is becoming less of a place to read content and metadata, and more of a place to observe behaviour** (timing/volume/patterns) and fingerprints — with the *endpoint and application/identity layers* increasingly carrying the visibility the network is losing. Pro defenders plan for this: invest in behavioural network detection (which survives encryption), in endpoint telemetry (which sees what the network can't), in controlled visibility points (own resolvers, selective decryption) where justified, and in identity/application/cloud logging. Betting your detection strategy on reading network traffic is betting against the trend; betting on behaviour + endpoints + identity is betting with it. It's not that network monitoring dies — behaviour and fingerprints endure — but its role narrows, and a resilient program distributes visibility across all the layers, not just the wire.`,
      sample: {
        lang: 'text',
        caption: 'Visibility eroding on the wire; shifting to behaviour + endpoint',
        code: `Signal                     Yesterday   Today/Tomorrow (ECH/DoH/QUIC)
------------------------------------------------------------------------
HTTP content               readable     encrypted (gone)
Which domain (SNI)         visible      ECH encrypts it (going)
DNS queries                visible      DoH to external = gone to you
Connection timing/volume   visible      STILL visible (flow)  <- lean here
TLS fingerprint (JA3/JARM) visible      STILL works           <- lean here
Process making the conn    endpoint     endpoint (EDR)        <- lean here
Plaintext before encrypt   -            endpoint / app logs   <- lean here`,
        output: `The wire is going darker (TLS, ECH, DoH, QUIC). Defence shifts
to what survives - behaviour (timing/volume/patterns) and TLS
fingerprints - and to the ENDPOINT and APPLICATION/IDENTITY
layers that see what the network no longer can. Distribute
visibility; don't bet detection solely on reading traffic.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'As encryption expands (TLS everywhere, Encrypted Client Hello, DoH, QUIC), how should a pro defender adapt their detection strategy?',
        options: [
          'Give up on detection entirely',
          'Shift toward what survives encryption — behavioural network signals (timing, volume, patterns) and TLS fingerprints (JA3/JARM) — while increasingly relying on endpoint/host telemetry (which sees plaintext, processes and intent) and application/identity/cloud logs, plus controlled visibility points where justified; distribute visibility across layers rather than betting on reading network traffic',
          'Decrypt all traffic everywhere regardless of cost',
          'Encryption has no effect on network visibility',
        ],
        answer: 1,
        explain:
          'The trajectory removes content and even key metadata (SNI via ECH, DNS via external DoH) from network observers. The resilient response is to lean on what endures — behavioural signals from flow (beaconing, exfiltration-by-volume, connection patterns) and TLS fingerprints that don’t depend on SNI — and to shift primary visibility to the endpoint (which sees plaintext, the process, and intent) and to application/identity/cloud logs, using controlled decryption/own resolvers where justified. Betting detection solely on reading network traffic runs against the trend; distributing visibility across network-behaviour, endpoint, and identity layers runs with it.',
        hint: 'If content and even SNI/DNS are disappearing from the wire, what network signals remain, and which other layer sees the plaintext?',
      },
    },

    {
      id: 'bnet-p-05',
      title: 'Analytics at massive scale',
      read: `At enterprise/carrier scale — terabytes of traffic, billions of flows — detection and hunting become a **big-data engineering** problem. A pro defender understands how to work with network telemetry at scale, because the techniques you've learned must run over volumes that break naive approaches.

## The scale challenge

- **Full packet capture** of a large network is petabytes; you keep a small rolling window (Arkime and similar, from the skilled level) and rely on metadata for breadth.
- **Flow and Zeek logs** are far smaller but still enormous at scale — billions of records — requiring proper data infrastructure to store, index, and query.
- **Real-time vs. retrospective** — you need both streaming detection (catch it now) and the ability to query months of history (hunt, scope an incident, "did anyone ever talk to this IP?").

## The data infrastructure

- **Scalable storage & search** — Elasticsearch/OpenSearch, ClickHouse, data lakes (S3 + query engines), or purpose-built (e.g. Arkime for capture, big-data flow stores). Indexed so queries over billions of records return in seconds.
- **Streaming pipelines** — Kafka and stream processors to ingest and analyse telemetry in real time at high throughput.
- **Aggregation and sampling** — you can't examine every packet; flow aggregation, and (carefully) sampling, keep volumes tractable while preserving the signals that matter. But be aware sampling can miss low-and-slow or small-but-important events — a trade-off.
- **Tiered retention** — hot (recent, fast) / warm / cold (cheap, slower) storage so you can keep long history affordably (flow/metadata for months+, full capture for days).

## Analytics at scale

- **The techniques still apply, at scale** — stacking/frequency analysis, beaconing detection, baselining, outlier detection — but implemented as queries/jobs over big-data stores, often distributed. "Stack every JA3 across the fleet for 90 days" is a big-data query.
- **Batch + streaming** — real-time rules on the stream for immediate detection; batch analytics/ML jobs over the historical store for hunting and baselining.
- **Prioritisation and enrichment at scale** — with billions of events, automated enrichment (intel, asset context) and scoring are essential to surface the few that matter — the alert-quality problem, industrialised.

## Why it matters for the pro

The detection and hunting concepts don't change at scale — but *whether you can actually run them* depends on data engineering. A beaconing analysis that works on a lab pcap must run over billions of flows; a "who contacted this C2 in 90 days" hunt needs months of indexed flow queryable in seconds. Pro network defenders either build/operate this infrastructure or reason about its constraints: what can you retain and for how long, what can you query in real time vs. batch, where does sampling lose signal, how do you keep queries fast. Detection at scale is as much a data-engineering discipline as a security one — the analytics are only as good as the pipeline that can actually execute them over real volumes.`,
      sample: {
        lang: 'text',
        caption: 'The same techniques, now as big-data jobs',
        code: `Lab:                          Enterprise scale:
  grep/awk over one pcap        streaming pipeline (Kafka) + data lake
  stack JA3 in a file           distributed query over 90d x billions of flows
  beacon analysis on 1 host     batch job over the whole fleet, nightly
  keep the pcap                 tiered: full capture (days) + flow/Zeek (months+)

Real-time stream:  rules + ML score incoming flow -> immediate alerts
Retrospective:     "any host -> 45.77.10.20 in last 90 days?"
                   indexed query returns in seconds (scoping a breach)`,
        output: `The detection concepts (stacking, beaconing, baselining,
outliers) are unchanged - but at scale they are big-data
engineering: scalable storage/search, streaming pipelines,
aggregation/sampling trade-offs, tiered retention. The analytics
are only as good as the pipeline that can run them over real volume.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'At enterprise scale (billions of flows, terabytes of traffic), what becomes true about network detection and hunting?',
        options: [
          'The techniques change completely and stacking/beaconing no longer work',
          'The techniques (stacking, beaconing, baselining, outlier analysis) stay the same, but executing them requires big-data engineering — scalable indexed storage, streaming pipelines, tiered retention, and careful aggregation/sampling — so what you can actually run in real time vs. retrospectively is constrained by the data infrastructure',
          'You should capture every packet forever',
          'Scale makes detection impossible',
        ],
        answer: 1,
        explain:
          'The analytical concepts are unchanged at scale — you still stack for outliers, analyse beaconing periodicity, baseline behaviour, and hunt over history. What changes is feasibility: those techniques must run over billions of records, needing scalable indexed stores, streaming pipelines for real-time detection, tiered retention to keep history affordably, and aggregation/sampling (with awareness that sampling can lose low-and-slow signals). So detection at scale is as much data engineering as security: the analytics are only useful if the pipeline can actually execute them over real volume, in real time and retrospectively.',
        hint: 'Do the detection ideas change at scale, or does the challenge become being able to run them over huge volumes?',
      },
    },

    {
      id: 'bnet-p-06',
      title: 'Adversary infrastructure intelligence',
      read: `Beyond consuming IOC feeds, pro defenders **analyse and track adversary infrastructure** — the servers, domains, and certificates attackers use — turning individual indicators into an understanding of the adversary's whole operation. This is threat intelligence as active analysis, not just a feed.

## Pivoting: from one indicator to many

The core technique is **pivoting**: starting from one known artefact and finding related infrastructure by shared attributes.

- **From a C2 IP** → what other domains resolve to it (passive DNS)? What else is hosted there? What certificates has it served?
- **From a domain** → its IP history (passive DNS), its registration details (WHOIS — registrant, dates, registrar), its name servers, related domains registered by the same entity or pattern.
- **From a TLS certificate** → other hosts serving the same cert or a cert with the same distinctive fields (Certificate Transparency logs, Censys/Shodan). Attackers reuse certs and cert patterns.
- **From a JA3/JARM** → other servers with the same TLS stack fingerprint (JARM actively fingerprints C2 servers — e.g. default Cobalt Strike servers have a known JARM).
- **From a hosting pattern** → attackers reuse hosting providers, ASNs, registration patterns, SSL configs.

The tools: **passive DNS**, **WHOIS/registration data**, **Certificate Transparency logs**, **Shodan/Censys** (internet-wide scan data), and threat-intel platforms (**MISP**, commercial). Chaining these pivots maps an adversary's infrastructure from a single seed.

## Why it's powerful

- **Proactive blocking** — having mapped an adversary's infrastructure, you can block/detect *all* of it, including the parts they haven't used against you *yet* — getting ahead of the attack.
- **Attribution & context** — infrastructure patterns cluster into campaigns and actors, giving context (who, what motivation, what TTPs) that shapes your defence.
- **Resilience against IOC rotation** — attackers rotate individual IPs/domains cheaply (the Pyramid of Pain), but their *infrastructure patterns* (registration habits, cert reuse, hosting choices, JARM) are stickier. Tracking the patterns catches new indicators as they appear, staying ahead of rotation.
- **Detecting new infrastructure early** — monitoring CT logs for certs matching an adversary's pattern, or scanning for their JARM, can spot their *next* server before it's used against anyone.

## The pro practice

- **Enrich and pivot** on every indicator from your own incidents/alerts — don't just block the one IP, map its neighbourhood.
- **Track adversaries over time** — build/consume intelligence that follows actors' infrastructure, so you recognise their return.
- **Share** (via ISACs, MISP, STIX/TAXII) — infrastructure intelligence compounds when shared: one org's discovered C2 protects the community, and your incident's IOCs pivot into others'.
- **Feed it back** — the mapped infrastructure becomes proactive blocklists and detections in your stack.

Infrastructure intelligence turns reactive IOC-matching into **proactive adversary tracking**: from one indicator, understand and pre-empt the adversary's whole operation, stay ahead of their indicator rotation by tracking stickier patterns, and recognise them when they return. It's the analytical, intelligence-led complement to the behavioural detection that dominates the rest of this track.`,
      sample: {
        lang: 'text',
        caption: 'Pivoting from one C2 IP to the adversary’s wider infrastructure',
        code: `Seed (from your incident):  C2 IP 45.77.10.20

Pivot -> passive DNS:  c2.evil.example, gate.evil.example resolve to it
Pivot -> WHOIS:        both registered same day, same registrant email
Pivot -> Cert Transparency: cert CN pattern "*.evil.example" +
                            a distinctive self-signed cert reused
Pivot -> JARM scan (Shodan/Censys): 12 MORE servers share the same
         JARM (default Cobalt Strike) + the cert pattern
   => mapped 12 servers + 30 domains from ONE seed IP

Action: block/detect ALL of it proactively (incl. unused-against-us);
        monitor CT for NEW certs matching the pattern (catch the next one).`,
        output: `Pivoting (passive DNS, WHOIS, Cert Transparency, JARM, Shodan/
Censys) turns ONE indicator into the adversary's mapped
infrastructure - enabling proactive blocking of what they
haven't used yet, resilience against IOC rotation (patterns are
stickier than IPs), and early detection of their next server.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "pivoting" from one indicator to map an adversary’s wider infrastructure more valuable than just blocking that single indicator?',
        options: [
          'It is not — blocking the one IP is always enough',
          'Pivoting (via passive DNS, WHOIS, Certificate Transparency, JARM, Shodan/Censys) reveals related infrastructure sharing attributes, letting you proactively block/detect all of it — including parts not yet used against you — stay ahead of cheap IOC rotation by tracking stickier patterns, and detect the adversary’s new infrastructure early',
          'Pivoting decrypts the attacker’s traffic',
          'It only works after the attack is over and is useless',
        ],
        answer: 1,
        explain:
          'Blocking one IP stops one indicator the attacker rotates cheaply. Pivoting chains shared attributes — an IP’s other domains (passive DNS), a registrant’s other registrations (WHOIS), reused certificates (CT logs), a distinctive TLS stack (JARM) — to map the adversary’s broader operation from a single seed. That enables proactive blocking of infrastructure not yet used against you, resilience against indicator rotation (patterns like registration habits and cert reuse are stickier than individual IPs), early detection of their next server (e.g. monitoring CT for their cert pattern), and attribution/context. It turns reactive IOC-matching into proactive adversary tracking.',
        hint: 'Attackers rotate individual IPs cheaply. What do you gain by mapping the patterns and related infrastructure instead of just one artefact?',
      },
    },

    {
      id: 'bnet-p-07',
      title: 'Data-science hunting',
      read: `At the pro level, threat hunting on the network graduates from ad-hoc queries to **data-science methods** applied to large telemetry — statistical and ML techniques that surface subtle patterns human queries and fixed thresholds miss.

## From queries to models

The hunting techniques you know have data-science formalisations that scale and sharpen them:

- **Frequency/rarity analysis → statistical outlier detection** — instead of eyeballing rare values, compute statistical rarity across dimensions, weighting by how unusual each attribute is. Surfaces the genuinely anomalous, not just the low-count.
- **Beaconing → time-series analysis** — autocorrelation, Fourier/FFT analysis, and interval-distribution modelling detect periodicity robustly even with jitter and long sleeps, at scale across all host-destination pairs.
- **Baselining → statistical/ML models** — model each entity's normal (per-feature distributions, seasonality) and score deviations properly, accounting for time-of-day/day-of-week patterns so a "3am connection" is judged against the host's actual nighttime baseline.
- **Peer-group / clustering** — cluster hosts by behaviour; a host that doesn't fit its cluster (e.g. a workstation behaving like a server, or unlike its department peers) is a lead. Clustering also reduces a huge space to a few behavioural groups to reason about.
- **Graph analysis** — model the network as a graph (hosts as nodes, connections as edges) and apply graph algorithms: find unusual paths, newly-appearing edges, or a node whose connection pattern changed — powerful for lateral movement and for understanding an intrusion's spread.
- **Entropy and information-theoretic measures** — for tunnelling/encoding detection (DNS names, payload randomness), formalised.

## The discipline (and its pitfalls)

- **Feature engineering matters most** — the right features (timing regularity, volume ratios, rarity scores, entropy, fan-out) determine whether the analysis finds anything. Domain knowledge (everything in this track) drives good features.
- **"Anomalous ≠ malicious," still** — data-science hunting surfaces statistically unusual things; most are benign. Output is prioritised **leads** for human investigation, not verdicts (the NDR lesson).
- **Explainability** — a lead you can explain ("periodic every 300s, to a rare destination, high volume vs baseline") is actionable; an opaque anomaly score is not. Prefer interpretable methods and show the contributing features.
- **Iteration** — hunting is a loop: hypothesis → engineer features → analyse → validate leads → refine. Successful methods become automated detections (operationalise).

## Why it matters

The volume and subtlety of modern telemetry exceed what manual queries and fixed thresholds can fully exploit. Data-science methods let you find the low-and-slow beacon hidden among billions of flows, the host subtly unlike its peers, the connection pattern that shifted, the graph edge that shouldn't exist — patterns invisible to a human scrolling logs. But they augment, not replace, the analyst: the methods generate high-quality, explainable leads that human judgement (informed by the domain knowledge of this whole track) validates and acts on. Pro network hunting is the marriage of security domain expertise (knowing *what* to look for and *which* features encode attacker behaviour) with data-science technique (finding it at scale and subtlety) — and it's how the most sophisticated intrusions, designed to evade rules, get caught.`,
      sample: {
        lang: 'text',
        caption: 'Data-science hunting: methods that formalise the manual techniques',
        code: `Manual technique          Data-science method            Catches
------------------------------------------------------------------------
stack rare values     ->  statistical outlier scoring    genuinely rare
eyeball beaconing     ->  FFT/autocorrelation on timing  jittered/slow C2
"know normal"         ->  per-entity models + seasonality subtle deviations
"workstation acting   ->  behavioural clustering /        peer outliers
   like a server"           peer-group analysis
lateral movement      ->  graph analysis (new edges,      spread patterns
                            changed node behaviour)
tunnelling            ->  entropy / info-theory           encoded data

All produce EXPLAINABLE, prioritised LEADS for a human to validate.`,
        output: `Data-science hunting formalises the manual techniques (rarity,
beaconing, baselining, clustering, graphs, entropy) to find the
subtle/low-and-slow at scale. Feature engineering (driven by
domain knowledge) is key; output is explainable leads, not
verdicts. Domain expertise + data science, marrying the two.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the correct relationship between data-science methods and the human analyst in advanced network threat hunting?',
        options: [
          'Data science replaces the analyst entirely',
          'Data-science methods (outlier scoring, time-series/FFT for beaconing, clustering, graph analysis, entropy) find subtle patterns at scale that manual queries miss, but they produce prioritised, explainable leads that a human — using security domain knowledge — validates and acts on; feature engineering driven by that domain knowledge is what makes the methods effective',
          'Domain knowledge is unnecessary if you have enough data',
          'The methods give verdicts, so no human review is needed',
        ],
        answer: 1,
        explain:
          'Data-science methods extend the hunting techniques (rarity, beaconing, baselining, clustering, graphs, entropy) to a scale and subtlety humans can’t match, catching low-and-slow beacons, peer outliers, and shifted connection patterns among billions of flows. But "anomalous" still isn’t "malicious," so they output explainable, prioritised leads that a human validates — and their effectiveness depends on feature engineering informed by security domain knowledge (knowing which features encode attacker behaviour). Pro hunting marries domain expertise with data-science technique; it augments the analyst rather than replacing them.',
        hint: 'Do the methods produce verdicts or leads, and what does the analyst’s domain knowledge contribute to making them work?',
      },
    },

    {
      id: 'bnet-p-08',
      title: 'Adversary emulation on the wire',
      read: `The intermediate/skilled levels validated network detections by generating individual attacks. At the pro level you validate against **realistic adversary behaviour** — emulating real threat actors' network TTPs end-to-end and measuring your network detection coverage, the network arm of purple teaming.

## Network-focused adversary emulation

1. **Choose an adversary** relevant to your organisation (intelligence-driven) and extract the network-observable parts of their TTP chain: how they scan, their C2 protocol and beaconing pattern, how they move laterally, how they exfiltrate (from ATT&CK, advisories).
2. **Emulate the network behaviour** in a controlled lab/scope: realistic C2 (e.g. a framework with the actor's malleable profile — beaconing pattern, protocol, jitter), lateral-movement traffic (SMB/RDP/WMI), exfiltration (volume, channel — including covert like DNS tunnelling), and reconnaissance.
3. **Measure network detection** at each stage, blue-team watching: did the NSM stack detect the scan? the beacon (through its jitter)? the lateral movement? the exfil/tunnel? What was the MTTD? Record detected / logged-not-alerted / blind per technique.
4. **Close gaps** — missing visibility (placement/log source), missing detection (write the Suricata rule / Zeek script / analytic), or a control that should have blocked/contained (segmentation). Re-emulate to confirm.

## Why full-chain, actor-realistic emulation matters on the network

- **Tests behaviour, not just signatures** — a real actor's C2 with malleable profiles and jitter tests whether your *behavioural* beaconing detection actually works, not just whether a signature matches a lab tool's defaults.
- **Tests the chain** — you might detect the scan and the exfil but be blind to the lateral movement in between; full-chain emulation reveals the chained blind spot.
- **Realistic conditions** — the actor's actual patterns (protocols, timing, channels) test your detection under conditions matching what you'll really face, not a generic nmap-and-done.
- **Measures coverage against the threats that matter** — an ATT&CK coverage map (network techniques) for the adversaries relevant to you, with evidence.

## Tools and safety

Frameworks like **Caldera**, **Atomic Red Team** (has network-relevant tests), C2 frameworks in lab mode, and traffic-replay tools generate the behaviour; do it in an isolated lab or a carefully scoped, authorised environment. The point is to test *your detection*, so emulate faithfully but safely.

## The deliverable

A **network ATT&CK coverage assessment** against the adversaries that threaten you — validated by emulation, with MTTD per technique, gaps prioritised into a detection backlog, and improvements re-validated. That evidence — "against [actor]'s network TTPs, here's what we detect, here's the MTTD, here's what we've closed" — is the difference between assuming your NSM works and *proving* it does against realistic threats. It closes the loop of this whole track: build detection, then adversarially validate and improve it, continuously.`,
      sample: {
        lang: 'text',
        caption: 'Network adversary emulation: coverage against a real actor’s chain',
        code: `Emulate [ransomware affiliate] network TTP chain (from advisory + ATT&CK):

  Stage                          Detect?  MTTD   Notes
  --------------------------------------------------------------
  T1046 network scan             yes      2m     Suricata + flow fan-out
  T1071 HTTPS C2 (malleable,     yes      8m     behavioural beaconing
        jittered)                              (NOT signature - good)
  T1021 SMB lateral movement     NO       -      <- gap: no east-west sensor
  T1048 DNS-tunnel exfil         yes      5m     dns.log entropy/freq
  T1041 bulk HTTPS exfil         yes      -      flow volume vs baseline

Gap: SMB lateral movement (T1021) blind -> add inter-segment sensor +
     Zeek east-west detection -> re-emulate -> now detected. MTTD 4m.`,
        output: `Emulate a real actor's NETWORK chain end-to-end and measure
detection per stage. Behavioural detection (beaconing through
jitter) is tested for real, and CHAINED blind spots (the
undetected lateral movement between detected stages) surface.
Deliverable: a validated network ATT&CK coverage map, improving.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is emulating a real adversary’s full network TTP chain (with their actual C2 profile, jitter, and channels) more valuable for validating detection than running a standalone nmap scan?',
        options: [
          'It uses less bandwidth',
          'It tests your behavioural detection under realistic conditions (e.g. does beaconing detection catch a jittered, malleable-profile C2, not just a lab tool’s defaults?) and reveals chained blind spots between detected stages — producing an actor-specific, evidence-backed network ATT&CK coverage map for the threats that actually matter to you',
          'A single nmap scan tests everything already',
          'It guarantees the adversary will never succeed',
        ],
        answer: 1,
        explain:
          'A lone scan tests one technique against defaults. Emulating a real actor’s end-to-end network chain — their C2 protocol/beaconing with realistic jitter and malleable profiles, their lateral-movement and exfiltration methods — tests whether your *behavioural* detections actually work under realistic conditions (not just signature matches on tool defaults), and exposes chained blind spots (e.g. detecting the scan and the exfil but being blind to the lateral movement between). The result is an evidence-backed, actor-specific network ATT&CK coverage assessment with MTTD per technique and a prioritised, re-validated gap backlog — proving your NSM works against the threats that matter, not assuming it does.',
        hint: 'Does a default nmap scan test whether you catch a jittered, custom-profile C2 and the whole chain including the steps in between?',
      },
    },

    {
      id: 'bnet-p-09',
      title: 'Network DFIR at scale',
      read: `When a major incident spans the whole environment, network data is central to answering the questions the organisation actually needs: how did they get in, how far did they spread, what did they take, and are they gone? Pro-level network **DFIR** (digital forensics and incident response) combines the forensic techniques (skilled level) with incident-response process at scale.

## The questions network data answers in an incident

- **Scope** — which hosts are involved? Pivot from initial indicators across flow/Zeek/capture to find *everyone* who talked to the C2, used the malicious JA3, or resolved the bad domain. The network sees relationships across all hosts at once — often the fastest way to scope.
- **Entry** — how did they get in? Reconstruct the initial access from the network timeline (the first external connection, the phishing payload download, the exploited service).
- **Spread** — the lateral-movement path across the environment (east-west connections, admin-protocol usage), reconstructed from flow/Zeek — the map of how patient-zero became a fleet-wide compromise.
- **Exfiltration** — what left, and how much? Volume analysis and (if captured) session reconstruction/file carving to determine what data was taken — critical for breach notification and impact.
- **Timeline** — order everything (network + host + identity) into the incident narrative, establishing dwell time and sequence.
- **Eradication verification** — after remediation, is the C2 traffic gone? Any beaconing still present? The network confirms whether the attacker is actually out.

## IR process, at scale

- **Preserve** — capture and protect network evidence (retained flow/Zeek/capture, with integrity/chain-of-custody as needed) before it rolls off. The retention window matters: an attacker present for months needs long-retention metadata to reconstruct.
- **Contain** — network is a powerful containment lever: isolate hosts/segments (block at firewalls, quarantine VLANs via NAC), sinkhole C2 domains at DNS, block C2 IPs — cutting the attacker's channels while preserving hosts for forensics (isolate rather than power off, the host-track lesson).
- **Coordinate** — network, endpoint, and identity teams together: network says "A talked to B on 445"; endpoint confirms the execution; identity shows the account used. The full picture needs all three (cross-layer correlation, industrialised).
- **Scale challenges** — hundreds/thousands of hosts, terabytes of data, time pressure. This is where the big-data infrastructure and indexed, long-retention telemetry (previous steps) prove their worth — you can only investigate at scale what you retained and can query.

## Why the network view is pivotal in DFIR

The network gives the **environment-wide, host-independent, relationship-centric** view that scoping and spread-analysis need, and (with retention) the **history** to reconstruct a long campaign. A compromised host's own record may be tampered, but the network's record of who-talked-to-whom is independent. When an org asks "how bad is it, how did it happen, what did we lose, are they gone?", network DFIR — pivoting for scope, reconstructing entry and spread, quantifying exfiltration, verifying eradication — provides answers no single host can, correlated with endpoint and identity for the complete story. It's the culmination of the whole track's data and techniques, applied under the pressure of a real, large-scale incident.`,
      sample: {
        lang: 'text',
        caption: 'Network DFIR: answering the incident’s core questions at scale',
        code: `Incident: suspected major breach. Network data answers:

SCOPE:   pivot on C2 IP + JA3 + domain across 90d flow/Zeek
         -> 14 hosts involved (not the 2 first suspected)
ENTRY:   timeline -> patient-zero downloaded payload 5 wks ago (T-35d)
SPREAD:  east-west flow -> SMB/RDP path patient-zero -> 12 hosts -> DC
EXFIL:   flow volume + carved sessions -> 22 GB to 45.77.10.20 (finance)
CONTAIN: sinkhole C2 domains, block IP, quarantine 14 hosts via NAC
ERADICATE-VERIFY: post-cleanup, 0 beaconing to any known C2 -> clear`,
        output: `Network DFIR answers scope (pivot across all hosts), entry &
spread (timeline + east-west reconstruction), exfil (volume +
carving), and eradication verification (beaconing gone?) - at
scale, from a host-independent view, correlated with endpoint +
identity. Only possible with retained, queryable telemetry.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a large-scale incident, why is network data especially valuable for determining the *scope* (which hosts are involved) and *spread* of a compromise?',
        options: [
          'Network data shows the attacker’s intentions',
          'The network provides an environment-wide, host-independent, relationship-centric view: pivoting on indicators across (long-retention) flow/Zeek reveals every host that contacted the C2 or matched the malicious fingerprint, and east-west connection analysis reconstructs the lateral-movement path — scoping and spread across all hosts at once, from a record a compromised host cannot tamper with',
          'It replaces the need for endpoint and identity data',
          'Scope can only be determined host by host manually',
        ],
        answer: 1,
        explain:
          'Scoping and spread are inherently about relationships across many hosts, which is exactly what network telemetry captures. Pivoting on indicators (C2 IP, JA3, domain) across retained flow/Zeek finds every host involved — often far more than initially suspected — and east-west connection analysis reconstructs the lateral-movement path. Crucially, the network’s who-talked-to-whom record is independent of any host the attacker may have tampered with, and long retention lets you reconstruct a months-long campaign. It doesn’t replace endpoint/identity data (needed to confirm execution and accounts) but provides the fleet-wide, host-independent view that scoping and spread require — the network arm of DFIR.',
        hint: 'Which layer sees who-talked-to-whom across all hosts at once, independent of any single (possibly tampered) host?',
      },
    },

    {
      id: 'bnet-p-10',
      title: 'Defending OT and IoT networks',
      read: `Beyond traditional IT, pro defenders increasingly protect **Operational Technology (OT)** — the industrial control systems (ICS/SCADA) running power grids, factories, water treatment, and critical infrastructure — and the sprawl of **IoT** devices. These networks have distinct constraints that make network monitoring especially important and especially different.

## Why OT/ICS is different

- **Availability and safety dominate** — in IT, confidentiality often leads; in OT, **availability and safety** are paramount. A control system going down can halt production or endanger lives, so anything that risks disruption (aggressive scanning, blocking, patching, rebooting) is dangerous. You cannot casually run a vuln scan on a PLC — it may crash it.
- **Fragile, legacy, un-patchable devices** — PLCs, RTUs, HMIs often run old, proprietary software that can't be patched, doesn't tolerate unexpected traffic, and has weak or no authentication. Endpoint agents (EDR) usually can't be installed. So **network monitoring is the primary defensive visibility** — you can't instrument the devices, but you can watch their traffic.
- **Specialised protocols** — Modbus, DNP3, EtherNet/IP, PROFINET, S7, BACnet — industrial protocols, mostly without built-in security (no auth/encryption), often decades old. Detection needs OT-protocol-aware tools (Zeek has ICS parsers; specialised OT-monitoring products understand these protocols and their commands).
- **Deterministic, predictable traffic** — OT networks are far more static and predictable than IT (the same devices doing the same things on a cycle), which makes **baselining and anomaly detection unusually effective** — a deviation from the tight normal (a new device, an unexpected command, a connection that never happens) stands out clearly.

## Defending OT

- **Segmentation is paramount** — the **Purdue model** layers OT into zones (from enterprise IT down through operations to the physical process), with strict controls between them and a **DMZ (IT/OT boundary)** isolating the control network from IT. Keeping OT segmented from IT (and from the internet) is the single most important control — many OT incidents come from IT compromise pivoting into a poorly-segmented OT network.
- **Passive monitoring** — because active scanning is risky, OT monitoring is heavily **passive** (taps/SPAN feeding OT-aware NSM), watching traffic without touching devices. Baseline the (predictable) normal and alert on any deviation: new device, unexpected protocol command (e.g. a "write" command to a controller from an unusual source, or reprogramming a PLC), traffic to/from the internet, or IT-to-OT connections that shouldn't exist.
- **Detect the dangerous commands** — OT-protocol-aware detection can flag not just connections but *what is being commanded* — a stop command, a setpoint change, a firmware upload to a controller — which is where OT attacks manifest (e.g. Stuxnet, the Ukraine grid attacks, TRITON manipulated the process via these protocols).
- **IoT** shares many traits — unmanageable, un-agentable, weakly secured devices best defended by network segmentation (isolate IoT from everything sensitive), monitoring, and NAC (control what joins).

## The pro perspective

OT/IoT flips some assumptions: availability/safety over confidentiality, no endpoint agents, fragile devices you must not disrupt, insecure legacy protocols — making **network monitoring the primary defensive tool** and **segmentation the primary control**. The predictability of OT traffic makes anomaly detection powerful, and OT-protocol awareness lets you see the dangerous *commands*, not just connections. As IT and OT converge and critical infrastructure is increasingly targeted, applying network defence to these environments — passively, protocol-aware, segmentation-first, safety-conscious — is a growing and vital frontier for the network defender.`,
      sample: {
        lang: 'text',
        caption: 'OT monitoring: passive, protocol-aware, baseline-driven',
        code: `OT network (Purdue-segmented, IT/OT DMZ isolating it):

  Passive tap -> OT-aware NSM (Modbus/DNP3/S7 parsers)
  Baseline (OT traffic is predictable):
    HMI-1 -> PLC-3  reads every 500ms   (normal)
    Engineering WS -> PLCs  occasional config (normal, scheduled)

  ANOMALIES (deviation from tight normal = high signal):
    NEW device appears on the OT segment          -> alert
    IT host 10.5.0.9 -> PLC-3 : Modbus WRITE      -> alert (IT->OT!)
    unexpected "firmware upload" to PLC-3          -> CRITICAL
    connection PLC-3 -> internet                   -> alert (never happens)`,
        output: `OT flips assumptions: availability/safety first, no agents,
fragile insecure legacy devices -> network monitoring is PRIMARY,
segmentation (Purdue + IT/OT DMZ) is the key control, and
monitoring is PASSIVE + protocol-aware. Predictable traffic makes
anomaly detection strong; watch the dangerous COMMANDS, not just
connections.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is passive network monitoring (rather than endpoint agents or active scanning) the primary defensive visibility in OT/ICS environments?',
        options: [
          'OT devices are perfectly secure and need no monitoring',
          'OT devices are often fragile, legacy, un-patchable systems that cannot run endpoint agents and may crash under active scanning, while availability/safety are paramount — so passively watching their (predictable) network traffic with OT-protocol-aware tools provides visibility without touching or risking the devices, and baselining makes deviations stand out clearly',
          'OT networks have no traffic to monitor',
          'Active scanning is always safe on OT',
        ],
        answer: 1,
        explain:
          'OT prioritises availability and safety, and its devices (PLCs, RTUs, HMIs) are frequently old, proprietary, un-patchable, can’t host agents, and may crash from unexpected traffic — so active scanning and endpoint agents are risky or impossible. That makes passive network monitoring (taps/SPAN feeding OT-protocol-aware NSM) the primary visibility: it watches traffic without touching devices. And because OT traffic is highly predictable, baselining and anomaly detection are unusually effective, flagging new devices, unexpected commands (writes/firmware uploads to controllers), and IT→OT or OT→internet connections — with segmentation (Purdue model, IT/OT DMZ) as the key control.',
        hint: 'If you can’t install agents, can’t safely scan, and mustn’t disrupt the devices, what’s left — and why does OT’s predictability help?',
      },
    },

    {
      id: 'bnet-p-11',
      title: 'The defender’s edge and its limits',
      read: `Before the capstone, step back to the strategic picture a pro network defender must hold: where network defence has genuine, enduring advantages, where its limits lie, and how it fits into the whole security program. This judgement — knowing what the network can and can't do, and combining it wisely with other layers — is what distinguishes a pro.

## Where the network defender has an enduring edge

- **Independence from the host** — the network's record of who-talked-to-whom is separate from any endpoint an attacker may control ("the network doesn't lie"). Even a fully compromised host must communicate, and that's visible.
- **Coverage of the un-agentable** — IoT, OT, appliances, printers, guest devices, BYOD — anything you can't put an agent on, the network still sees.
- **Relationship and scope visibility** — the environment-wide view of connections that scoping, spread analysis, and lateral-movement detection need — a vantage no single host has.
- **Behaviour that attackers can't avoid** — to act, malware must communicate (beacon, spread, exfiltrate), producing behavioural signals (timing, volume, patterns) that survive even encryption. This is durable against evasion.
- **History for hunting and DFIR** — long-retention metadata (flow/Zeek) enables reconstructing long campaigns and hunting across time.

## The limits (be honest about them)

- **Encryption erodes content and metadata** — the shrinking-visibility trend; content is largely gone, and even SNI/DNS are going. Network detection increasingly rests on behaviour and fingerprints, not content.
- **Can't see what doesn't cross a sensor** — visibility gaps (unmonitored segments, cloud, VPN tunnels, direct host-to-host) are silent blind spots.
- **Behaviour is inferential** — the network shows *that* and *how much* and *to where/when*, but often not *what* or *why* or *which process/user* — needing endpoint/identity to complete the picture.
- **"Anomalous ≠ malicious"** — network anomalies are leads requiring human/context validation, not verdicts.
- **Scale and cost** — full visibility at scale is a real data-engineering and cost problem; you make retention and coverage trade-offs.

## The strategic synthesis: layers, not silos

The pro conclusion is that **no single layer is sufficient**, and the network is one powerful, complementary layer among several:

- **Network** — independent, wide, behavioural, historical; but increasingly content-blind and inferential.
- **Endpoint (EDR)** — sees plaintext, processes, users, intent on the host; but only where agents run and can be blinded on a compromised host.
- **Identity (ITDR)** — the modern battleground of credentials/tokens/directory; the perimeter as identity.
- **Application/cloud logs** — the service's own view of its plaintext activity.

Each covers the others' blind spots: network catches what endpoint can't instrument; endpoint sees what network can't decrypt; identity sees credential abuse; application logs see the plaintext transaction. **Correlation across them** — network says A→B on 445, endpoint confirms the execution, identity shows the account — is where the complete, high-confidence picture emerges. The pro network defender is expert in the network layer *and* fluent in how it combines with the others, knowing precisely what to reach for when.

The enduring truth: attackers must communicate, so the network will always have signal — but as content encrypts, that signal is increasingly behavioural, and the network's role narrows to one (vital) layer in a defence-in-depth of network + endpoint + identity + application. Mastery is wielding the network's real strengths, respecting its real limits, and correlating across layers for the full picture.`,
      sample: {
        lang: 'text',
        caption: 'The network as one layer; correlation completes the picture',
        code: `An intrusion, seen from each layer (each partial, together complete):

  NETWORK:   10.0.0.31 -> C2 (beaconing), then -> 12 peers on 445,
             then 22 GB out.  (that/how-much/where/when - independent,
             wide, historical; but WHAT process? WHICH user? unclear)
  ENDPOINT:  injected thread in a browser made the C2 conn; PsExec
             ran on the 12 peers.  (the WHAT/process - but only on
             agented hosts, and can be blinded)
  IDENTITY:  stolen svc-admin creds used for the lateral movement.
             (the WHO - the credential abuse)
  APP/CLOUD: finance DB export logged.  (the plaintext transaction)

Correlated -> the complete, high-confidence story. No layer alone.`,
        output: `Network's edge: host-independent, wide, behavioural (attackers
MUST communicate), historical. Limits: encryption erodes
content, blind spots, inferential, anomalies need validation.
So it's ONE powerful layer - correlate with endpoint + identity
+ application for the full picture. Mastery = strengths, limits,
and correlation.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the mature, strategic view of network defence’s place in a security program?',
        options: [
          'The network layer alone is sufficient for detection',
          'It is one powerful, complementary layer with enduring strengths (host-independent, wide coverage including un-agentable devices, behavioural signals attackers can’t avoid, historical visibility) and real limits (encryption erodes content, blind spots, inferential, anomalies need validation) — so it must be combined and correlated with endpoint, identity, and application/cloud layers, each covering the others’ blind spots, for the complete picture',
          'Endpoint detection has made network defence obsolete',
          'Network and endpoint see exactly the same things',
        ],
        answer: 1,
        explain:
          'The pro synthesis is that no single layer suffices. The network has durable, distinctive strengths — it’s independent of any compromised host, covers devices you can’t instrument, captures behaviour attackers can’t avoid (they must communicate), and provides historical, relationship-wide visibility — but also real limits: encryption erodes content and even metadata, it can’t see what doesn’t cross a sensor, it’s often inferential (that/how-much/where, not what/who/why), and its anomalies are leads needing validation. So it’s one vital layer to be correlated with endpoint (plaintext, process, intent), identity (credential abuse), and application/cloud logs (the transaction) — each covering the others’ blind spots. Mastery is wielding its strengths, respecting its limits, and correlating across layers.',
        hint: 'Is the network self-sufficient, obsolete, or one powerful layer that must be correlated with endpoint/identity/application?',
      },
    },

    {
      id: 'bnet-p-12',
      title: 'Capstone: an intelligence-led network defence program',
      read: `Tie the entire network track together into what a pro network defender leads: an **intelligence-led, engineered, continuously-validated network defence program** — from architecture to detection to hunting to response — proven against realistic adversaries and integrated with the wider security program.

## The program, assembled

**Architecture & visibility (contain and see)**
- Defence-in-depth zoning and zero-trust micro-segmentation containing breaches; NAC controlling access; sensors at all key choke points (on-prem taps + cloud flow logs/mirroring; OT passive monitoring where relevant); Zeek + Suricata + flow + DNS + selective full capture (Arkime) centralized, at scale, with tiered long retention. Blind spots mapped and closed.

**Detection (known, unknown, and evasive)**
- Signatures + threat intel (known-bad); behavioural detection (beaconing, exfil, tunnelling, lateral movement) that survives encryption; encrypted-traffic analysis (JA3/JARM, cert/CT monitoring, fingerprint stacking); protective DNS; ML/NDR anomaly detection as an explainable lead-generating layer; detection of advanced C2 and evasion. All detections version-controlled, tested, ATT&CK-mapped, tuned.

**Intelligence (be specific and proactive)**
- Threat-intel integration and adversary-infrastructure tracking (pivoting, CT/JARM monitoring) — proactively blocking and detecting the infrastructure of the actors that threaten you, staying ahead of IOC rotation.

**Deception & hunting (clean signal + proactive)**
- Internal honeypots/breadcrumbs for near-zero-FP lateral-movement detection; a hunting program using data-science methods over the telemetry, finding what detection missed and feeding new detections.

**Response (act and reconstruct)**
- Network DFIR at scale (pivoting for scope, entry/spread reconstruction, exfil quantification, eradication verification), integrated containment (isolate/sinkhole/block), DDoS mitigation upstream, all correlated with endpoint and identity.

## Validate and measure continuously

Run intelligence-led adversary emulation of the actors that threaten you — full network TTP chains — and measure detection coverage (network ATT&CK map), MTTD per technique, and containment. Close gaps and re-validate. Track coverage, MTTD/MTTR, detection quality (FP rates), and visibility coverage over time, trending the right way.

## The measure of a pro

A pro network defender can say, with evidence: "The architecture contains breaches and forces attacks through monitored choke points; I have visibility everywhere it matters, at scale, with long retention; my validated detections cover known, unknown, encrypted, and evasive threats, mapped to ATT&CK and tuned; I track the adversaries' infrastructure proactively; deception and hunting catch what detection missed; I can reconstruct and respond to a large incident at scale; and I correlate network with endpoint and identity for the complete picture — with coverage, MTTD, and quality metrics improving each quarter, validated by emulating the threats that actually target us."

## The whole arc

You now span the full journey: from a first \`ping\` and reading a single packet, through NSM, architecture, encrypted-traffic analysis, and the frontier of NDR, evasion, and OT — to leading an intelligence-led network defence program. The enduring principle runs through all of it: **attackers must communicate, so the network always has signal** — and the pro's job is to engineer the visibility, detection, deception, hunting, intelligence, and response to find that signal (increasingly behavioural, as content encrypts), contain the attack by design, prove it works against real adversaries, and correlate the network's view with endpoint and identity for the complete picture. Keep the loop turning — architect, see, detect, hunt, validate, improve — because the adversary keeps evolving, and so must the defence.

> The network doesn't lie. Learn to read what it's telling you, at every scale and through every layer of encryption, and you can see the attacker who thinks they're invisible — then contain them, reconstruct what they did, and be ready for the next.`,
      sample: {
        lang: 'text',
        caption: 'An intelligence-led network defence program: the pro scorecard',
        code: `Domain               Built                    Validated (emulation)   Metric
--------------------------------------------------------------------------------
Architecture         zoned + micro-seg + NAC  lateral contained       0 flat paths
Visibility @ scale   taps+cloud+long retention coverage confirmed      95% choke pts
Detection (all kinds)sig+behav+ETA+DNS+NDR    actor chain detected     MTTD 5m
Intel + infra track  feeds + pivoting/CT/JARM proactive blocks landed  +40% pre-block
Deception + hunting  honeypots + DS hunting   found unknown C2         dwell -70%
Response @ scale     DFIR + contain + DDoS    IR drill + tabletop      MTTR 40m
Cross-layer          net+endpoint+identity    correlated in emulation  full-picture

Validated by emulating the adversaries that target us. Improving quarterly.`,
        output: `Architected to contain, visible at scale, detecting known +
unknown + encrypted + evasive, intelligence-led and proactive,
deception + hunting for the rest, DFIR + response at scale, and
correlated across layers - all validated against real adversaries
and measured, improving. That is an intelligence-led network
defence program. The network doesn't lie; learn to read it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the essential principle that runs through the entire network defence discipline, from reading a single packet to leading an intelligence-led program?',
        options: [
          'Encryption makes the network completely opaque, so give up',
          'Attackers must communicate to act, so the network always carries signal (increasingly behavioural as content encrypts); the defender’s job is to engineer visibility, detection, deception, hunting, intelligence and response to find that signal, contain attacks by design, validate it works against real adversaries, and correlate the network view with endpoint and identity for the complete picture',
          'One perfect tool solves network defence',
          'Network defence is obsolete',
        ],
        answer: 1,
        explain:
          'The unifying principle is that attackers cannot act without communicating — beaconing, spreading, exfiltrating — so the network always has signal, and that signal is independent of any host the attacker controls. As encryption erodes content, the signal becomes increasingly behavioural (timing, volume, patterns) and fingerprint-based, but it endures. The defender’s job across the whole discipline is to engineer the visibility, layered detection (known/unknown/encrypted/evasive), deception, hunting, intelligence, and response to find that signal, contain attacks by design, validate it against real adversaries, and correlate the network’s view with endpoint and identity for the complete, high-confidence picture — a continuous, improving program, not a single tool or a one-time setup.',
        hint: 'What must every attacker do to act, and what does that guarantee about the network — even as encryption grows?',
      },
    },
  ],
}

export default level
