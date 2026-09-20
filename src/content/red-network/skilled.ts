import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Advanced network attack and evasion',
  summary:
    'Operator-grade network attacking: multi-hop pivoting through chained footholds, evading IDS/IPS, layer-2 attacks (VLAN hopping and switch abuse), attacking network infrastructure itself, advanced and enterprise wireless, NAC bypass, and covert channels for exfiltration and command-and-control. Throughout, the defensive architecture that stops each one — because a skilled tester delivers the blueprint for a resilient network. Everything is practised only on your own lab or networks you are contracted to test.',
  outcomes: [
    'Chain multi-hop pivots to reach deeply segmented networks',
    'Evade IDS/IPS with fragmentation, timing and decoys, and know the limits',
    'Perform layer-2 attacks including VLAN hopping, and defend against them',
    'Attack network infrastructure (routers, switches) and harden it',
    'Understand evil-twin and enterprise-wireless attacks and defences',
    'Explain covert channels (DNS tunnelling, C2) and how to detect them',
  ],
  steps: [
    {
      id: 'rnet-s-01',
      title: 'Multi-hop pivoting',
      read: `Intermediate pivoting reached one hidden network through one foothold. Real networks are layered more deeply, and **multi-hop (chained) pivoting** reaches segments that are two, three, or more hops away. Authorized engagements only.

## The scenario

Segmentation is often tiered: your attacker VM reaches the user network; a user host reaches an application network; an app host reaches the database network; nothing lets you jump straight to the databases. Each tier is a firewall boundary. To reach the database network you must **chain pivots**: through foothold A to reach B, compromise B, then pivot **through B as well** to reach the next tier.

## How to chain tunnels

The mechanics stack. With SSH you nest tunnels; with modern tools it is cleaner:

- **ligolo-ng** — add each compromised host as an "agent"; each presents its reachable networks as routes, and you chain them so your traffic flows attacker → A → B → C transparently. This is the current favourite for multi-hop because it avoids fragile proxychains stacking.
- **chisel / SSH** — nest a second SOCKS proxy *through* the first: your tool → proxy1 (via A) → proxy2 (via B) → target. It works but grows fiddly with depth.

## The key idea: routes compound

Each hop only needs to reach the *next* hop, not the final target. You are building a chain of relays where each link forwards to the one beyond it. Latency and fragility grow with depth, so you keep the chain as short as the topology allows and prefer tools built for it.

## Why it matters

Multi-hop pivoting is how a breach reaches the crown jewels in a well-segmented network — and demonstrating it is the strongest possible statement about **defence in depth**. If you can chain three pivots to the database tier, the client's segmentation is not actually containing a breach. The mirror is equally clear: **each boundary should also authenticate and monitor east-west traffic**, so that even a foothold on one tier cannot freely relay to the next. In the lab, build a three-network topology and chain two pivots to reach the innermost segment, documenting each hop.`,
      sample: {
        lang: 'text',
        caption: 'Chaining pivots through tiered segmentation',
        code: `attacker  --> A (user net)          A also reaches app net
             --> [pivot through A] --> B (app net)
                                       B also reaches db net
             --> [pivot through B] --> C (db net)  <- the goal

Each hop only needs to reach the NEXT hop.
ligolo-ng: add A and B as agents; routes compound ->
your tools reach C transparently: attacker -> A -> B -> C.`,
        output: `Multi-hop pivoting reaches deeply segmented tiers by chaining
relays. Demonstrating it proves segmentation is NOT containing a
breach. Mirror: authenticate + monitor east-west traffic at every
boundary, not just the perimeter.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In multi-hop pivoting, what does each hop in the chain actually need to be able to reach?',
        options: [
          'The final target directly, from every hop',
          'Only the next hop in the chain — each compromised host forwards to the one beyond it, so routes compound (attacker → A → B → C) and you reach a deeply segmented tier without any single host reaching the target directly',
          'The attacker’s machine directly, from the final target',
          'The internet, so it can download tools',
        ],
        answer: 1,
        explain:
          'Multi-hop pivoting builds a chain of relays through tiered segmentation. Each compromised host only needs connectivity to the next hop, not to the ultimate target: foothold A reaches B, B reaches C, and so on. By chaining tunnels (cleanly with ligolo-ng, or by nesting SOCKS proxies with chisel/SSH), the routes compound so your tools transparently reach the innermost segment even though no single host can reach it directly. This mirrors how real breaches reach crown jewels in segmented networks, and demonstrating it proves that segmentation alone is not containing a breach — the fix is to authenticate and monitor east-west traffic at every boundary, not just the perimeter.',
        hint: 'Does foothold A need to see the database tier, or just the next machine in the chain?',
      },
    },

    {
      id: 'rnet-s-02',
      title: 'Evading IDS and IPS',
      read: `A skilled tester (on authorized red-team work) must understand **IDS/IPS evasion** — not to be a better criminal, but to test whether the client's detection actually works and to advise them honestly about its limits.

## What you are evading

- An **IDS** (intrusion detection system) watches traffic and alerts on suspicious patterns; an **IPS** also *blocks* them inline. Both work largely by **signatures** (known-bad byte patterns) and some anomaly detection. Snort and Suricata are the standard engines.

## Evasion techniques (and why each works)

- **Timing / slow scans** — signatures often key on *rate* (many connections fast). Slowing right down (\`nmap -T1\`, or spacing probes over hours) can drop below thresholds. The cost is time.
- **Fragmentation** — split packets (\`nmap -f\`) so a signature expecting a contiguous pattern in one packet does not match. Modern engines reassemble, so this is weaker than it was.
- **Decoys** — \`nmap -D\` mixes your real scan among spoofed source addresses so the true origin is hard to pick out.
- **Source port / protocol tricks** — scanning from a trusted-looking source port (53, 80) can slip past naive rules.
- **Payload encoding / obfuscation** — for exploits, changing the byte pattern (encoders, custom code) evades signature matching — the same idea as custom tooling.

## The honest limits

Evasion is an arms race you usually lose against a well-tuned, modern stack: reassembly defeats fragmentation, anomaly detection catches slow-and-weird, and encrypted C2 still shows *behavioural* signals (beaconing, unusual egress). **The most reliable "evasion" is blending into legitimate traffic**, not clever packet tricks.

## Why this is defensive

Testing evasion answers the client's real question: *would we have caught this?* If your slow, fragmented, decoyed attack sailed through, their detection is signature-only and brittle — a finding. If it lit up alerts, their tuning is good — reassure them. Either way you deliver truth about their detection, plus guidance (add anomaly/behavioural detection, tune thresholds, inspect encrypted-traffic metadata). In the lab, run scans at varying timing/fragmentation against a Suricata sensor and compare which trip alerts.`,
      sample: {
        lang: 'bash',
        caption: 'Evasion techniques and testing them against a sensor',
        code: `nmap -T1 target            # very slow: drop below rate thresholds
nmap -f target             # fragment packets (modern IDS reassembles)
nmap -D 10.0.0.7,10.0.0.8,ME target   # decoys hide the real source
nmap --source-port 53 target          # look like DNS

# Run each against a Suricata/Snort sensor and see what alerts:
#   -> which techniques your client would (or would NOT) catch.`,
        output: `Reality: modern, well-tuned stacks defeat most packet tricks
(reassembly, anomaly detection). Most reliable "evasion" =
blending into legitimate traffic. The value is the ANSWER:
"would we have caught this?" + tuning guidance.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'From a professional standpoint, what is the real value of testing IDS/IPS evasion on an engagement?',
        options: [
          'Proving you can always bypass any detection system',
          'Answering the client’s real question — "would we have detected this?" — since if slow/fragmented/decoyed attacks slip through, their detection is signature-only and brittle (a finding), and if they alert, their tuning is sound; either way you deliver truth plus tuning guidance',
          'Permanently disabling the client’s IDS',
          'Evasion has no defensive value and is purely offensive',
        ],
        answer: 1,
        explain:
          'Evasion testing is not about proving you are unstoppable — against a modern, well-tuned stack you usually cannot be, because reassembly defeats fragmentation and anomaly detection catches slow-and-weird traffic. Its value is diagnostic: it tells the client whether their detection would actually have caught the attack. If your slow, fragmented, decoyed attempts sailed through, their detection is signature-only and brittle — a real finding, with guidance to add anomaly/behavioural detection and inspect encrypted-traffic metadata. If it lit up alerts, their tuning is good and you can say so. Either outcome delivers honest truth about their detection posture, which is the point. (And the most reliable real-world "evasion" is blending into legitimate traffic, not packet tricks.)',
        hint: 'What question does the client actually need answered about their detection stack?',
      },
    },

    {
      id: 'rnet-s-03',
      title: 'VLAN hopping and layer-2 attacks',
      read: `Segmentation is often built with **VLANs** — logically separate networks on shared switch hardware. Skilled testers know the **layer-2 attacks** that defeat weak VLAN configurations, because "it's on a different VLAN" is a security claim worth testing.

## What VLANs are

A **VLAN** (Virtual LAN) splits one physical switch into isolated broadcast domains identified by a **tag** (802.1Q). Traffic between VLANs must go through a router/firewall, so VLANs are used to separate, say, users from servers from management. The isolation is only as strong as the switch configuration.

## VLAN hopping

Two classic techniques break VLAN isolation:

- **Switch spoofing** — some switch ports auto-negotiate "trunk" mode (which carries *all* VLANs). If an access port will negotiate a trunk (DTP enabled), an attacker's machine can pretend to be a switch, form a trunk, and then reach **every VLAN**. The fix: disable DTP, hard-set access ports to access mode.
- **Double tagging** — craft a frame with *two* 802.1Q tags; the first switch strips the outer tag and forwards the frame, still carrying the inner tag, into a VLAN the attacker should not reach. It is one-way but real. The fix: don't use the native VLAN for data, and tag the native VLAN.

## Other layer-2 attacks

- **MAC flooding** — overflow the switch's MAC table so it "fails open" and floods frames like a hub (older switches), enabling sniffing. Fix: **port security** (limit MACs per port).
- **STP (spanning tree) attacks** — pretend to be the root bridge to reroute traffic through you. Fix: BPDU guard / root guard.
- **DHCP starvation + rogue DHCP** — exhaust the real DHCP pool, then serve your own. Fix: DHCP snooping.

## Why layer 2 is dangerous

Layer-2 attacks undermine the *foundations* — they defeat segmentation and interception defences at a level above which everything else assumes trust. They require local access (a port, or a compromised host that can inject frames), which is why physical and NAC controls matter. The defensive mirror is a hardened switch: no auto-trunking, port security, DHCP snooping, dynamic ARP inspection, BPDU guard, and a properly configured native VLAN. In the lab (with a switch that supports it, or a virtual lab), attempt switch-spoofing/double-tagging and then apply the hardening that stops it.`,
      sample: {
        lang: 'text',
        caption: 'VLAN hopping techniques and their switch-config fixes',
        code: `SWITCH SPOOFING:
  attacker port auto-negotiates a TRUNK (DTP on) ->
  attacker "becomes a switch" -> reaches ALL VLANs
  FIX: disable DTP; hard-set ports to access mode

DOUBLE TAGGING:
  frame with TWO 802.1Q tags -> first switch strips outer ->
  inner tag carries it into another VLAN (one-way)
  FIX: don't use native VLAN for data; tag the native VLAN

OTHER L2: MAC flooding (fix: port security),
          STP root spoof (fix: BPDU/root guard),
          rogue DHCP (fix: DHCP snooping)`,
        output: `Layer-2 attacks defeat SEGMENTATION at its foundation. "It's on
another VLAN" is only true if the switch is hardened: no auto-
trunk, port security, DHCP snooping, DAI, BPDU guard, tagged
native VLAN. Requires local access (why NAC/physical matter).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a "switch spoofing" VLAN-hopping attack, how does the attacker reach all VLANs, and what is the fix?',
        options: [
          'By cracking the VLAN encryption key; the fix is a longer key',
          'By exploiting a switch port that auto-negotiates trunking (DTP enabled): the attacker’s machine forms a trunk as if it were a switch, and a trunk carries all VLANs — the fix is to disable DTP and hard-set access ports to access mode',
          'By sending a deauthentication frame to the switch',
          'By guessing the native VLAN’s IP address',
        ],
        answer: 1,
        explain:
          'A trunk port carries traffic for all VLANs (that is how switches interconnect). In switch spoofing, the attacker exploits a port that will auto-negotiate trunk mode via DTP: the attacker’s machine pretends to be a switch, negotiates a trunk, and thereby gains reachability to every VLAN — defeating the segmentation. The fix is configuration hygiene: disable DTP and explicitly configure end-user ports as access ports so they never become trunks. VLANs are not encrypted, so cracking a key is irrelevant; deauth is a Wi-Fi technique; and reaching a VLAN is about trunking, not guessing an IP. Double tagging is the other classic hop (fixed by tagging/segregating the native VLAN), and broader layer-2 hardening adds port security, DHCP snooping, DAI, and BPDU guard.',
        hint: 'What kind of port carries all VLANs, and what lets an attacker’s machine become one?',
      },
    },

    {
      id: 'rnet-s-04',
      title: 'Attacking network infrastructure',
      read: `Beyond the hosts, the **network devices themselves** — routers, switches, firewalls, load balancers — are high-value targets. Compromise the infrastructure and you can reroute, intercept, or open the whole network. Authorized testing only.

## Why devices are targets

A router or switch sees (and controls) traffic for everything attached to it. Owning one can mean: silently mirroring traffic, altering routing to become a MITM for whole subnets, opening firewall holes, or establishing durable, hard-to-detect persistence *below* the hosts everyone monitors. Yet devices are often the **least hardened** things on a network — old firmware, default or weak credentials, and legacy management protocols.

## Common infrastructure attacks

- **Default / weak credentials** — management interfaces (SSH, Telnet, web, SNMP) left at defaults or with weak passwords. Still one of the most common real findings.
- **SNMP write** — the \`private\` community string (or a weak one) with **write** access lets you *change* device configuration, or read the whole config (which often contains password hashes and the network map). Recall SNMP is UDP — enumerate it.
- **Legacy management** — Telnet and unencrypted HTTP management expose credentials to capture; SSHv1 and old SNMP versions are weak.
- **Firmware vulnerabilities** — routers/firewalls/VPN appliances have had many severe, actively-exploited CVEs; an unpatched edge device is a classic entry point.
- **Configuration extraction** — pulling a device config (via SNMP, TFTP, or management access) hands you credentials, routing, ACLs, and the network's structure.

## The impact

Infrastructure compromise is often the *worst-case* finding because of leverage: one owned core switch or firewall can undo segmentation, enable network-wide interception, and persist invisibly. It is exactly why management planes must be tightly controlled.

## The defensive mirror

Harden the management plane: change all defaults, strong unique credentials, encrypted management only (SSH/HTTPS, SNMPv3), management on a **separate out-of-band network**, patch firmware promptly, and restrict who can reach device management at all. In the lab, enumerate SNMP on a virtual router, read its config with the community string, and then lock it down to SNMPv3 with management restricted.`,
      sample: {
        lang: 'bash',
        caption: 'Reading a device config via a weak SNMP string (lab)',
        code: `# Enumerate SNMP (UDP!) - default/weak community strings are common
onesixtyone 10.0.0.1 -c community-strings.txt

# Read the device with a valid read string:
snmpwalk -v2c -c public 10.0.0.1

# With a WRITE string (e.g. 'private'), config can be CHANGED or
# exfiltrated (via TFTP) - full device control.`,
        output: `Owning a router/switch = mirror traffic, reroute for MITM, open
firewall holes, persist BELOW the hosts. Devices are often LEAST
hardened (old firmware, default creds, legacy mgmt). Fix: change
defaults, SSH/HTTPS/SNMPv3 only, out-of-band mgmt net, patch,
restrict mgmt access.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is compromising a core network device (router, switch, firewall) often considered a worst-case finding?',
        options: [
          'Because network devices store the most user files',
          'Because of leverage — a device sees and controls traffic for everything attached to it, so owning one can undo segmentation, enable network-wide interception or rerouting, open firewall holes, and provide durable persistence below the hosts defenders monitor',
          'Because devices are the only systems with antivirus',
          'Because it is the only way to run a port scan',
        ],
        answer: 1,
        explain:
          'Network devices sit at choke points: a router or switch handles traffic for every host attached to it, and a firewall enforces the boundaries between segments. Compromising one therefore grants enormous leverage — you can mirror or reroute traffic to become a MITM for whole subnets, open holes in the firewall, undo the segmentation the client relies on, and persist in a place (the device firmware/config) that host-based monitoring and EDR never see. That combination of control and stealth is why infrastructure compromise is often the worst-case outcome. It is made worse by devices frequently being the least-hardened assets (old firmware, default/weak credentials, legacy management), and countered by locking down the management plane: strong unique creds, encrypted management (SSH/HTTPS/SNMPv3), out-of-band management, prompt patching, and restricted access.',
        hint: 'Think about what a single core device controls, and where it sits relative to host monitoring.',
      },
    },

    {
      id: 'rnet-s-05',
      title: 'Advanced and enterprise wireless',
      read: `Intermediate wireless cracked a WPA2 pre-shared key. Skilled wireless attacks the *clients* and the *enterprise* authentication — always against your own equipment or an authorized engagement.

## Evil twin: attacking the client, not the password

An **evil twin** is a rogue access point impersonating a legitimate network (same SSID). Devices configured to auto-connect to a remembered network may join the attacker's AP instead — especially if the attacker deauths them off the real one or simply presents a stronger signal. Once a client connects to your AP, you are its gateway: a full MITM, captive-portal credential phishing, and traffic manipulation follow. This defeats the "strong Wi-Fi password" defence entirely, because it targets the *client's willingness to connect*, not the password.

## Attacking WPA2/WPA3-Enterprise

Enterprise Wi-Fi uses **802.1X/EAP** with a **RADIUS** server and per-user credentials — much stronger than a shared key. But it has its own attack: a rogue AP + rogue RADIUS server (tools like **hostapd-wpe**, **eaphammer**) can capture the client's EAP authentication. With EAP methods like MSCHAPv2, the captured challenge/response is **crackable offline** to recover the user's credentials — *if the client does not validate the RADIUS server's certificate*. That "if" is the whole vulnerability.

## The critical defence: certificate validation

Enterprise wireless is secure **only when clients are configured to validate the RADIUS server certificate** (check the CA and server name). A client that connects to any RADIUS server presenting any certificate will happily authenticate to the attacker's rogue server and leak its credentials. This is the number-one enterprise Wi-Fi misconfiguration.

## WPA3 and the mirror

**WPA3** improves things (SAE resists offline cracking of the PSK; enterprise modes strengthen protection), but rollout is uneven and downgrade/transition modes have their own edges. The defensive mirror: for personal, WPA3 or a long random passphrase; for enterprise, **enforce server-certificate validation** on every client (via configuration/MDM), use strong EAP methods, and monitor for rogue APs. In the lab, stand up an evil twin of your *own* SSID and observe a test client connect; then configure the client to validate certificates and watch the enterprise attack fail.`,
      sample: {
        lang: 'text',
        caption: 'Evil twin and enterprise Wi-Fi attacks, and the key defence',
        code: `EVIL TWIN (attacks the CLIENT):
  rogue AP with the same SSID (+ deauth / stronger signal) ->
  client auto-connects -> attacker is the gateway -> MITM,
  captive-portal cred phishing. Beats a strong Wi-Fi password.

ENTERPRISE (802.1X/EAP + RADIUS):
  rogue AP + rogue RADIUS (hostapd-wpe/eaphammer) captures EAP;
  MSCHAPv2 response -> crack OFFLINE ... but ONLY IF the client
  does NOT validate the RADIUS server certificate.`,
        output: `THE defence for enterprise Wi-Fi: clients MUST validate the
RADIUS server certificate (CA + name). Without it, clients leak
creds to any rogue RADIUS. Personal: WPA3 / long random pass.
Monitor for rogue APs. Own equipment / authorized only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What single client configuration determines whether a WPA2/WPA3-Enterprise network can be defeated by a rogue-AP-plus-rogue-RADIUS attack?',
        options: [
          'Whether the client uses a long Wi-Fi password',
          'Whether the client is configured to validate the RADIUS server’s certificate (its CA and server name) — if it does not, it will authenticate to the attacker’s rogue RADIUS and leak crackable EAP credentials; if it does, the rogue server is rejected and the attack fails',
          'Whether the client connects over 5GHz instead of 2.4GHz',
          'Whether the client has antivirus installed',
        ],
        answer: 1,
        explain:
          'Enterprise Wi-Fi (802.1X/EAP with a RADIUS server and per-user credentials) is strong in principle, but a rogue AP paired with a rogue RADIUS server (hostapd-wpe, eaphammer) can capture a client’s EAP exchange; with methods like MSCHAPv2 the captured challenge/response is crackable offline. The decisive factor is whether the client validates the RADIUS server’s certificate — checking the trusted CA and the expected server name. A client that validates will reject the attacker’s rogue RADIUS (which cannot present a legitimate certificate) and the attack fails; a client that accepts any certificate authenticates to the attacker and leaks its credentials. This is the number-one enterprise wireless misconfiguration, fixed by enforcing certificate validation on every client via configuration/MDM. There is no shared "Wi-Fi password" in enterprise mode, so passphrase length is irrelevant.',
        hint: 'The rogue RADIUS server cannot present a legitimate certificate — so what must the client check?',
      },
    },

    {
      id: 'rnet-s-06',
      title: 'Bypassing network access control',
      read: `**Network Access Control (NAC)** is meant to ensure only authorized, compliant devices get on the network — the control that would stop you plugging in a rogue laptop. Skilled testers know how NAC is bypassed, because clients rely on it and its gaps are real findings.

## What NAC does

NAC gates a device when it connects (wired or wireless): it may check the device is known (by **MAC address** or a certificate), authenticate it (often **802.1X**), and assess its **posture** (patched, AV running) before granting network access. Non-compliant or unknown devices are quarantined or denied.

## How NAC is bypassed

- **MAC authentication bypass (MAB) abuse** — many networks fall back to allowing devices by MAC (for printers, IP phones, cameras that can't do 802.1X). An attacker **clones the MAC** of such a device and inherits its access. Weak, MAC-only NAC is defeated by a single \`macchanger\`.
- **Piggybacking on an authorized device** — insert a small device (or bridge) *behind* an already-authenticated device (e.g. an IP phone) so the port stays authorized while the attacker rides the same connection. Hardware like a network tap or a transparent bridge enables this.
- **802.1X on the wire limitations** — classic 802.1X authenticates only at connection; if it does not re-authenticate or bind to the session, a bridge placed after authentication persists.
- **Exploiting exceptions** — guest networks, VoIP VLANs, and unmanaged ports are common gaps.

## The reality

NAC strength varies enormously. MAC-only NAC is trivially bypassed; full 802.1X with certificates and posture assessment is much harder. The honest finding is *which* kind the client has: "your NAC is MAC-based and was bypassed by cloning a printer's MAC" is a serious, specific result.

## The defensive mirror

Strong NAC uses **802.1X with certificates** (not just MAC), **re-authentication** and where possible **MACsec** (which cryptographically binds the link, defeating bridges), tight control of MAB exceptions, and monitoring for anomalies (a "printer" suddenly doing workstation things). In the lab, clone the MAC of an authorized device to bypass a MAC-based NAC, then note how certificate-based 802.1X would defeat the same attempt.`,
      sample: {
        lang: 'bash',
        caption: 'Bypassing MAC-based NAC by cloning an allowed device',
        code: `# Find an authorized device's MAC (e.g. a printer/IP phone) and clone it:
sudo ip link set eth0 down
sudo macchanger -m AA:BB:CC:11:22:33 eth0    # the printer's MAC
sudo ip link set eth0 up
# -> if NAC allows that device by MAC (MAB), you inherit its access.`,
        output: `MAC-only NAC (MAB) -> defeated by one macchanger.
Piggybacking behind an authorized IP phone -> rides the
authorized port. Honest finding names WHICH NAC: "MAC-based,
bypassed by cloning a printer." Fix: 802.1X + certs, re-auth,
MACsec, tight MAB exceptions, anomaly monitoring.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is MAC-based Network Access Control (MAB) considered weak, and what defeats the bypass?',
        options: [
          'MAC addresses are encrypted, so NAC cannot read them',
          'Because MAC addresses are easily cloned — an attacker copies the MAC of an allowed device (like a printer) and inherits its access — whereas certificate-based 802.1X (with re-authentication, and MACsec to bind the link) requires cryptographic proof a cloned MAC cannot provide',
          'Because MAB only works on wireless networks',
          'Because MAB requires a password that is always default',
        ],
        answer: 1,
        explain:
          'MAC authentication bypass exists because some devices (printers, IP phones, cameras) cannot perform 802.1X, so networks fall back to allowing them by MAC address. But a MAC address is trivially spoofable — a single macchanger command clones an authorized device’s MAC and inherits its network access. That is why MAC-only NAC is weak. Strong NAC uses 802.1X with certificates, which demand cryptographic proof of identity that cloning a MAC cannot satisfy; adding periodic re-authentication defeats "authenticate once then bridge in behind" tricks, and MACsec cryptographically binds the physical link to defeat transparent bridges. Tightly controlling MAB exceptions and monitoring for anomalies (a "printer" behaving like a workstation) round it out. The honest finding names which kind of NAC the client actually has.',
        hint: 'How hard is it to change your MAC address, and what kind of proof does certificate-based 802.1X require instead?',
      },
    },

    {
      id: 'rnet-s-07',
      title: 'Covert channels and DNS tunnelling',
      read: `Getting data *out* of a network (or commands *in*) past egress controls is its own craft. **Covert channels** hide traffic inside protocols the network allows, and the archetype is **DNS tunnelling**. Authorized testing only — to prove which egress paths are unmonitored.

## Why covert channels exist

Good networks restrict outbound traffic (egress filtering) and inspect it. But a few protocols almost always egress freely because the network cannot function without them — above all **DNS**. If you can encode data into DNS and the network resolves it, you have a channel out that most defenders do not watch closely.

## How DNS tunnelling works

You control an authoritative name server for a domain you own. The compromised host encodes data into **DNS queries** for subdomains of that domain (e.g. \`<base32-data>.tunnel.example.com\`); the query is dutifully forwarded by the internal resolver out to *your* name server, which decodes it and replies with more data encoded in the response. Two-way communication over DNS — no direct connection needed. Tools: **iodine**, **dnscat2**.

- **Slow but reliable** — DNS payloads are small, so throughput is low, but for commands and small exfil it is more than enough and remarkably hard to block (you cannot simply turn off DNS).

## Other covert channels

- **HTTPS to an innocuous host** — C2 traffic shaped to look like ordinary web browsing (domain fronting, categorised domains). The most common real-world channel.
- **ICMP tunnelling** — data in ping packets, where ICMP is allowed out.
- **Cloud services** — using a permitted SaaS/storage API as the channel, so traffic goes to a "trusted" destination.

## Detection and the mirror

Covert channels are detected **behaviourally**, not by signature: abnormal DNS *volume* or entropy (lots of long, random-looking subdomains), beacon-like *timing*, or connections to newly-seen/low-reputation domains. The defensive mirror: monitor and rate-limit DNS, force clients through inspected resolvers, egress-filter aggressively (default-deny outbound), and use DNS security tooling. Demonstrating that DNS tunnelling left your lab unnoticed is a strong finding — it shows a monitoring blind spot. In the lab, stand up dnscat2/iodine, tunnel a file out over DNS, and then observe the tell-tale volume/entropy a defender would look for.`,
      sample: {
        lang: 'text',
        caption: 'DNS tunnelling: exfil through a protocol nobody blocks',
        code: `compromised host                    attacker's name server
  encode data into a DNS query:       (authoritative for
  <base32-data>.tunnel.example.com     tunnel.example.com)
        |                                     ^
   internal resolver forwards it out ---------+
        v                                     |
   reply encodes data back <------------------+

Two-way comms over DNS. Slow but very hard to block (can't turn
DNS off). Others: HTTPS-shaped C2, ICMP tunnel, cloud APIs.`,
        output: `Detected BEHAVIOURALLY: abnormal DNS volume/entropy (long random
subdomains), beacon timing, low-reputation domains. Mirror:
inspected resolvers, DNS monitoring/rate-limits, default-deny
egress. Proving it went unnoticed = a monitoring-blindspot finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is DNS tunnelling such an effective covert channel, and how is it detected?',
        options: [
          'Because DNS traffic is encrypted end-to-end and invisible',
          'Because DNS almost always egresses freely (a network cannot function without name resolution), so data encoded into DNS queries reaches an attacker-controlled name server past egress filtering — and it is caught behaviourally, via abnormal DNS volume/entropy, beacon timing, and low-reputation domains, not by signature',
          'Because DNS tunnelling is faster than any other channel',
          'Because it requires no attacker-controlled infrastructure',
        ],
        answer: 1,
        explain:
          'DNS tunnelling works because DNS is one of the few protocols almost always allowed out — the network cannot operate without name resolution — and it is often not closely inspected. The compromised host encodes data into queries for subdomains of a domain the attacker controls; the internal resolver forwards them to the attacker’s authoritative name server, which decodes them and replies with encoded data, giving two-way communication past egress controls. It is slow (small DNS payloads) but very hard to block outright. Because the traffic is "valid" DNS, detection is behavioural: unusually high DNS volume, high-entropy/long random-looking subdomains, beacon-like timing, and connections to newly-seen or low-reputation domains. Defences force clients through inspected resolvers, monitor and rate-limit DNS, and default-deny egress. It does require attacker-controlled infrastructure (the authoritative name server), and DNS is not inherently encrypted.',
        hint: 'Which protocol can a network never simply turn off, and what kind of anomaly (not signature) gives the tunnel away?',
      },
    },

    {
      id: 'rnet-s-08',
      title: 'Command-and-control over the network',
      read: `A foothold is only useful if you can *operate* through it. **Command-and-control (C2)** is the channel between the operator and the implant — and running it well on the network is a skilled discipline, used only within authorized red-team scope.

## What C2 must do

Once an implant lands on a target, it needs to (a) reach the operator despite egress controls, and (b) do so without standing out. The C2 framework provides a **listener** (operator side) and a **beacon/implant** (target side) that checks in for tasks and returns results.

## Blending into the network

Detection hunts C2 by its network behaviour, so operators shape it to look normal:

- **Channel choice** — HTTPS on 443 to a plausible domain is the workhorse; DNS for restrictive egress; sometimes traffic through allowed SaaS. Choose what the target's egress actually permits.
- **Beacon timing + jitter** — a beacon that checks in every 60 seconds exactly is trivially spotted; randomised intervals (**jitter**) and long sleeps blur the pattern. The trade-off is responsiveness vs stealth.
- **Malleable profiles** — modern C2 lets you shape the traffic's headers/URIs to mimic a legitimate application, so it blends with real web traffic.
- **Redirectors and reputable-looking infrastructure** — as covered in the tradecraft mindset: disposable hops and valid TLS to a categorised domain.

## What the defender sees (the mirror)

Even shaped C2 leaves **behavioural** signals: periodicity (beaconing), consistent small request/response sizes, connections to newly-registered or low-reputation domains, and a workstation talking to an "external service" it never used before. **Network detection & response (NDR)** and traffic analytics hunt exactly these. So the defensive advice writes itself: baseline normal egress, alert on beaconing and new external destinations, inspect TLS metadata (JA3/SNI), and default-deny outbound.

## The honest framing

For an authorized red team, C2 tradecraft tests whether the client can *detect an operating adversary*, not just an initial exploit. If your beacon ran for a week unnoticed, that is a major finding about their egress monitoring; if their NDR flagged the beaconing on day one, that is a genuine strength. Either way, you deliver truth about detection. In the lab, run a beacon with and without jitter against a traffic-analysis tool and compare how visible the periodicity is.`,
      sample: {
        lang: 'text',
        caption: 'Shaping C2 to blend, and what still gives it away',
        code: `IMPLANT ---beacon (check in for tasks)---> redirector --> C2 server
  channel : HTTPS/443 to a plausible domain (or DNS if egress tight)
  timing  : long sleep + JITTER (not every 60s exactly)
  profile : mimic a real app's headers/URIs
  infra   : disposable redirectors, valid TLS, categorised domain

STILL DETECTABLE (behaviourally):
  periodicity/beaconing, uniform request sizes, new/low-rep domains,
  a host talking to an external service it never used before.`,
        output: `C2 tests whether the client detects an OPERATING adversary, not
just an exploit. Beacon unnoticed for a week = egress-monitoring
finding; NDR flags it day one = a real strength. Mirror: baseline
egress, alert on beaconing + new destinations, inspect TLS
metadata, default-deny outbound. Authorized scope only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Even well-shaped C2 (HTTPS, jitter, malleable profile) tends to be caught by behavioural detection. What signals give it away?',
        options: [
          'The exact plaintext of the encrypted C2 traffic',
          'Behavioural patterns — beacon periodicity, uniform request/response sizes, connections to newly-registered or low-reputation domains, and a host suddenly talking to an external service it never used before — which NDR and traffic analytics hunt regardless of encryption',
          'C2 is undetectable once it uses HTTPS',
          'Only the antivirus signature of the implant file',
        ],
        answer: 1,
        explain:
          'Operators shape C2 to blend into normal traffic — HTTPS to a plausible domain, randomised beacon timing (jitter) and long sleeps, malleable profiles mimicking real apps, and disposable redirectors with valid TLS. But the *behaviour* of a command channel still stands out: it beacons (periodic check-ins), often with consistent small request/response sizes; it connects to newly-registered or low-reputation domains; and it makes a host talk to an external destination it has never used before. Network detection and response and traffic analytics hunt exactly these behavioural signals, which is why encryption alone does not hide C2. The defensive advice follows: baseline normal egress, alert on beaconing and new external destinations, inspect TLS metadata (JA3/SNI), and default-deny outbound. For an authorized red team, whether the beacon is caught is itself the finding about the client’s detection.',
        hint: 'Encryption hides content, not behaviour — what recurring pattern does a check-in channel create?',
      },
    },

    {
      id: 'rnet-s-09',
      title: 'Finding the monitoring blind spots',
      read: `A recurring theme has emerged: the most valuable network findings are often not "you are vulnerable to X" but **"you would not have seen it."** Skilled network testing deliberately maps a client's **monitoring blind spots**, because coverage gaps are where real attackers live.

## Where blind spots hide

- **Unmonitored egress** — outbound traffic that leaves without inspection (DNS, an allowed cloud API, an office with its own uninspected internet link). If C2/exfil can leave unseen, everything upstream of it is moot.
- **East-west traffic** — many networks watch the *perimeter* (north-south) but not *internal* host-to-host (east-west) traffic. That is exactly where lateral movement and pivoting happen, so it is the most consequential gap.
- **Unmanaged protocols** — the IPv6 story again: a stack that is present but unmonitored (or IoT/OT segments, guest networks, legacy VLANs) is an attacker's playground.
- **Encrypted-traffic gaps** — if the network cannot inspect TLS metadata, it may be blind to C2 hiding in HTTPS.
- **Logging gaps** — devices, appliances, or segments whose logs go nowhere; an attack there is invisible after the fact.

## How to map them

You map blind spots by **correlating your actions with what was detected**. On a purple-team or well-scoped engagement, you note every attack you ran and its timestamp, then compare against what the client's monitoring actually alerted on. The **delta** — what you did that produced no alert — *is* the blind-spot map. Even without the client's console, you can infer gaps (traffic that clearly egressed, lateral movement that met no friction).

## Why this is the high-value deliverable

Vulnerabilities get patched; **detection gaps let the next attacker operate undisturbed for months**. Telling a client "your east-west traffic is unmonitored and here is the lateral movement that proves it" reshapes their security program more than any single CVE. It moves them from prevention-only toward detection and response.

## The mirror

The fixes are architectural: inspect egress (including DNS), monitor east-west with internal sensors/NDR and segmentation logging, bring every protocol and segment under monitoring, inspect TLS metadata, and centralise logs (SIEM) so nothing is invisible. In the lab, run a set of attacks, record them, and build a coverage matrix of "attack vs. would-it-be-detected."`,
      sample: {
        lang: 'text',
        caption: 'Mapping blind spots: attack vs. detection coverage',
        code: `ACTION YOU RAN            DETECTED?   -> BLIND SPOT?
port scan (user net)      yes         perimeter/IDS ok
lateral move A->B (east-west) NO       *** east-west unmonitored ***
DNS tunnel exfil          NO          *** egress DNS uninspected ***
IPv6 mitm6                NO          *** IPv6 unmanaged ***
RDP from foothold         yes         host logging ok

The DELTA (what you did that raised NO alert) = the blind-spot map.`,
        output: `Highest-value finding is often "you wouldn't have seen it."
Vulns get patched; detection gaps let the NEXT attacker operate
for months. East-west and egress are the classic gaps. Mirror:
inspect egress+DNS, monitor east-west (NDR/segmentation logs),
TLS metadata, centralise logs (SIEM).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is mapping a client’s monitoring blind spots often more valuable than reporting another individual vulnerability?',
        options: [
          'Because blind spots are easier to find than vulnerabilities',
          'Because vulnerabilities get patched, but detection gaps (e.g. unmonitored east-west traffic or uninspected egress) let the next attacker operate undisturbed for months — so proving "you would not have seen this" reshapes the security program toward detection and response',
          'Because monitoring is irrelevant if you have a firewall',
          'Because blind spots can only be found by disabling monitoring',
        ],
        answer: 1,
        explain:
          'A single vulnerability, once reported, is patched and gone. A monitoring blind spot is systemic: if east-west (internal host-to-host) traffic is unwatched, or egress including DNS is uninspected, or a whole protocol/segment is unmanaged, then a real attacker who gets in can move laterally, pivot, and exfiltrate for months without being seen — no matter how many individual bugs are fixed. So demonstrating "here is the lateral movement/exfil you would not have detected" is often the most consequential deliverable: it moves the client from prevention-only toward detection and response. You map the gaps by correlating your recorded actions with what actually alerted; the delta is the blind-spot map. Fixes are architectural: inspect egress and DNS, monitor east-west with NDR/segmentation logging, bring every segment under monitoring, inspect TLS metadata, and centralise logs.',
        hint: 'What happens to a patched vulnerability versus an unwatched internal traffic path over the following months?',
      },
    },

    {
      id: 'rnet-s-10',
      title: 'Physical and rogue-device access',
      read: `Many powerful network attacks (layer-2, NAC bypass, rogue APs) require **local access** to the network. Skilled testers understand the physical dimension — because a network's security includes who can plug into it, and physical assessments are a real engagement type (always with explicit authorization).

## Why physical access is decisive

Once an attacker has a live port or is within Wi-Fi range *inside* the trust boundary, the whole layer-2 toolbox opens: VLAN hopping, ARP/LLMNR poisoning, rogue DHCP, NAC bypass, sniffing. Perimeter defences (firewalls, VPN) assume the threat is *outside*; a device physically on the internal network sidesteps them entirely. This is why "assume breach" increasingly includes "assume someone can reach a port."

## Rogue devices

- **Drop boxes** — a small computer (e.g. a Raspberry Pi) left plugged into a network port, phoning home over cellular/Wi-Fi to give the attacker a persistent internal foothold. Testers use these to demonstrate the risk of unattended ports.
- **Malicious implants** — devices disguised as normal peripherals or inline network taps.
- **Rogue access points** — an unauthorized AP plugged into the wired network, extending it wirelessly to the parking lot.
- **BadUSB / HID attacks** — a device that emulates a keyboard to inject commands when plugged into a host (a host attack, but often part of physical assessments).

## The access vectors

Physical assessments test tailgating (following staff through doors), unattended reception/meeting-room ports, exposed cabling, and unlocked network cabinets. The finding is usually stark: an available port in a public-ish area plus weak NAC equals internal network access.

## The defensive mirror

- **Port security & NAC** — disable unused ports, strong 802.1X (not MAC-only), so an unknown device gets nothing.
- **Physical security** — locked cabinets, controlled areas, no live ports in public spaces, cable management.
- **Rogue-device detection** — monitor for new/unknown MACs and unauthorized APs.
- **Network segmentation** — so even a plugged-in device lands somewhere contained.

Physical and network security are one system: the strongest firewall is irrelevant if anyone can plug a drop box into a lobby port on a MAC-only NAC. In the lab you cannot do physical, but you can simulate the *consequence*: attach an unknown device to your virtual switch and confirm what a hardened (802.1X) vs weak (MAC-only) NAC grants it.`,
      sample: {
        lang: 'text',
        caption: 'Physical access turns local network attacks on',
        code: `LIVE PORT / INSIDE WIFI RANGE  ->  the whole L2 toolbox opens:
  VLAN hopping, ARP/LLMNR poison, rogue DHCP, NAC bypass, sniff
  (perimeter firewall/VPN assume the threat is OUTSIDE)

ROGUE DEVICES:
  drop box (Pi phoning home) = persistent internal foothold
  rogue AP into wired net    = extends the LAN to the car park
  BadUSB/HID                 = keyboard-injection on a host

FINDING pattern: public-ish live port + weak NAC = internal access.`,
        output: `Physical + network security are ONE system. Mirror: disable
unused ports, 802.1X (not MAC-only) NAC, locked cabinets, no live
ports in public spaces, rogue-device/AP detection, segmentation.
Explicit authorization required for physical work.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does gaining physical access to a live internal network port so dramatically change an attacker’s options?',
        options: [
          'Because internal ports run faster than the internet',
          'Because perimeter defences (firewalls, VPN) assume the threat is outside, so a device physically on the internal network sidesteps them and unlocks the whole layer-2 toolbox — VLAN hopping, ARP/LLMNR poisoning, rogue DHCP, NAC bypass, sniffing',
          'Because physical ports have no authentication of any kind ever',
          'Because it automatically grants domain administrator rights',
        ],
        answer: 1,
        explain:
          'Perimeter security — firewalls, VPN concentrators — is built on the assumption that attackers are outside the trust boundary. A device physically connected to an internal port (or within internal Wi-Fi range) is already inside that boundary, so it bypasses the perimeter entirely and gains access to the local segment, where the whole layer-2 attack toolbox applies: VLAN hopping, ARP and LLMNR poisoning, rogue DHCP, NAC bypass, and sniffing. This is why unattended live ports, rogue devices (drop boxes, rogue APs), and physical access are treated as serious risks, and why "assume breach" increasingly includes "assume someone can reach a port." It does not automatically grant admin rights, and ports can be protected — by 802.1X NAC (not MAC-only), disabling unused ports, physical security, and segmentation. Physical and network security are one system.',
        hint: 'What assumption do firewalls and VPNs make about where the attacker is, and what does being physically inside do to it?',
      },
    },

    {
      id: 'rnet-s-11',
      title: 'Reporting and defensive architecture',
      read: `A skilled network engagement ends not with a shell but with a **report** that measurably improves the network — and, increasingly, with **architectural** recommendations, because network security is won at the design level. This is where offence turns fully into defence.

## The network report

Beyond the standard finding format (exposure/impact/fix, verified, prioritised), a network report tells a **path story**: how you moved from initial access through the network to the objective, because that path — not any single finding — reveals the systemic weaknesses. Include:

- **The attack path / kill chain** — the chained steps (capture → relay → foothold → pivot → objective), so the client sees the blast radius.
- **A network diagram** — annotated with where you went and where segmentation held or failed.
- **Detection reality** — for each step, whether they would have seen it (the blind-spot map).
- **Prioritised, architectural fixes** — not just "patch host X" but "your east-west traffic is unsegmented and unmonitored."

## Defensive architecture: the recommendations that matter

The highest-leverage network advice is structural:

- **Segmentation / micro-segmentation** — contain breaches so one foothold cannot reach everything (the antidote to your pivoting).
- **Zero-trust networking** — stop trusting "inside the network"; authenticate and authorize every access regardless of location (the antidote to the flat-network, trust-by-location model most attacks exploit).
- **Egress control** — default-deny outbound with inspection (the antidote to C2/exfil).
- **Monitoring everywhere** — north-south *and* east-west, all protocols, centralised logging (the antidote to blind spots).
- **Hardened foundations** — 802.1X NAC, hardened switch config, SNMPv3, patched infrastructure, no LLMNR/NBT-NS, required signing.

## The framing that lands

Map each fix to the attacks it stops: "requiring SMB signing kills the relay path; segmenting the database tier and monitoring east-west would have stopped the pivot; default-deny egress would have caught the DNS tunnel." That mapping — attack → architectural fix — is what turns a report into change. In the lab, take your engagement notes and produce a one-page attack-path diagram plus a prioritised architectural remediation list.`,
      sample: {
        lang: 'text',
        caption: 'From attack path to architectural fix',
        code: `ATTACK PATH (the story):
  Responder capture -> NTLM relay -> foothold -> pivot -> DB tier

ARCHITECTURAL FIX MAPPED TO EACH STEP:
  Responder      -> disable LLMNR/NBT-NS
  relay          -> require SMB/LDAP signing + EPA
  foothold->pivot -> micro-segmentation; monitor east-west
  reach DB tier  -> zero-trust (authenticate every access)
  (exfil later)  -> default-deny egress + DNS inspection`,
        output: `Report the PATH, not just findings: kill chain + annotated
diagram + detection reality + prioritised ARCHITECTURAL fixes
(segmentation, zero-trust, egress control, monitoring everywhere,
hardened foundations). Map each fix to the attack it stops.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes a skilled network engagement report drive real change, beyond listing individual findings?',
        options: [
          'Listing as many low-severity findings as possible',
          'Telling the attack-path story (the kill chain and blast radius) with the detection reality for each step, and mapping prioritised architectural fixes — segmentation, zero-trust, egress control, monitoring everywhere — to the specific attacks they would stop',
          'Providing only the raw tool output for the client to interpret',
          'Recommending the client buy one specific product',
        ],
        answer: 1,
        explain:
          'A network report drives change when it explains the *path*, not just isolated bugs: the chained kill chain (capture → relay → foothold → pivot → objective) and the blast radius it revealed, an annotated diagram of where segmentation held or failed, and the detection reality (which steps they would or would not have seen). Crucially, its recommendations are architectural and mapped to the attacks they stop — disable LLMNR/NBT-NS to kill capture, require signing to kill relay, micro-segment and monitor east-west to stop the pivot, adopt zero-trust to end trust-by-location, default-deny egress to stop exfil. That attack→architectural-fix mapping turns a report into a program of change, which raw output, finding-count padding, or a product pitch never do.',
        hint: 'Individual findings get patched — what kind of recommendation reshapes the network, and how do you make the client act on it?',
      },
    },

    {
      id: 'rnet-s-12',
      title: 'Project: an advanced network engagement',
      read: `Your skilled capstone is a **full network engagement** on your lab, run like a professional operation: reach a deeply-segmented objective through multiple techniques, operate with evasion in mind, and deliver an architecture-grade report. Lab only, within a scope you define for yourself.

## The brief

Build a multi-tier lab: a user segment, a server segment, and an isolated "crown jewel" (e.g. a database) segment, with a switch (or virtual equivalent) and NAC if you can. From an assumed position on (or physical access to) the user segment, reach the crown jewel — and prove exactly how a defender would (or would not) see you.

## The engagement

1. **Get on the network** — via NAC bypass (clone an allowed MAC) or an assumed foothold; note which NAC would have stopped you.
2. **Capture & relay / crack** — Responder + ntlmrelayx or offline cracking to obtain access, as in intermediate.
3. **Layer-2 where relevant** — attempt VLAN hopping to cross a boundary; note whether switch hardening stops it.
4. **Multi-hop pivot** — chain pivots (ligolo-ng/chisel) through the tiers to reach the crown-jewel segment.
5. **Operate with tradecraft** — run a beacon with jitter, and attempt a covert exfil (DNS tunnel) of marked/synthetic data; record the channel.
6. **Map detection** — for every action, record whether it would be detected; build the blind-spot matrix.
7. **Report** — attack-path story, annotated diagram, detection reality, and prioritised **architectural** remediation (segmentation, zero-trust, egress control, monitoring, hardened foundations), each mapped to the attack it stops.

## The standard

You pass when the report reads like a real engagement deliverable: a complete, proven attack path to the crown jewel; honest evasion/detection findings (what would and would not have been seen); and architectural recommendations mapped to the specific attacks they defeat. It must make the case that the network's *design* — not just its patch level — is what needs to change. All within your lab, marked/synthetic data only, nothing destroyed.

## Where next

Pro is the deep end: TCP/IP and protocol internals (why the attacks work at the packet level), crafting packets and building your own tooling (scapy), attacking encrypted traffic and its limits, routing/BGP concepts, network vulnerability research, and a research-grade assessment. Everything there explains the *why* beneath the *how* you have now mastered.`,
      sample: {
        lang: 'text',
        caption: 'The advanced engagement, end to end (lab only)',
        code: `1 get on network   : NAC bypass (clone MAC) / assumed foothold
2 capture+relay    : Responder -> ntlmrelayx (or crack)
3 layer-2          : attempt VLAN hop; note hardening effect
4 multi-hop pivot  : ligolo/chisel through tiers -> crown jewel
5 tradecraft       : beacon w/ jitter; DNS-tunnel MARKED data
6 map detection    : per-action detected? -> blind-spot matrix
7 report           : path + diagram + detection + ARCHITECTURAL
                     fixes mapped to each attack`,
        output: `Pass = a real deliverable: proven path to the crown jewel +
honest detection/evasion findings + architectural fixes mapped
to attacks, arguing the DESIGN must change. Lab only, marked/
synthetic data, nothing destroyed.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the skilled network capstone?',
        options: [
          'Reaching the crown jewel by any means, with no report required',
          'A real engagement deliverable: a complete, proven attack path to the crown jewel, honest evasion/detection findings (what would and would not have been seen), and prioritised architectural fixes mapped to the specific attacks they defeat — arguing the network’s design must change, all within the lab using marked/synthetic data',
          'The largest number of hosts compromised in the shortest time',
          'A list of every tool used during the engagement',
        ],
        answer: 1,
        explain:
          'The skilled capstone simulates a professional engagement, so the bar is a professional deliverable — not merely reaching the objective. You must show a complete, proven attack path to the deeply-segmented crown jewel (NAC bypass or assumed foothold → capture/relay → any layer-2 hop → multi-hop pivot → objective), operate with tradecraft (jittered beacon, covert DNS exfil of marked/synthetic data), and honestly map detection: for each action, whether a defender would have seen it. The report then delivers prioritised architectural recommendations — segmentation, zero-trust, egress control, monitoring everywhere, hardened foundations — each mapped to the specific attack it stops, making the case that the network’s design (not just its patch level) must change. All within your lab, using marked or synthetic data, destroying nothing.',
        hint: 'The goal is a deliverable that changes the network’s design — what three things must it contain, and how must the fixes be framed?',
      },
    },
  ],
}

export default level
