import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Post-exploitation, pivoting and lateral movement',
  summary:
    'What a foothold is worth: advanced and less-common privilege escalation (dangerous groups, containers, NFS), disciplined post-exploitation, pivoting and tunnelling to reach internal networks, lateral movement, deep credential access, and understanding persistence, evasion and C2 well enough to test and to defend. Authorized targets and your own lab only.',
  outcomes: [
    'Escalate via dangerous groups, containers and NFS',
    'Run post-exploitation methodically and reach internal networks',
    'Pivot and tunnel through a compromised host',
    'Move laterally with harvested credentials',
    'Perform deep credential access on Linux',
    'Understand persistence, evasion and C2 for testing and defence',
  ],
  steps: [
    {
      id: 'rlin-i-01',
      title: 'Advanced and less-common escalation',
      read: `Beyond the core paths (sudo, SUID, cron, kernel, capabilities), several **less-common but powerful** Linux escalation vectors appear regularly. Knowing them widens the paths you can find — and, as always, each is a defensive misconfiguration in reverse.

## Dangerous group memberships

Membership of certain groups is effectively root:

- **docker** — a member can run containers, and \`docker run -v /:/host ...\` mounts the *whole host filesystem* into a container they control as root, then edit \`/etc/passwd\` or read any file. Being in \`docker\` is being root (GTFOBins documents the exact command). The defensive lesson: the docker group is a root-equivalent grant.
- **lxd/lxc** — the same idea: create a privileged container mounting the host, get root. A classic escalation on machines where a low-priv user is in \`lxd\`.
- **disk** — direct read/write access to block devices; you can read raw disk (dump \`/etc/shadow\`) or write to it, bypassing file permissions entirely.
- **adm** — read access to logs (which often contain credentials or useful info).
- **shadow** — read \`/etc/shadow\` directly (the hashes to crack).

\`id\` shows your groups; an interesting one is an immediate lead.

## sudo environment abuse

- **LD_PRELOAD / LD_LIBRARY_PATH** — if sudo is configured with \`env_keep\` preserving these (a misconfiguration), a user allowed to sudo *anything* can preload a malicious shared library that runs as root when the sudo'd program loads. GTFOBins and the sudo docs cover this.
- **Sudo CVEs** — sudo itself has had serious flaws (Baron Samedit / CVE-2021-3156, a heap overflow giving root to any local user regardless of sudo rights). Check the sudo *version* (\`sudo --version\`) against known CVEs.

## NFS root squashing

If an NFS export has **\`no_root_squash\`** set (a misconfiguration), a client mounting it as root can create files owned by root on the server — including a SUID-root binary. Mount the share, drop a SUID shell onto it, execute it on the target: root. \`showmount -e\` and \`/etc/exports\` reveal this.

## Wildcard and argument injection

Covered in the amateur level (tar/rsync wildcards); also, any root-run command taking user-influenced arguments can sometimes be steered (an argument that becomes an option, a config path pointing at attacker-controlled content).

## The method stays the same

These extend the enumeration checklist, not replace it: \`id\` (groups), \`sudo --version\` and \`sudo -l\` (sudo flaws and env_keep), \`showmount\`/\`/etc/exports\` (NFS), and the container/group checks. LinPEAS flags most of them. The skill is recognising that an unusual group, a preserved environment variable, or an NFS export is a root path — and understanding why, so you can exploit it on an authorized test and recognise it as a finding to remove when defending.`,
      sample: {
        lang: 'bash',
        caption: 'A dangerous group and an NFS misconfiguration, each = root',
        code: `id
#  uid=1000(dev) groups=1000(dev),999(docker)   <- docker group = root

# docker group -> mount the host root fs into a container as root:
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
# now you are root on the HOST filesystem.

# NFS: an export with no_root_squash?
showmount -e 10.10.10.5      # /srv *(rw,no_root_squash)   <- misconfig
# mount as root, drop a SUID-root shell, run it on the target:
mount -t nfs 10.10.10.5:/srv /mnt
cp /bin/bash /mnt/bash; chmod +s /mnt/bash    # owned by root, SUID`,
        output: `# (docker) after chroot:  id -> uid=0(root)  on the host fs
# (nfs) on the target:  /srv/bash -p -> uid=0(root)
# An unusual GROUP or an NFS no_root_squash export IS root. Defenders
# must treat docker/lxd/disk/shadow membership as root-equivalent and
# never export NFS with no_root_squash - the exact mirror of this.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is membership of the `docker` group effectively equivalent to having root on a Linux host?',
        options: [
          'Because docker requires a root password to install',
          'Because a docker-group member can launch a container that mounts the host’s entire filesystem (e.g. `-v /:/mnt`) and operate on it as root inside the container — reading or modifying any host file, including /etc/passwd — so the grant is root-equivalent and must be treated as such',
          'Because containers are always run as root by the kernel',
          'Because the docker group can read /etc/shadow only',
        ],
        answer: 1,
        explain:
          'The Docker daemon runs as root, and anyone who can talk to it (the docker group) can instruct it to start a container that bind-mounts the host root filesystem and runs as root inside — from there they read or write any file on the host, add a root user, or drop a SUID shell. There is no additional check, so being in the docker group is a full root grant in practice, which is exactly why defensive guidance treats docker (and lxd, disk, shadow) membership as root-equivalent and restricts it accordingly. The same reasoning makes it a reliable escalation path on an authorized test.',
        hint: 'What can a container do to the host filesystem if you can mount it, and as whom does the container run?',
      },
    },

    {
      id: 'rlin-i-02',
      title: 'Post-exploitation, done methodically',
      read: `Once you have solid access on a host (ideally root), **post-exploitation** is the disciplined process of turning that access into understanding, reach, and evidence. Beginners stop at "I got root"; professionals treat that as the start of the valuable work.

## The goals of post-exploitation

1. **Situational understanding** — what is this host, what is its role, what data does it hold, and what does it connect to? Root on a database server, a domain-joined host, or a jump box is worth far more than root on an isolated box, and understanding the role guides everything next.
2. **Credential access** — systematically gather credentials (next steps) that unlock other systems.
3. **Internal reconnaissance** — map the internal network now visible from this host (the pivot foundation).
4. **Lateral movement** — reach and compromise other systems, deepening the engagement.
5. **Demonstrating impact** — for the report, evidence of what an attacker could achieve (access to sensitive data, reach to critical systems, domain compromise) — without causing damage.
6. **Objectives** — meeting the engagement's specific goals (reach the "crown jewel" system, prove access to specific data).

## The disciplined approach

- **Loot systematically** — go through the host methodically for credentials, keys, configs, data, and connections, recording everything. (Steps ahead cover credential access in depth.)
- **Enumerate the new position** — you're now *inside*; re-run network and host enumeration from this vantage, which sees things the external scan couldn't (internal hosts, internal services, localhost-bound services).
- **Maintain access carefully** — ensure you don't lose the foothold (a stable shell, noted credentials for re-entry), within the rules of engagement.
- **Track your actions** — for the report and for cleanup, record what you did, what you accessed, and anything you introduced.

## Professional constraints (the rules of engagement)

Post-exploitation is where discipline matters most, because you now have power on a real (authorized) system:

- **Don't exfiltrate real sensitive data** — prove you *could* access it (a screenshot, a hash, a record count) rather than copying it out.
- **Don't disrupt operations** — you're demonstrating risk, not being a real adversary.
- **Stay in scope** — the internal systems you can now reach may or may not be in scope; check before touching them.
- **Clean up** — remove tools, shells, and any accounts or changes you introduced, and document them so the client can verify.

## Why this is the value

The methodology loops here: post-exploitation on one host reveals credentials and internal networks that let you enumerate and exploit *more* hosts, going deeper toward the objectives. And it produces the impact narrative the report needs — not "we got a shell" but "from a single web vulnerability we reached root, harvested credentials, pivoted to the internal network, and demonstrated access to the customer database." That story, and the fixes for every step in it, is what makes an engagement worth the client's investment. Post-exploitation is where a foothold becomes a finding that matters.`,
      sample: {
        lang: 'text',
        caption: 'Post-exploitation: from "got root" to demonstrated impact',
        code: `Got root on web01. Now the real work:

  role?        -> web01 is DMZ, but has a 2nd NIC to 172.16.0.0/24 (internal!)
  credentials? -> DB creds in config; root's SSH key; hashes in /etc/shadow
  internal recon -> from web01, scan 172.16.0.0/24: a DB server, a file server
  lateral       -> SSH key + reused creds reach 172.16.0.10 (internal)
  impact        -> demonstrate access to the customer DB (record COUNT,
                   a redacted sample - NOT a full copy)
  discipline    -> in scope? logged actions? tools removed? documented?`,
        output: `Post-exploitation turns "I got root" into "from one web flaw we
reached root, harvested credentials, pivoted to the internal
network, and demonstrated access to the customer database" - the
impact story the report needs. Bounded by the rules of engagement:
prove access without exfiltrating, don't disrupt, stay in scope,
clean up. This is where a foothold becomes a finding that matters.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'On an authorized engagement, how should a tester demonstrate access to sensitive data (like a customer database) during post-exploitation?',
        options: [
          'Copy the entire database to their own machine as proof',
          'Prove that access is possible without exfiltrating the real data — e.g. a record count, a redacted sample, or a screenshot — because the goal is to demonstrate risk within the rules of engagement, not to act as a real adversary or cause a data breach themselves',
          'Delete the database to show the impact',
          'Publicly disclose the data to prove the finding',
        ],
        answer: 1,
        explain:
          'Post-exploitation demonstrates impact so the client understands the risk, but a tester must not become the breach they are simulating. The rules of engagement require proving access without exfiltrating real sensitive data — a record count, a small redacted sample, or a screenshot establishes the finding while leaving the data where it belongs. Copying the whole database out is itself a data breach and a professional and legal failure; deleting or disclosing it would cause the very harm the engagement exists to prevent. The evidence supports a report that says "an attacker could access this", which is the point.',
        hint: 'The aim is to show risk, not to cause the harm. How do you evidence access without becoming the breach?',
      },
    },

    {
      id: 'rlin-i-03',
      title: 'Internal reconnaissance from a foothold',
      read: `A compromised host is a **new vantage point** — it can see and reach systems that were invisible and unreachable from outside. Re-running reconnaissance from *inside* is the foundation of pivoting and lateral movement, and it's a distinct skill from external scanning.

## What the internal view reveals

From a foothold you discover things the external scan never could:

- **Other networks** — the host may have multiple interfaces (\`ip addr\`) reaching internal subnets (the "second NIC to 172.16.0.0/24"). Its routing table (\`ip route\`) shows what networks it can reach.
- **Internal hosts** — other machines on those internal subnets, not exposed to the internet.
- **Internal services** — services bound to internal interfaces, or to **localhost** (127.0.0.1) only — reachable now that you're *on* the box but never exposed externally (databases, admin panels, internal APIs). \`ss -tlnp\` shows localhost-bound listeners.
- **Trust relationships** — where this host connects (\`known_hosts\`, config files, mounted shares, cron jobs calling other hosts), revealing pivot targets and sometimes credentials for them.
- **ARP and connection tables** — \`arp -a\`, \`ss -tn\` show hosts this machine has recently talked to — live neighbours worth investigating.

## Discovering the internal network

Without necessarily pulling heavy tools onto the target, you map the internal network:

- **Interfaces and routes** — \`ip addr\`, \`ip route\` (what subnets are reachable).
- **ARP cache and neighbours** — \`ip neigh\` / \`arp -a\` (hosts recently contacted).
- **Ping sweeps / port checks** — from the foothold, probe the internal subnet for live hosts and open ports. Native tricks (bash \`/dev/tcp\` loops) work when you can't install a scanner; or you run scans *through* the host via a pivot (next step) so your own tools reach the internal network.
- **Host and DNS files** — \`/etc/hosts\`, DNS configuration reveal named internal systems.

## Localhost-bound services: a common prize

Services bound to \`127.0.0.1\` are a frequent finding: a database, a Redis instance, an admin interface, or an internal web app that the developers assumed was "safe because it's only local" — now directly reachable from your shell. These are often less hardened precisely because they were never meant to be exposed, and reaching them (directly, or by forwarding the port back to yourself) is a classic escalation/lateral step.

## Why this matters

External scanning shows the perimeter; internal reconnaissance shows the **soft interior** that the perimeter was protecting. Real networks are hard on the outside and softer inside (the flat-interior problem defenders address with segmentation and zero trust). A foothold that reaches an internal subnet transforms the engagement — the methodology loops back to enumeration, now against internal targets, and the path toward the crown jewels usually runs through this internal terrain. Mapping it thoroughly from your foothold is what makes pivoting and lateral movement possible.`,
      sample: {
        lang: 'bash',
        caption: 'Re-recon from inside: new networks, internal hosts, localhost services',
        code: `# what can this host reach?
ip addr; ip route
# hosts it has recently talked to
ip neigh
# services bound to localhost only (invisible externally, reachable now)
ss -tlnp
# sweep the internal subnet for live hosts (native, no tools needed)
for i in $(seq 1 254); do (ping -c1 -W1 172.16.0.$i >/dev/null && echo "up: 172.16.0.$i" &); done`,
        output: `inet 10.10.10.5/24   inet 172.16.0.5/24        <- a SECOND, internal net
ip neigh: 172.16.0.10, 172.16.0.20 (recently contacted)
ss -tlnp: 127.0.0.1:6379 redis, 127.0.0.1:8080 internal-admin  <- localhost only!
up: 172.16.0.10   up: 172.16.0.20                <- internal hosts, unexposed
# The foothold sees the SOFT interior the perimeter hid: a second
# network, internal hosts, and localhost-bound services (redis, an
# admin panel) never exposed externally. This is the pivot foundation.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is re-running reconnaissance from a compromised host so valuable, beyond the external scan already performed?',
        options: [
          'Because internal scans are faster than external ones',
          'Because the foothold is a new vantage point that can see and reach the "soft interior" the perimeter hid — additional internal networks, unexposed internal hosts, trust relationships, and services bound only to localhost — none of which were visible or reachable from outside, and which are the path toward deeper objectives',
          'Because external scans are always wrong',
          'Because internal hosts have no security controls',
        ],
        answer: 1,
        explain:
          'External scanning only sees the perimeter; a foothold sits inside it and can observe and reach what the perimeter was protecting. From the compromised host you discover additional interfaces and routes to internal subnets, internal machines never exposed to the internet, trust relationships that reveal further targets and credentials, and services bound to 127.0.0.1 that were assumed safe because "only local" — often less hardened and now directly reachable. Real networks tend to be hard outside and softer inside, so this internal reconnaissance is what turns a single foothold into a route toward the crown jewels, feeding pivoting and lateral movement.',
        hint: 'What can a machine inside the network see and reach that an outside scanner never could?',
      },
    },

    {
      id: 'rlin-i-04',
      title: 'Pivoting and tunnelling',
      read: `Internal reconnaissance revealed hosts and services you can *see* from the foothold but can't reach *from your own machine*. **Pivoting** routes your traffic through the compromised host so your tools reach the internal network — one of the most important intermediate skills.

## The problem pivoting solves

Your attacker box is on the outside; the internal subnet (\`172.16.0.0/24\`) is only reachable from the foothold. You want to run *your* tools (Nmap, Metasploit, a browser) against those internal hosts. Pivoting turns the foothold into a **relay**.

## SSH tunnelling (when you have SSH access)

If you have SSH to the foothold, SSH provides tunnelling for free:

- **Local port forward** (\`-L\`) — forward a port on *your* machine to a host:port reachable from the foothold. \`ssh -L 8080:172.16.0.10:80 user@foothold\` makes \`localhost:8080\` on your box reach the internal web server. Good for one specific service.
- **Dynamic port forward / SOCKS proxy** (\`-D\`) — \`ssh -D 1080 user@foothold\` opens a **SOCKS proxy** on your box; anything you point through it (via **proxychains**) is routed through the foothold into the internal network. This is the flexible one — it lets *any* tool reach the whole internal subnet.
- **Remote port forward** (\`-R\`) — forward a port on the foothold back to you (useful for reverse connections through the pivot).

## proxychains

**proxychains** forces a program's traffic through a proxy (your SSH SOCKS proxy). \`proxychains nmap -sT 172.16.0.10\` runs Nmap *through* the foothold against the internal host. (Note: proxied scans must use full TCP connect scans, not SYN scans, and are slower — a constraint of tunnelling.)

## Dedicated pivoting tools

When you don't have SSH, or need more, purpose-built tools create tunnels over a foothold:

- **Chisel** — a fast TCP/UDP tunnel over HTTP/WebSockets; run a server on your box and a client on the foothold to build a SOCKS proxy or port forwards. Very popular because it's a single binary and works through restrictive networks.
- **Ligolo-ng** — a modern pivoting tool that presents the internal network as a normal interface on your box (via a TUN adapter), so your tools reach it transparently — increasingly the preferred option.
- **Metasploit** — \`autoroute\` plus a SOCKS proxy module routes Metasploit (and, via proxychains, other tools) through a Meterpreter session.

## Chaining pivots (double pivot)

Real networks have layers: the foothold reaches subnet A; a host in subnet A reaches subnet B that the foothold can't. You **chain** pivots — tunnel through the first host to compromise a second, then tunnel through *that* to reach subnet B. Multi-hop pivoting is how testers traverse segmented networks toward deeply internal targets.

## The defensive mirror

Pivoting is exactly what **network segmentation and egress control** aim to stop (the defensive network track). A pivot works because the foothold can reach the internal network and can open outbound tunnels; segmentation limits the first, egress filtering limits the second. When you pivot on an authorized test, you're demonstrating that the internal network wasn't segmented from the DMZ — a finding whose fix is precisely the segmentation defenders were taught to build. Every successful pivot is an argument for tighter internal controls.`,
      sample: {
        lang: 'bash',
        caption: 'A SOCKS pivot: run your own tools against the internal network',
        code: `# open a SOCKS proxy THROUGH the foothold (you have SSH to it)
ssh -D 1080 user@10.10.10.5        # or: chisel / ligolo-ng if no SSH

# route your tools through it with proxychains (SOCKS on 1080)
proxychains nmap -sT -Pn 172.16.0.10       # scan the internal host
proxychains firefox http://172.16.0.20/    # browse the internal app`,
        output: `[proxychains] Strict chain ... 127.0.0.1:1080 ... 172.16.0.10:80 OK
PORT   STATE SERVICE          (Nmap ran THROUGH the foothold)
80/tcp open  http
3306/tcp open mysql
# Your own tools now reach the internal 172.16.0.0/24 via the pivot.
# This works because the foothold reaches the internal net and can
# tunnel out - exactly what segmentation + egress control prevent.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What does setting up a SOCKS proxy through a compromised host (e.g. `ssh -D` with proxychains) let a tester do, and what defensive weakness does a successful pivot demonstrate?',
        options: [
          'It cracks passwords faster; it shows weak hashing',
          'It routes the tester’s own tools through the foothold to reach internal hosts and services that are otherwise unreachable from outside — and a successful pivot demonstrates that the internal network was not properly segmented from the compromised zone (and that outbound tunnelling was possible), the exact weaknesses segmentation and egress control address',
          'It encrypts the tester’s traffic; it shows missing TLS',
          'It escalates privilege on the foothold; it shows a sudo flaw',
        ],
        answer: 1,
        explain:
          'A pivot turns the foothold into a relay: a SOCKS proxy through it lets the tester point any tool (via proxychains) at internal hosts and services that are visible from the foothold but unreachable from the attacker’s own machine. That it works at all reveals two defensive gaps — the internal network was reachable from the compromised (often DMZ) zone rather than segmented off, and the host could open an outbound tunnel rather than being restricted by egress controls. Both are precisely what the defensive network track’s segmentation and egress filtering are meant to prevent, so every pivot is a concrete finding arguing for tighter internal controls.',
        hint: 'A pivot lets your tools reach the internal network through the foothold. What must have been true about the network for that to be possible?',
      },
    },

    {
      id: 'rlin-i-05',
      title: 'Lateral movement on Linux',
      read: `With internal reconnaissance and a pivot in place, **lateral movement** is compromising additional hosts to spread through the network toward the objectives. On Linux, it's driven far more by **credentials and trust** than by exploits.

## The primary vector: credentials and keys

Most Linux lateral movement uses **valid credentials** harvested from the current host:

- **SSH keys** — a private key found on the foothold (\`~/.ssh/id_rsa\`) is a credential for wherever it's authorized. \`known_hosts\` tells you where this host connects, and the key often works there. This is the classic Linux lateral move: found key → SSH to the next host.
- **Reused passwords** — a password found in a config, history, or cracked from a hash is tried across other hosts and accounts. Reuse is rampant, so a single credential frequently opens many machines.
- **Agent hijacking** — if SSH agent forwarding is in use, a compromised host may let you use another user's forwarded key to reach systems *they* can access.

## Trust relationships

Linux systems trust each other in ways you exploit:

- **Passwordless SSH** between hosts (for automation) — compromise one, reach the others it trusts.
- **Shared credentials** — the same service account or root password across many hosts (the reused-local-admin problem, Linux-style).
- **NFS/shared mounts** — a writable shared filesystem can carry a payload or reveal credentials used across hosts.
- **Central config / orchestration** — Ansible, Puppet, and similar have credentials or SSH access to *many* hosts; compromising the orchestration server is a route to the whole fleet.

## The technique through a pivot

Lateral movement combines with pivoting: you reach an internal host *through* the foothold (the SOCKS proxy), then authenticate to it with harvested credentials or a key. Once on the second host, you **repeat the whole cycle** — situational awareness, credential hunting, escalate, enumerate its network position — potentially pivoting again through *it* to reach deeper subnets. The methodology loops with each new host.

## Exploits as a secondary vector

Sometimes an internal host runs a vulnerable service reachable now that you're inside (internal systems are often less patched than perimeter ones, having been assumed "safe"). So lateral movement also includes exploiting internal vulnerabilities — but credentials and trust are the dominant, more reliable path.

## The defensive mirror

Linux lateral movement is what **unique credentials, key management, network segmentation, and least privilege** defend against. When one SSH key opens ten hosts, or one password works everywhere, or the Ansible server reaches the whole fleet with no isolation, you're demonstrating exactly the failures the defensive tracks addressed: don't reuse credentials, protect and scope keys, segment the network, and isolate high-value orchestration. Every lateral hop you make is a finding whose fix is one of those controls — and the chain of hops, documented, shows the client how a single foothold became a network-wide compromise.`,
      sample: {
        lang: 'bash',
        caption: 'Lateral movement via a found key and a reused password (through the pivot)',
        code: `# on the foothold: a private key and where this host connects
cat ~/.ssh/id_rsa            # a credential for wherever it's authorized
cat ~/.ssh/known_hosts       # -> 172.16.0.10 (a host it trusts)

# use the key to reach the internal host (through the SOCKS pivot)
proxychains ssh -i id_rsa deploy@172.16.0.10
#  -> shell on 172.16.0.10 ; now repeat the whole cycle here

# or reuse a harvested password across accounts/hosts:
proxychains ssh admin@172.16.0.20     # password 'Spr1ng!' (reused) works`,
        output: `deploy@fileserver:~$        # reached via a found SSH key + pivot
admin@dbserver:~$           # reached via a REUSED password
# Linux lateral movement runs on CREDENTIALS and TRUST, not exploits:
# a found key, a reused password, passwordless SSH between hosts, or
# an orchestration server that reaches the fleet. Each hop is a finding -
# fixed by unique creds, key scoping, segmentation, and least privilege.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'On Linux, lateral movement is driven more by credentials and trust than by exploits. Why, and what defences address it?',
        options: [
          'Because Linux has no exploitable vulnerabilities',
          'Because harvested SSH keys, reused passwords, and trust relationships (passwordless SSH, shared accounts, orchestration servers) let a tester authenticate legitimately to further hosts — more reliably and quietly than exploiting each one — so the defences are unique credentials, scoped/managed keys, network segmentation and least privilege',
          'Because exploits are illegal to use internally',
          'Because internal hosts cannot be reached at all',
        ],
        answer: 1,
        explain:
          'Once inside, the most dependable way to the next host is usually a valid credential: an SSH private key found on the foothold that is authorized elsewhere, a password reused across accounts and machines, or a trust relationship (passwordless SSH set up for automation, a shared service/root password, an Ansible/Puppet server with access to the whole fleet). Authenticating legitimately is more reliable and quieter than finding and firing an exploit at every target. The corresponding defences are exactly the failures being demonstrated: don’t reuse credentials, scope and protect keys, segment the network so a foothold can’t reach everything, and apply least privilege — so each lateral hop is a finding pointing at one of those controls.',
        hint: 'Is it easier to exploit every internal host, or to log in with a key or password you already found?',
      },
    },

    {
      id: 'rlin-i-06',
      title: 'Deep credential access on Linux',
      read: `Credential access is the engine of escalation and lateral movement, so it deserves depth. Beyond the config/history hunting of the amateur level, there are specific high-value credential stores on Linux to understand.

## /etc/shadow — the password hashes

Once you're root, \`/etc/shadow\` holds every local user's password hash. Copy it (with \`/etc/passwd\`), combine them (\`unshadow\` in John the Ripper), and crack offline. The hashes reveal:

- User passwords (often reused elsewhere — the value beyond the current host).
- The hashing scheme (\`$6$\` = SHA-512, \`$y$\` = yescrypt, \`$2$\` = bcrypt) — which, again, determines crackability. Weak/old schemes and weak passwords fall; strong ones resist.

You crack these to obtain *plaintext* passwords for reuse, since a hash alone can't be "passed" on Linux the way an NTLM hash can on Windows.

## SSH keys and agents

- **Private keys** (\`~/.ssh/id_*\`) — direct credentials; a passphrase-protected key can be cracked offline (\`ssh2john\` then John/Hashcat) if the passphrase is weak.
- **authorized_keys** — shows who can log in (and, if writable, lets you *add* your own key — persistence/access).
- **SSH agent** — a running agent (or forwarded agent) may let you use loaded keys without the passphrase; \`SSH_AUTH_SOCK\` and the agent socket are targets.

## Application and service credentials

- **Database credentials** in app configs — often the same password reused for the system or other services.
- **Service account tokens and API keys** — cloud credentials (\`~/.aws/credentials\`, instance metadata), CI tokens, application secrets.
- **Kerberos tickets / keytabs** on domain-joined Linux — reusable for accessing Kerberos-protected resources.
- **Browser and application credential stores**, saved sessions, and tokens on developer/user machines.

## Memory and running processes

- Credentials passed as **command-line arguments** appear in \`ps aux\` (visible to all users) and in \`/proc/*/cmdline\`.
- Process memory can contain secrets; on some systems credential-caching daemons or agents hold reusable material.
- Environment variables (\`/proc/*/environ\`, readable as the process owner or root) frequently carry injected secrets.

## The workflow: gather, crack, reuse

1. **Gather** every credential store reachable at your privilege level (more opens up after escalating to root — \`/etc/shadow\`, other users' files).
2. **Crack** hashes and passphrase-protected keys offline.
3. **Reuse** relentlessly — try recovered passwords and keys across users, hosts and services. This is the highest-yield activity in post-exploitation.

## The defensive mirror

Every store here is one the defensive tracks said to protect: hash passwords slowly and strongly (so \`/etc/shadow\` resists cracking), protect and passphrase SSH keys, use secrets managers rather than configs, don't pass secrets on command lines, and don't reuse credentials. When you dump \`/etc/shadow\` and crack half of it, or find an AWS key in a home directory that still works, you're demonstrating precisely those gaps. Credential access on offence is the direct measure of credential protection on defence.`,
      sample: {
        lang: 'bash',
        caption: 'Cracking /etc/shadow and a protected SSH key (as root, authorized)',
        code: `# as root: combine passwd + shadow, crack offline
unshadow /etc/passwd /etc/shadow > creds.txt
hashcat -m 1800 creds.txt rockyou.txt      # -m 1800 = sha512crypt ($6$)

# a passphrase-protected private key found elsewhere:
ssh2john id_rsa > id_rsa.hash
john --wordlist=rockyou.txt id_rsa.hash    # crack a weak passphrase

# then REUSE recovered passwords across hosts, users, services`,
        output: `jsmith:Summer2024        (sha512crypt cracked - weak password)
$6$...:(not cracked)     (strong password resists - the defensive goal)
id_rsa passphrase: hunter2   (weak passphrase cracked)
# Recovered PLAINTEXT to reuse everywhere. Strong slow hashing +
# strong passphrases + secrets managers + no reuse are exactly what
# make this fail - offence measures those defences directly.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After gaining root on a Linux host, why do testers dump and crack `/etc/shadow` rather than treating root on that one host as the finish line?',
        options: [
          'Because /etc/shadow contains root’s login history',
          'Because it yields users’ password hashes that crack (if weak/old-scheme) into plaintext passwords, which people reuse — so cracking them provides credentials to reach other hosts and services, extending the compromise beyond the single machine',
          'Because /etc/shadow is required to keep the root shell',
          'Because cracking hashes escalates privilege further on the same host',
        ],
        answer: 1,
        explain:
          'Root on one host is only as valuable as what it leads to, and `/etc/shadow` (readable once root) is a rich source of onward access: it holds every local user’s password hash, and because Linux hashes can’t simply be "passed", the value is in cracking them offline into plaintext passwords — which users routinely reuse across other accounts, hosts and services. Recovered credentials feed lateral movement and further escalation, extending the engagement toward its objectives. The crackability depends on the scheme and password strength, which is exactly why defenders use strong slow hashing and forbid reuse — offensive credential access measures those defences directly.',
        hint: 'What can you do with cracked plaintext passwords that a single root shell alone doesn’t give you?',
      },
    },

    {
      id: 'rlin-i-07',
      title: 'Understanding persistence',
      read: `**Persistence** is maintaining access to a compromised system across reboots, logouts and password changes. On an authorized engagement it is used sparingly and within the rules of engagement; understanding it deeply matters most because **it is the mirror of the defensive persistence-hunting** you learned — knowing how attackers persist is exactly how defenders find and evict them.

## Why testers consider persistence

- **Practical** — during a long engagement, a stable way back in avoids re-exploiting each time (and re-exploitation may be noisy or unreliable). Any persistence added must be documented and removed at the end (cleanup is part of the rules of engagement).
- **Demonstrative** — showing that an attacker could establish durable, stealthy persistence is itself a finding (it means detection and response would need to catch it).
- **Red team realism** — in adversary-emulation engagements, persistence models what a real intruder would do, testing whether the blue team detects it.

## The persistence locations (which you already know — from the defensive side)

These are exactly the spots the defensive Linux track taught defenders to hunt:

- **Cron jobs / systemd timers** — a scheduled task that re-establishes access.
- **SSH authorized_keys** — adding a key gives durable login that survives password changes (a favourite because it's simple and survives resets).
- **Systemd services** — a service that runs on boot.
- **Shell startup files** — \`.bashrc\`, \`.profile\`, \`/etc/profile.d/\` running something on login.
- **New or modified accounts** — a backdoor user, or an added UID-0 account.
- **SUID backdoors** — a SUID-root binary dropped for easy re-escalation.
- **Modified binaries or libraries, PAM modules, LD_PRELOAD** — deeper, stealthier hooks (the userland-rootkit territory).
- **WMI-equivalent / less-watched mechanisms** — attackers pick spots defenders forget.

## The offensive-defensive symmetry (the real point)

This is the clearest example in the track of offence and defence being the same knowledge. When you (on an authorized test) add an SSH key or a cron job for persistence, you are placing exactly what the defensive track told blue teams to **hunt** for — and when you document it in the report, you're telling the defender precisely where to look and what to remove. The persistence-hunting checklist from the defensive Linux intermediate level *is* the offensive persistence menu, read from the other direction:

- Offence: "where can I hide so I survive?"
- Defence: "where would an attacker hide, so I can find them?"

Same list, opposite goals.

## Professional discipline

On authorized engagements: only add persistence within the rules of engagement, **document every mechanism** you place (location, exactly what it is), and **remove it all** at the end, giving the client a clear list so they can verify. Unremoved persistence is a serious professional failure — you'd be leaving a real backdoor on a client system. The value is in demonstrating and documenting the *capability* and testing detection, not in actually maintaining covert long-term access.

Understanding persistence completes the picture: it's why defenders hunt the spots they do, and testing whether persistence is detected is a direct measure of the blue team's detection and response — the two sides meeting on the same ground.`,
      sample: {
        lang: 'text',
        caption: 'The persistence menu IS the defensive hunt checklist, reversed',
        code: `OFFENCE asks "where can I persist?"   DEFENCE asks "where would they hide?"
-----------------------------------------------------------------------
add an SSH authorized_keys entry   <-> check every ~/.ssh/authorized_keys
a cron job / systemd timer         <-> audit cron + list-timers
a systemd service on boot          <-> review services (7045-equivalent)
.bashrc / profile.d startup        <-> check shell startup files
a new UID-0 / backdoor account     <-> awk -F: '$3==0' /etc/passwd
a SUID-root backdoor binary        <-> find / -perm -4000
PAM / LD_PRELOAD / library hooks   <-> integrity monitoring, ld.so.preload

SAME LIST, opposite goals. On authorized tests: document every
mechanism placed, and REMOVE it all at the end. Unremoved
persistence = a real backdoor left on a client = a serious failure.`,
        output: `Persistence is the exact mirror of defensive persistence-hunting:
the attacker's hiding spots ARE the defender's checklist. Testers
use it sparingly, to demonstrate capability and test detection -
always documented and fully removed. Understanding it is how
defenders know where to look and what to evict.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does understanding attacker persistence techniques directly serve the defender, and what professional rule governs a tester who uses persistence on an engagement?',
        options: [
          'It does not help defenders; and testers may leave persistence in place',
          'The persistence locations an attacker uses are exactly the spots a defender must hunt (authorized_keys, cron/timers, services, startup files, backdoor accounts, SUID/PAM/library hooks) — so the offensive menu is the defensive checklist reversed; and a tester must use persistence only within the rules of engagement, document every mechanism placed, and remove it all at the end',
          'It only helps attackers; testers should persist permanently for realism',
          'Persistence is irrelevant to both offence and defence',
        ],
        answer: 1,
        explain:
          'Persistence is the clearest case of offence and defence sharing one body of knowledge: every place an attacker plants durable access — SSH keys, cron jobs and timers, boot services, shell startup files, backdoor or UID-0 accounts, SUID binaries, PAM/LD_PRELOAD hooks — is precisely what defensive persistence-hunting checks, so understanding the attacker’s hiding spots is how a defender knows where to look and what to evict. On an authorized test, persistence is used sparingly to demonstrate capability and test detection, and it is governed by a strict professional rule: stay within the rules of engagement, document each mechanism, and remove them all afterwards, because unremoved persistence is a genuine backdoor left on a client system.',
        hint: 'Where an attacker hides is where a defender hunts. And what must a tester never leave behind on the client?',
      },
    },

    {
      id: 'rlin-i-08',
      title: 'Container and cloud escapes',
      read: `Modern Linux workloads run in **containers** and the **cloud**, which add their own escalation and pivoting surface. Understanding container escapes and cloud credential access is increasingly essential — and mirrors the container/cloud hardening from the defensive tracks.

## Container escapes

You may land inside a **container** (a web app runs in Docker, and your foothold is the container, not the host). Escaping to the host — or leveraging the container's access — is the goal. Common routes:

- **Privileged containers** (\`--privileged\`) — nearly all isolation is off; escape is often straightforward (access host devices, mount the host filesystem). A privileged container is close to being root on the host (the defensive container lesson).
- **The mounted Docker socket** — \`/var/run/docker.sock\` inside a container lets you control the Docker daemon and start a new container mounting the host filesystem → host root (the exact defensive warning).
- **Excessive capabilities** — a container with \`CAP_SYS_ADMIN\` or others can often escape.
- **Host mounts** — a bind-mount of a sensitive host path into the container (\`/\`, \`/etc\`, a docker socket) is an escape route.
- **Kernel exploits** — containers share the host kernel, so a kernel vulnerability escapes the container to the host (why the defensive track stressed the shared kernel).
- **Recognising you're in a container** — \`/.dockerenv\`, cgroup contents, and process/mount oddities tell you.

## Kubernetes

In a Kubernetes environment, a compromised pod is a foothold into the cluster:

- **The service account token** — mounted into pods (\`/var/run/secrets/kubernetes.io/serviceaccount/token\`); if over-privileged (a common misconfiguration), it grants access to the Kubernetes API to create pods, read secrets, or escalate across the cluster.
- **Cluster secrets, other pods, the kubelet, and the metadata service** — all reachable from a pod, depending on network policy and RBAC.

## Cloud credential access

Workloads in the cloud carry cloud credentials, and reaching them turns a host compromise into a cloud-account compromise:

- **The instance metadata service (IMDS)** — \`http://169.254.169.254/...\` on a cloud VM returns instance metadata, historically including **temporary IAM credentials** for the instance's role. Reaching it (directly from a foothold, or via SSRF — the defensive web/SSRF lesson) yields cloud credentials scoped to whatever that role can do. (IMDSv2 requires a token, mitigating naive access — the defensive fix.)
- **Credential files** — \`~/.aws/credentials\`, \`~/.config/gcloud\`, environment variables, and CI/orchestration credentials.
- **Over-privileged roles** — if the instance's role has broad permissions (a common misconfiguration), the stolen credentials grant wide cloud access — read other resources, escalate within the cloud IAM, reach data stores.

## The pivot expands

Cloud and container compromise expands the engagement in new directions: from a container to the host, from a host to the cloud account, from one cloud resource to others via IAM. The methodology loops in a cloud dimension — enumerate the cloud permissions you've gained, and move within the cloud environment.

## The defensive mirror

Every technique here maps to defensive container/cloud hardening: don't run privileged containers or mount the docker socket, drop capabilities, keep the host kernel patched, scope Kubernetes service accounts with least-privilege RBAC, enforce IMDSv2, and give instance roles minimal permissions. When you escape a privileged container or pull IAM credentials from an over-permissioned instance, you're demonstrating exactly those failures — and the report's fixes are the defensive controls, applied.`,
      sample: {
        lang: 'bash',
        caption: 'Recognising a container, and reaching cloud credentials via IMDS',
        code: `# am I in a container?
ls -la /.dockerenv 2>/dev/null; cat /proc/1/cgroup | grep -i docker
# a mounted docker socket = escape to host root:
ls -la /var/run/docker.sock          # if present -> control the daemon

# a Kubernetes pod's service account token:
cat /var/run/secrets/kubernetes.io/serviceaccount/token

# cloud instance metadata -> temporary IAM credentials (if IMDSv1)
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/`,
        output: `/.dockerenv present  ->  we're in a container
/var/run/docker.sock exists  ->  start a host-mounting container -> host root
k8s token: eyJ...  ->  query the API; if over-privileged, read secrets/create pods
IMDS: app-instance-role  ->  temporary AccessKeyId/SecretAccessKey/Token
# Host compromise becomes CLOUD compromise. Defences: no privileged
# containers / socket mounts, drop caps, patch the kernel, least-priv
# k8s RBAC and instance roles, and enforce IMDSv2 - the exact mirror.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does reaching the cloud instance metadata service (169.254.169.254) from a compromised cloud host or via SSRF turn a host compromise into a potential cloud-account compromise?',
        options: [
          'Because the metadata service stores the root password',
          'Because it can return the instance role’s temporary IAM credentials, which grant whatever that role is permitted to do in the cloud — so if the role is over-privileged (a common misconfiguration), the stolen credentials give broad access to other cloud resources; the defensive fixes are least-privilege roles and enforcing IMDSv2',
          'Because the metadata service runs as root on every host',
          'Because 169.254.169.254 is the cloud provider’s admin console',
        ],
        answer: 1,
        explain:
          'A cloud VM is usually assigned an IAM role, and the instance metadata service hands out temporary credentials for that role to code running on the instance. An attacker who reaches IMDS — directly from a foothold, or by pointing an SSRF vulnerability at it — obtains those credentials and can then act with the role’s permissions across the cloud account. If the role is scoped minimally the damage is contained, but roles are frequently over-privileged, so the credentials often unlock other resources, data stores and IAM escalation. The defensive countermeasures are exactly least-privilege instance roles and enforcing IMDSv2 (which requires a session token and blocks naive SSRF-style access).',
        hint: 'What does IMDS hand out, and what determines how far those credentials reach?',
      },
    },

    {
      id: 'rlin-i-09',
      title: 'Understanding detection and evasion',
      read: `Everything a tester does can be **detected** — the scans, the exploits, the shells, the lateral movement all generate the signals you learned to hunt on the defensive side. Understanding detection (and, at a conceptual level, evasion) matters for realistic testing and, crucially, for advising defenders on what they can and should catch. This is knowledge for understanding and improving detection, not a recipe for evading real-world defences maliciously.

## What generates detection

Recall the defensive tracks — everything there is what your activity trips:

- **Scanning** — port scans and sweeps light up IDS and flow analysis (the scan-detection you built).
- **Exploitation** — a reverse shell (a service account spawning \`bash\` with an outbound connection), a web shell, unusual process ancestry — all high-signal on the endpoint and network.
- **Credential attacks** — failed-login floods (4625-equivalent auth logs), which brute-force detection catches.
- **Privilege escalation** — auditd records execve, sudo use, and identity-file changes; unusual escalation stands out.
- **Persistence** — the exact spots defensive persistence-hunting checks.
- **Lateral movement** — east-west connections, admin-protocol fan-out, new host-to-host relationships (the network lateral-movement detection).
- **Pivoting/tunnelling** — anomalous outbound connections, beaconing.

## The two testing postures

- **Loud (most engagements)** — a standard penetration test isn't trying to be stealthy; thoroughness matters more, and the client often wants a full picture of vulnerabilities. You scan and exploit openly.
- **Quiet (red team / adversary emulation)** — the engagement's goal is to test *detection and response*, so the tester tries to operate the way a real, careful adversary would and see whether the blue team notices. Here, understanding what generates signal — and what a real attacker does to reduce it — is central.

## Evasion, conceptually

Real adversaries reduce their footprint, and testers emulating them understand these categories (the defensive tracks taught you to detect the evasion itself):

- **Living off the land (LOTL)** — using built-in, trusted tools rather than dropping malware, so there's no file to detect (the LOLBin detection lesson).
- **Timing and low-and-slow** — spreading activity out to stay under thresholds.
- **Avoiding noisy techniques** — preferring valid credentials over exploits, targeted actions over broad scans.
- **Blending with normal traffic** — using common ports/protocols, encrypted channels.
- **Cleaning up** — but note that log tampering is itself detectable (centralized logging defeats it), and on authorized tests you don't destroy client logs.

## The defensive payoff (the real point)

Understanding detection and evasion is what makes a tester's report *actionable for the blue team*. A red-team engagement's most valuable output is often: "here's what we did, here's what you detected, here's what you missed, and here's how to catch it next time." That maps directly to the purple-teaming loop from the defensive tracks — the tester's evasion tests the detections, and the gaps become the blue team's backlog.

This is the honest frame: the point of understanding evasion in an authorized context is to *measure and improve detection*, not to defeat defences for harm. A tester who understands both sides can tell a client exactly where their detection is strong and where it's blind — which is worth far more than a list of vulnerabilities alone.`,
      sample: {
        lang: 'text',
        caption: 'Every offensive action maps to a defensive detection',
        code: `Offensive action          Detection it generates (the defensive tracks)
-----------------------------------------------------------------------
port scan / sweep      -> IDS scan detection, flow fan-out
reverse shell          -> service acct spawns bash + outbound conn (high signal)
brute force            -> failed-login flood (auth log bursts)
privilege escalation   -> auditd execve/sudo/identity-file changes
persistence            -> the persistence-hunting checklist trips
lateral movement       -> east-west admin-protocol connections
pivot / tunnel         -> anomalous outbound / beaconing

Red-team value: "here's what we did, what you DETECTED, what you
MISSED, and how to catch it" -> the purple-teaming loop. Evasion
understood to MEASURE and IMPROVE detection, not to harm.`,
        output: `All offensive activity generates the signals defenders hunt. Most
tests are loud (thoroughness); red-team tests are quiet (to test
DETECTION). Understanding evasion in an authorized context exists
to tell the client where detection is strong and where it's blind -
the most valuable output, and the offensive half of purple teaming.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In an authorized red-team engagement, what is the primary purpose of understanding detection and evasion?',
        options: [
          'To permanently defeat the organisation’s defences',
          'To test and measure the blue team’s detection and response — operating as a careful adversary would to see what is caught and what is missed — so the report can tell the client exactly where their detection is strong and where it is blind, and how to close the gaps (the purple-teaming loop)',
          'To destroy the organisation’s logs so nothing is recorded',
          'To avoid ever being detected, as an end in itself',
        ],
        answer: 1,
        explain:
          'Every offensive action generates the very signals defenders hunt, so a red-team engagement that operates the way a real, careful adversary would is really a test of the blue team’s detection and response. The value is the resulting picture — what was detected, what was missed, and how to catch it next time — which feeds directly into the purple-teaming improvement loop from the defensive tracks. Understanding evasion in this authorized context exists to measure and improve detection, not to defeat defences for harm or to destroy the client’s logs (which testers never do); the most valuable output is telling the client where their detection is strong and where it is blind.',
        hint: 'A red team’s real product is not "we got in" but "here is what you detected and missed". What does understanding evasion serve?',
      },
    },

    {
      id: 'rlin-i-10',
      title: 'Command and control, conceptually',
      read: `Real intrusions rarely rely on a single reverse shell; they use **command-and-control (C2)** infrastructure to manage access reliably. Testers emulating adversaries use C2 frameworks, and understanding C2 conceptually matters most for recognising and detecting it — the mirror of the C2 detection you built defensively. This step is about *how C2 works and why*, not about building or weaponising malware.

## What C2 provides over a raw shell

A plain reverse shell is fragile (dies if the connection drops), single-channel, and manual. C2 frameworks add:

- **Reliable, resilient sessions** — an implant (agent) on the target that reconnects, survives interruptions, and can be managed.
- **Beaconing** — the implant checks in periodically for tasks rather than holding an open connection (the beaconing pattern you learned to detect), often with **jitter** to vary timing.
- **Multiple channels and protocols** — C2 over HTTPS, DNS, or other protocols that blend with normal traffic; the ability to switch channels.
- **A framework of capabilities** — file transfer, screenshots, credential access, pivoting, and post-exploitation modules, managed from an operator console.
- **Multi-agent management** — coordinating access across many compromised hosts.

## The frameworks

Legitimate, widely-used C2 frameworks for authorized red teaming include **Cobalt Strike** (commercial, the industry standard, also abused by criminals), **Sliver**, **Mythic**, **Havoc**, and the older **Empire/Metasploit**. Testers use these on authorized engagements to emulate real adversary tradecraft; the same tools appear in real intrusions, which is why defenders study their signatures.

## C2 detection (the defensive mirror — the point)

Everything that makes C2 effective is also what makes it *detectable*, and you learned to hunt exactly these:

- **Beaconing** — regular check-ins reveal the implant even through encryption (the timing/size analysis from the defensive network track).
- **JA3/JARM and TLS anomalies** — C2 frameworks have recognisable TLS fingerprints (default Cobalt Strike JARM is famous).
- **Anomalous destinations and channels** — DNS tunnelling, connections to new/rare hosts, C2 over legitimate services.
- **Malleable profiles** — attackers shape traffic to evade signatures, which is why behavioural detection (not just signatures) matters.
- **Host-side implant behaviour** — process injection, unusual parent-child relationships, the implant's own footprint (EDR territory).

## The professional frame

On authorized engagements, C2 is used to emulate realistic adversary behaviour and — critically — to **test whether the blue team detects it**. The value, again, is the detection picture: did the SOC catch the beaconing? the JA3? the DNS channel? A red-team C2 exercise directly measures the C2 detection the defensive tracks built.

Understanding C2 conceptually is what lets a tester emulate real threats and advise defenders on detection, and what lets a defender recognise C2 for what it is. It is not about creating malware — the frameworks exist and are studied by both sides — but about understanding the tradecraft well enough to test and to catch it. That dual understanding is exactly the purple-team value: the tester's C2 tests the blue team's ability to see it.`,
      sample: {
        lang: 'text',
        caption: 'What C2 adds — and how each feature is detectable',
        code: `C2 capability                         How defenders detect it
-----------------------------------------------------------------------
beaconing implant (periodic check-in) timing/size analysis (even over TLS)
HTTPS / DNS / legit-service channels  JA3/JARM, DNS entropy, rare destinations
jitter + malleable profiles           behavioural detection, not just signatures
process injection / stealth on host   EDR: injection, odd parent-child
multi-host management                 correlated beaconing across the fleet

Authorized use: emulate real adversary tradecraft to TEST whether
the blue team detects it. The value is the detection picture -
the offensive half of the C2-detection purple loop. Understanding,
not malware creation: the frameworks exist; both sides study them.`,
        output: `C2 gives resilient, managed, blending access beyond a fragile
reverse shell - and every feature that makes it effective
(beaconing, TLS fingerprint, channels) is what makes it
DETECTABLE. Testers use C2 (Cobalt Strike/Sliver/Mythic) on
authorized engagements to measure C2 detection. Conceptual
understanding serves testing and defence, not weaponization.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is beaconing — a feature that makes C2 resilient and stealthy — also one of the most reliable ways defenders detect it?',
        options: [
          'Because beaconing sends the attacker’s password in cleartext',
          'Because periodic check-ins produce regular, repeated connections whose timing and size patterns are visible even through encryption — so the very behaviour that lets the implant survive and blend in also creates a detectable signature (the timing/size analysis defenders use), making C2 a prime target for behavioural detection',
          'Because beaconing only works over unencrypted channels',
          'Because beaconing requires the attacker to disable the firewall',
        ],
        answer: 1,
        explain:
          'Beaconing gives C2 its resilience and low profile — the implant checks in periodically rather than holding an open connection — but that periodicity is itself a signature: regular, repeated connections to a destination reveal the implant through timing and size analysis even when the payload is TLS-encrypted, which is exactly the behavioural detection built in the defensive network track. Attackers add jitter and shape traffic to blend in, which is why detection relies on statistical behaviour rather than fixed signatures. The general lesson is that the features making C2 effective (beaconing, recognisable TLS fingerprints, specific channels) are the same features that make it detectable, so a red team’s C2 directly tests the blue team’s ability to catch it.',
        hint: 'What about a repeated, scheduled check-in is visible even when the content is encrypted?',
      },
    },

    {
      id: 'rlin-i-11',
      title: 'Documenting the attack path',
      read: `An intermediate engagement produces a *chain* — a foothold, escalation, credential harvest, pivot, lateral movement, more escalation — and documenting that **path** clearly is what turns a complex compromise into an actionable report. The documentation skill scales with the engagement's complexity.

## Why the path, not just the findings

A list of individual vulnerabilities undersells the risk. The **story** — how a single web flaw became domain-wide compromise through a series of steps — is what conveys real impact to the client and shows *why* each finding matters in context. "SQL injection in the login form" is a medium finding alone; "SQL injection → foothold → cracked reused password → SSH to internal DB server → customer data" is a critical business risk. The chain is the point.

## What to document per step

For each step in the chain:

- **What you did** — the technique and the specific action.
- **What made it possible** — the underlying weakness (the finding).
- **What it gave you** — the access or information gained, which enabled the next step.
- **Evidence** — commands, output, screenshots, proof (a hash, a record count) — enough to *reproduce and verify*.
- **The remediation** for that specific weakness.

## Visualising the path

An **attack-path diagram** — a graph of hosts, the steps between them, and the finding that enabled each hop — communicates a complex compromise far better than prose. It shows the client the route an attacker took (and could take again) at a glance, and highlights the **choke points**: fixing one link often breaks the whole chain, which is valuable prioritisation guidance. (This is the offensive analogue of the BloodHound attack-path thinking from the defensive Windows track — mapping the graph of how you got from A to the crown jewels.)

## The report structure for a chained compromise

- **Executive summary** — the overall risk story and business impact ("a single external vulnerability led to full compromise of the internal network and access to customer data"), for leadership.
- **The attack narrative / path** — the chain, step by step, with the diagram.
- **Individual findings** — each weakness in the chain, with severity, evidence, and remediation, so engineers can fix each one.
- **Prioritised remediation** — what to fix first, informed by which fixes break the most attack paths.

## Notes are the foundation (again)

This is why the enumeration mindset stressed noting everything, and why post-exploitation stressed tracking your actions: your continuous, detailed notes — every host, credential, command and step, in order — are what the path documentation is built from. Without them you cannot reconstruct a complex chain accurately or reproduce it for verification. Good notes throughout are the difference between a clear, credible report and a vague one.

## The deliverable is still the fix

The path documentation exists to drive remediation. Showing the chain, and the choke points that break it, tells the client not just what's wrong but where to invest defensively for the most effect. The most valuable report doesn't just list holes — it shows the route through them and the smallest set of fixes that closes it.`,
      sample: {
        lang: 'text',
        caption: 'An attack-path diagram: the chain, and the choke points',
        code: `[Internet]
   | (1) SQLi in /login  ->  auth bypass + DB read        [Finding A]
   v
[web01 DMZ]  (2) creds from DB reused for SSH             [Finding B]
   | (3) sudo awk misconfig -> root                        [Finding C]
   | (4) 2nd NIC + no segmentation -> reach 172.16.0.0/24 [Finding D]
   v (pivot)
[dbserver internal] (5) SSH key from web01 authorized here [Finding E]
   v
[customer database]  -> demonstrated access (record count)

Choke points: fix (2) reused creds OR (4) segmentation and the
chain to internal breaks. That prioritisation is the report's value.`,
        output: `Document the PATH, not just findings: the chain (SQLi -> reused
creds -> root -> pivot -> internal DB) shows the true business
risk that a list of separate bugs hides. A path diagram reveals
CHOKE POINTS - fixes that break the whole chain - guiding
prioritised remediation. Built from continuous notes; the
deliverable is still the fix.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is documenting the full attack path (the chain of steps) more valuable to a client than listing the individual vulnerabilities separately?',
        options: [
          'Because clients only read diagrams, not text',
          'Because the chain conveys the true business impact that separate findings hide (a single external flaw leading to full internal compromise), and mapping the path reveals choke points — fixes that break the whole chain — which lets the client prioritise remediation for maximum effect',
          'Because individual findings never need remediation',
          'Because the path replaces the need to fix anything',
        ],
        answer: 1,
        explain:
          'A list of standalone vulnerabilities understates risk, because the danger lies in how they combine: a medium SQL injection becomes critical once it chains through reused credentials, a sudo misconfiguration, and a flat internal network into the customer database. Documenting the path tells that story, conveying the real business impact to leadership, and — like the BloodHound attack-path thinking on the defensive side — it exposes choke points where a single fix (e.g. eliminating credential reuse or adding segmentation) breaks the whole chain. That guides prioritised remediation, which is the report’s central value; it does not replace fixing the individual findings but shows which to fix first.',
        hint: 'Does the danger live in each bug alone, or in how they connect — and what does seeing the connections let the client prioritise?',
      },
    },

    {
      id: 'rlin-i-12',
      title: 'Project: pivot and conquer a lab network',
      read: `Bring the level together into the exercise that consolidates post-exploitation, pivoting and lateral movement: build (or use) a **multi-host lab network** and compromise it end to end — external foothold, escalate, pivot to an internal segment, move laterally, and reach a protected "crown jewel", documenting the whole path.

## The setup

Build a small lab network (or use a multi-machine lab / pro-lab on a platform like Hack The Box):

- A **perimeter host** (e.g. a web server) reachable from your attacker box.
- An **internal segment** reachable only from the perimeter host (a second network), containing further hosts — a file server, a database, an internal app, and a **target** (domain controller, a sensitive data store) as the objective.
- Isolate the whole thing from your real network, as always.

## The exercise

1. **Foothold** — enumerate and compromise the perimeter host (the earlier levels' skills). Stabilise your shell.
2. **Escalate** — get root on the perimeter host; hunt credentials.
3. **Internal recon** — from the foothold, discover the internal segment, its hosts, and services (including localhost-bound ones).
4. **Pivot** — set up a SOCKS proxy / tunnel (SSH, chisel, or ligolo-ng) so your tools reach the internal network.
5. **Move laterally** — use harvested credentials, keys, and (where needed) internal-service exploits to compromise internal hosts, through the pivot. Repeat the cycle on each new host.
6. **Chain to the objective** — reach the crown jewel, possibly double-pivoting through a second internal host to a deeper segment.
7. **Document the path** — the full chain, an attack-path diagram, each finding with remediation, and the choke points.

## Do it professionally

- **Loop the methodology** on every host — situational awareness, credential hunting, escalate, re-enumerate the network position — because each host is a new position that may open the next.
- **Credentials are the currency** — most lateral movement will be found keys and reused passwords; hunt relentlessly and reuse everywhere.
- **Notes throughout** — the multi-host chain is impossible to document accurately without them.
- **Understand every step** — foothold, escalation, pivot and lateral hop alike.
- **Stay isolated and authorized** — your lab or an authorized platform.

## The measure of success

You can take a segmented, multi-host network from a single external foothold to the internal objective — escalating, pivoting, and moving laterally with harvested credentials, looping the methodology on each host — and produce a clear attack-path report with prioritised, choke-point-aware remediation.

> The level distilled: a foothold's value is realised in **post-exploitation** — internal reconnaissance revealing the soft interior, **pivoting** to route your tools through the compromised host, and **lateral movement** driven by harvested **credentials and trust** — with escalation on each host and the methodology looping as you go deeper. Every pivot and lateral hop is a defensive finding (missing segmentation, credential reuse, over-broad trust), and the report's attack-path diagram shows the client the route and the choke points that break it. All in your lab or on authorized targets. The skilled and pro levels deepen the tradecraft, but this pivot-and-conquer chain is the intermediate offensive core.`,
      sample: {
        lang: 'text',
        caption: 'The multi-host chain: external foothold to internal objective',
        code: `[attacker] --ext--> [web01 DMZ]  foothold (web vuln) -> root
                         |  loot: SSH key, reused DB password
                         |  internal recon: 172.16.0.0/24 (unreachable to me)
                    set up pivot (ligolo-ng / ssh -D + proxychains)
                         v
        [fileserver 172.16.0.10]  reached via found SSH key -> loot more
                         v  (double pivot: fileserver reaches 10.0.0.0/24)
        [dbserver 10.0.0.5]  reached via reused password -> root
                         v
        [OBJECTIVE: customer database]  access demonstrated

Report: attack-path diagram + each finding + remediation.
Choke points: segment DMZ<->internal, kill credential reuse.`,
        output: `Single external foothold -> escalate -> pivot -> lateral movement
on harvested credentials -> double-pivot -> internal objective,
looping the methodology on each host and documenting the chain.
Every hop a defensive finding (segmentation, reuse, trust); the
path diagram shows the choke points. Lab/authorized only. That
pivot-and-conquer chain is the intermediate offensive core.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a multi-host compromise, why must a tester "loop the methodology" (situational awareness, credential hunting, escalation, network re-recon) on every newly compromised host rather than only on the first?',
        options: [
          'Because the first host’s findings apply automatically to all others',
          'Because each new host is a fresh vantage point with its own credentials, privilege-escalation paths, and network reach — often the key to the next hop — so re-running the full cycle on every host is what uncovers the chain that leads deeper toward the objective',
          'Because tools only work on the most recently compromised host',
          'Because the methodology is only needed for the final target',
        ],
        answer: 1,
        explain:
          'A compromise deepens host by host, and every host you reach is a new position that may hold the credentials, keys, escalation path, or network visibility needed for the next hop — a file server holds a key to the database server, which in turn can reach a deeper segment. Treating only the first host thoroughly and skimming the rest means missing the very findings that extend the chain toward the objective. Looping the full methodology — situational awareness, credential hunting, escalation, and network re-reconnaissance — on each host is what systematically uncovers the path, and (with continuous notes) what lets you document it. Nothing about the first host’s findings transfers automatically to the others.',
        hint: 'Is each new host just a trophy, or a new vantage point that may hold the key to the next one?',
      },
    },
  ],
}

export default level
