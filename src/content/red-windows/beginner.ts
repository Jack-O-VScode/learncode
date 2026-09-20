import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'Offensive Windows — ethics, lab and Active Directory',
  summary:
    'Authorized offensive security for Windows from zero. The law and authorization that make it legitimate; a safe Windows/AD lab of your own; why Active Directory is the real target; the Windows security model from an attacker’s view; and the enumeration mindset applied to Windows hosts and domains. Only ever on systems you own or are contracted to test.',
  outcomes: [
    'State the authorization and legal rules for Windows testing',
    'Build a safe Windows and Active Directory lab',
    'Explain why Active Directory is the central objective',
    'Read the Windows security model as an attacker does',
    'Enumerate a Windows host from a foothold',
    'Understand the methodology applied to Windows and AD',
  ],
  steps: [
    {
      id: 'rwin-b-01',
      title: 'Rules, lab and the Windows landscape',
      read: `Offensive security on Windows follows the same non-negotiable foundation as everywhere: **authorization is the entire difference between a professional and a criminal.** The techniques in this track are legitimate only against systems you own or are explicitly, in writing, authorized to test — your own lab, licensed practice environments, and platforms/bug-bounties that grant permission. Unauthorized access to a Windows system or an Active Directory domain is a crime under the CFAA, the Computer Misuse Act, and equivalents, regardless of intent. Keep everything here on your own turf.

## Why Windows and Active Directory

Windows dominates enterprise environments: most corporate desktops and a large share of servers run it, and they're almost always joined into an **Active Directory** domain — Microsoft's centralized identity and management system. This makes Windows/AD *the* environment for most enterprise offensive work. Where Linux engagements often target individual hosts and services, Windows engagements are usually about the **domain**: getting a foothold on one machine and working toward control of Active Directory, because Domain Admin means control of everything.

## The lab you need

Build an isolated Windows/AD lab (the safe, legal place to practise):

- **A hypervisor** (VirtualBox/VMware) on an **isolated host-only/internal network**.
- **A Domain Controller** — a Windows Server VM running Active Directory (Microsoft provides free evaluation VMs and licenses for lab use).
- **Domain-joined workstations/servers** — one or two Windows client/server VMs joined to the domain, to model a real environment.
- **An attacker machine** — Kali/Parrot (many Windows/AD attack tools run from Linux), and/or a Windows VM with tools.
- **Snapshots** and isolation, as always.

Building an AD lab teaches you enormously (you see how the domain fits together from the inside), and it's the only lawful place to practise these techniques. Pre-built lab projects (GOAD — "Game of Active Directory", and others) automate a vulnerable AD environment for practice; platforms like Hack The Box and TryHackMe offer authorized AD labs online.

## The same methodology, Windows-flavoured

The penetration-testing methodology (recon → enumerate → exploit → post-exploit → report) applies, but the emphasis shifts to AD: extensive enumeration of the domain, gaining an initial foothold (often via a service, a web app, weak credentials, or phishing), then the AD-specific work of privilege escalation and lateral movement toward Domain Admin. **Enumeration is still decisive**, and understanding the Windows security model and Active Directory (the next steps) is the foundation everything builds on.

## The defensive mirror, from the start

As with the Linux track, every technique here is a defensive finding in reverse — and it maps directly onto the **Defensive Windows** track: the AD attacks you'll learn (Kerberoasting, pass-the-hash, DCSync, and the rest) are exactly what that track taught defenders to detect and prevent. You learn to attack AD so you can help secure it; offence and defence are the same knowledge, and the whole point of finding the path to Domain Admin is to help the defender close it.`,
      sample: {
        lang: 'text',
        caption: 'The Windows engagement: a foothold, then the road to Domain Admin',
        code: `Linux engagements often target individual hosts/services.
Windows engagements are usually about the DOMAIN:

  foothold on ONE machine (service / web app / weak creds / phishing)
     -> enumerate Active Directory extensively
     -> privilege escalation + lateral movement
     -> reach DOMAIN ADMIN = control of EVERY machine and account

Lab (isolated, legal): a Domain Controller + domain-joined VMs +
an attacker box. Pre-built vulnerable AD labs (GOAD) and platforms
(HTB/TryHackMe) provide authorized practice.

Authorization is the entire difference. Own turf only.`,
        output: `Windows/AD is the dominant enterprise environment, so most
enterprise offensive work is about reaching DOMAIN ADMIN. Same
methodology, AD-focused. Practise only in an isolated lab / on
authorized platforms. Every technique mirrors the Defensive
Windows track - you learn to attack AD to help secure it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are Windows enterprise engagements usually centred on Active Directory rather than on individual hosts?',
        options: [
          'Because Windows hosts have no individual vulnerabilities',
          'Because enterprise Windows machines are almost always joined into an Active Directory domain, and control of AD (Domain Admin) means control of every domain-joined machine and account — so the engagement’s real objective is working from an initial foothold toward domain dominance',
          'Because Active Directory is the only thing that can be scanned',
          'Because individual hosts cannot be exploited on Windows',
        ],
        answer: 1,
        explain:
          'Active Directory centralises identity and management across the enterprise, so domain-joined machines and accounts are all governed by it. Reaching Domain Admin therefore grants control of the entire environment at once, which makes it the natural objective of a Windows engagement: get an initial foothold on some machine (via a service, web app, weak credentials, or phishing) and then perform the AD-specific privilege escalation and lateral movement that lead to domain dominance. Individual hosts still matter as footholds and stepping stones, but the campaign is about the domain — which is exactly why the defensive Windows track concentrated on protecting AD.',
        hint: 'What does controlling Active Directory give an attacker across all the domain’s machines and accounts?',
      },
    },

    {
      id: 'rwin-b-02',
      title: 'Active Directory for attackers',
      read: `To attack Active Directory you need its map (you met this defensively; here it's the attacker's terrain). AD is a database of the organisation's users, computers, and their relationships, plus the authentication that ties it together.

## The pieces that matter offensively

- **Domain** — the boundary of shared identity (\`corp.local\`). All the users and computers in it are potential targets and stepping stones.
- **Domain Controller (DC)** — the server holding AD and authenticating logons. **Compromising a DC is compromising the domain** — it's the ultimate objective, because from it you can access or reset anything.
- **Domain accounts** — one identity works across every domain-joined machine, so a single compromised credential can be reused broadly (the reuse principle, at domain scale).
- **Groups** — especially the **privileged** ones: **Domain Admins** (full domain control — the crown jewels), Enterprise Admins, and others. Getting into a privileged group, or compromising a member, is the goal.
- **Kerberos** — the domain's authentication protocol (tickets, not passwords on the wire). Its design quirks are heavily targeted (Kerberoasting, AS-REP roasting, golden/silver tickets — the intermediate/skilled levels), so understanding it is essential.
- **Group Policy (GPO)** — central configuration pushed to machines; can be abused for lateral movement/persistence if you can modify it.
- **Trusts** — relationships between domains/forests, which can let an attacker move between them.

## How attackers see AD: as a graph

Crucially, attackers view AD not as an org chart but as a **graph of privilege relationships** — who is an admin on what, who is in which group, who has rights over whom, where privileged users are logged on. The objective is to find a **path** through that graph from your starting position to Domain Admin. This is the **BloodHound** insight (which you met defensively): escalation in AD is usually a *chain* of relationships, and the attacker hunts the shortest path to domain dominance. Much of AD attack technique is enumerating this graph and walking a path through it.

## Why understanding AD deeply matters

Everything in this track — the enumeration, the Kerberos attacks, lateral movement, the escalation to Domain Admin — operates on these AD components. Without a clear mental model of domains, DCs, privileged groups, Kerberos, and the relationship graph, the techniques are just commands; with it, they're a coherent campaign toward a clear objective. And it's the same model the defensive track used — the attacker enumerates the graph to find a path to Domain Admin; the defender enumerates the same graph to *remove* those paths. Hold the AD map, and the rest of the track has a place to fit.`,
      sample: {
        lang: 'text',
        caption: 'AD as a graph: the attacker hunts a path to Domain Admin',
        code: `Attacker's view of Active Directory (not an org chart - a GRAPH):

  [you: a foothold as user 'jdoe']
     --MemberOf-->     [group: Helpdesk]
     --CanResetPassword--> [user: svc-app]
     --MemberOf-->     [group: Server Admins]
     --AdminTo-->      [computer: APP-07]
     --HasSession-->   [user: DA-alice  (Domain Admin logged on there)]
  => a 4-hop PATH from jdoe to Domain Admin

Objective: find and walk a path through the graph to Domain Admin
(or to a Domain Controller). BloodHound maps this graph.`,
        output: `AD is a database of users, computers and relationships, with
Kerberos authenticating it. Key targets: the DC (= the domain),
privileged groups (Domain Admins), Kerberos, GPO, trusts.
Attackers see AD as a GRAPH and hunt a PATH to Domain Admin -
the same graph the defender enumerates to REMOVE those paths.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do attackers (and defenders) think of Active Directory as a "graph of relationships" rather than an organisational chart?',
        options: [
          'Because AD stores actual org charts',
          'Because privilege in AD flows through relationships — group memberships, admin rights on machines, password-reset rights, active sessions — and escalation is usually a chain of these, so the objective is to find a path through the graph from a foothold to Domain Admin (which BloodHound maps), and defenders analyse the same graph to remove those paths',
          'Because AD cannot be enumerated any other way',
          'Because graphs are only a visualization with no real meaning',
        ],
        answer: 1,
        explain:
          'Access in Active Directory is determined by relationships: who belongs to which group, who is an administrator on which computer, who can reset whose password, who has delegated rights over whom, and where privileged users have active sessions. Escalation to Domain Admin is rarely a single misconfiguration; it is typically a chain of these edges linked together. Representing AD as a graph makes those chains visible and lets an attacker compute the shortest path from their foothold to domain dominance — exactly what BloodHound does — while defenders analyse the identical graph to find and cut the dangerous edges. The graph model is what turns a maze of objects into a coherent picture of attack paths.',
        hint: 'Is escalation to Domain Admin usually one bad setting, or a chain of relationships linked together?',
      },
    },

    {
      id: 'rwin-b-03',
      title: 'The Windows security model, attacker’s view',
      read: `You met the Windows security model defensively; the attacker reads the same model asking "what does this let me do, and how do I get more?"

## Identity: SIDs, tokens, and privileges

- **SIDs** identify every user, group and computer; Windows decides access on SIDs, not names. The attacker cares about *which* SIDs they hold and which powerful ones they want to reach.
- **Access tokens** — at logon, Windows builds a token listing your SIDs, groups and **privileges**. Your token *is* your authority; stealing or manipulating tokens (token impersonation — an amateur topic) is a Windows-specific escalation route.
- **Privileges** — beyond group membership, tokens carry privileges that grant broad abilities. Some are effectively keys to the system: **SeImpersonatePrivilege** (impersonate a client — the basis of "potato" escalation attacks), **SeDebugPrivilege** (read any process's memory, including LSASS for credentials), **SeBackupPrivilege** (read any file, bypassing ACLs), **SeTakeOwnership**, **SeLoadDriver**. A low-privileged account holding one of these is often a direct escalation path — so \`whoami /priv\` is one of the first things an attacker checks.

## Accounts and UAC

- **Standard vs administrator vs SYSTEM** — SYSTEM (the machine's most powerful local account) is the local escalation goal on a host, as root is on Linux.
- **Local vs domain accounts** — domain accounts reach many machines; a compromised domain credential is broadly reusable.
- **UAC** — even admins run with a limited token until they elevate; attackers seek **UAC bypasses** to elevate silently. The attacker wants the full admin/SYSTEM token, not the filtered one.

## Where credentials live (the Windows difference)

The single most important Windows-specific concept for an attacker: **credential material is stored and reusable**. Windows keeps password hashes, Kerberos tickets, and cached credentials in memory (in **LSASS**) and elsewhere. This enables the defining Windows attacks:

- **Pass-the-hash** — authenticate with a stolen NTLM *hash*, no password needed.
- **Pass-the-ticket** — reuse a stolen Kerberos ticket.
- **Credential dumping** — extract hashes/tickets from LSASS (the Mimikatz concept).

On Linux you crack a hash to get a password; on Windows you can often **use the hash directly**, which makes credential theft even more central. This is why so much Windows/AD attack technique revolves around stealing and reusing credential material — and why the defensive track put so much into protecting LSASS (Credential Guard, PPL) and preventing reuse (LAPS, tiering).

## Reading the model for opportunity

The attacker reads the Windows model for: powerful privileges they hold (\`whoami /priv\`), the token they can get, the credentials cached on the box, and the SIDs/groups that lead toward SYSTEM (locally) and Domain Admin (in the domain). Same model as the defender's, opposite question — "what does this enable, and how do I escalate?"`,
      sample: {
        lang: 'powershell',
        caption: 'Reading identity and privileges for escalation opportunity',
        code: `whoami                 # who am I (user + domain)
whoami /groups         # my group SIDs - any privileged ones?
whoami /priv           # my PRIVILEGES - the escalation goldmine`,
        output: `corp\\jdoe
GROUPS: CORP\\Domain Users, BUILTIN\\Users, CORP\\Helpdesk
PRIVILEGES:
  SeImpersonatePrivilege   Enabled   <- "potato" escalation to SYSTEM!
  SeBackupPrivilege        Enabled   <- read ANY file (bypass ACLs)
# Windows decides on SIDs/tokens; certain PRIVILEGES are direct
# escalation paths. And credentials (hashes/tickets) are stored and
# REUSABLE (pass-the-hash/ticket) - the defining Windows difference.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the defining Windows-specific concept that makes credential theft even more central to Windows attacks than to Linux?',
        options: [
          'Windows passwords are always weaker',
          'Windows stores reusable credential material (NTLM hashes, Kerberos tickets, cached credentials) in memory and elsewhere, so an attacker can often use a stolen hash or ticket directly (pass-the-hash / pass-the-ticket) without ever cracking it — making credential dumping and reuse a dominant technique',
          'Windows has no password hashing',
          'Credentials cannot be stolen on Linux at all',
        ],
        answer: 1,
        explain:
          'On Linux you generally must crack a captured hash to obtain a usable password. Windows, to enable single sign-on and its authentication protocols, keeps reusable credential material — NTLM hashes, Kerberos tickets (TGTs/service tickets), and cached credentials — in memory (notably in LSASS) and other stores. That means an attacker who dumps a hash or ticket can frequently authenticate with it *directly* (pass-the-hash, pass-the-ticket) with no cracking at all, so stealing and reusing credential material becomes the dominant path to escalation and lateral movement. This is precisely why the defensive Windows track invested so heavily in protecting LSASS (Credential Guard, PPL) and preventing reuse (LAPS, tiered administration).',
        hint: 'On Linux you crack a hash to get the password. On Windows, what can you often do with the hash or ticket directly?',
      },
    },

    {
      id: 'rwin-b-04',
      title: 'Enumerating a Windows foothold',
      read: `After gaining an initial foothold on a Windows host (as a low-privileged user or service account), the first work — as on Linux — is **situational awareness**: understanding where you are, who you are, and what you can reach, to find paths to SYSTEM (locally) and into the domain.

## Host situational awareness

- **Identity and privileges** — \`whoami\`, \`whoami /groups\`, \`whoami /priv\` (the powerful-privilege check from the last step), \`whoami /all\`.
- **System info** — \`systeminfo\` (OS version, patches/hotfixes — an unpatched system may have a known local-privilege-escalation exploit), \`hostname\`.
- **Users and groups** — \`net user\`, \`net localgroup administrators\` (who's a local admin?), and domain equivalents.
- **Network** — \`ipconfig /all\`, \`route print\`, \`arp -a\` (what networks/hosts can this box reach — pivot opportunities and the domain), \`netstat -ano\` (connections and listening services).
- **Processes and services** — \`tasklist /svc\`, \`Get-Process\`, and services (which run as SYSTEM, and are any misconfigured — the amateur-level privesc).

## Domain awareness (the Windows difference)

On a domain-joined host, you also enumerate **the domain** from your foothold — this is where Windows engagements differ from Linux:

- **The domain and DC** — \`echo %USERDOMAIN%\`, \`nltest /dclist:domain\`, \`Get-ADDomain\` (where module available) — identify the domain and its controllers.
- **Domain users, groups and computers** — \`net user /domain\`, \`net group "Domain Admins" /domain\` (who are the domain admins — your targets), \`net group /domain\`.
- **Your rights in the domain** — what you can see and touch.

Much AD enumeration can be done with built-in tools (\`net\`, PowerShell, LDAP queries) — quiet, because it uses legitimate functionality — or with dedicated tools (**PowerView**, **SharpHound/BloodHound** for the relationship graph, **ldapsearch** from Linux) that enumerate the domain comprehensively.

## Looking for the path

As on Linux, you read all this asking "what does it enable?": a powerful privilege (\`whoami /priv\`) → local escalation; a local admin credential → reuse elsewhere; the Domain Admins list → your objective; the network → what you can pivot to; the domain relationship graph (BloodHound) → the path to Domain Admin. The foothold is the start of both **local** escalation (to SYSTEM on this host) and **domain** enumeration (toward Domain Admin) — and thorough enumeration is, as always, what reveals the paths.

## The defensive mirror

This is the same enumeration a defender runs to audit their own hosts and domain — \`whoami /priv\`, service configs, local admins, and especially running BloodHound against their own AD to find and remove the attack paths. The attacker enumerates to find the path; the defender enumerates to close it.`,
      sample: {
        lang: 'powershell',
        caption: 'Situational awareness on a Windows domain foothold',
        code: `whoami /priv                         # powerful privileges = escalation
systeminfo | findstr /B /C:"OS" /C:"Hotfix"   # patches - old = maybe an exploit
net localgroup administrators        # who is local admin here?
net group "Domain Admins" /domain    # the domain's crown-jewel accounts
ipconfig /all                        # networks reachable (pivot + domain)
# then: SharpHound/BloodHound to map the domain's attack-path graph`,
        output: `SeImpersonatePrivilege Enabled       <- local escalation to SYSTEM
OS Version: ... Hotfix(s): 12 installed   <- how patched?
Administrators: CORP\\localadmin, jdoe    <- I'm a local admin? reuse it
Domain Admins: CORP\\Administrator, CORP\\da-alice   <- targets
# Foothold = start of LOCAL escalation (to SYSTEM) AND DOMAIN
# enumeration (toward Domain Admin). Same checks a defender runs
# to audit their own hosts and AD - offence finds the path, defence closes it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After gaining a foothold on a domain-joined Windows host, why does the attacker enumerate both the local host *and* the domain?',
        options: [
          'Because domain enumeration is illegal but host enumeration is not',
          'Because the foothold is the start of two paths — local privilege escalation to SYSTEM on that host, and domain enumeration toward Domain Admin — so the attacker checks local privileges/services/admins and also enumerates the domain’s users, privileged groups and relationship graph to find the route to domain dominance',
          'Because only the domain matters and the host is irrelevant',
          'Because host enumeration reveals the domain password',
        ],
        answer: 1,
        explain:
          'A Windows foothold opens two related campaigns. Locally, the attacker seeks SYSTEM on that host by checking powerful privileges (`whoami /priv`), misconfigured services, local admins, and patch level. In the domain, they enumerate users, privileged groups (who the Domain Admins are — the objective), computers, their own rights, and above all the relationship graph (via BloodHound), because the real goal is a path to Domain Admin. Doing both is essential: local escalation and reusable local-admin credentials feed domain movement, and the domain enumeration reveals where to go. This is the same enumeration a defender performs to audit and harden their hosts and AD — one to find the path, the other to remove it.',
        hint: 'A foothold starts two journeys on Windows — to SYSTEM locally, and to Domain Admin in the domain. Which enumeration serves each?',
      },
    },

    {
      id: 'rwin-b-05',
      title: 'Gaining a foothold on Windows',
      read: `**Initial access** — the first foothold — on Windows engagements comes from a recognisable set of routes, mirroring the defensive entry points you learned to guard.

## The common routes

- **Vulnerable external services** — a Windows service with a known remote flaw reachable from outside (an outdated service, a vulnerable web application on IIS, an exposed management interface).
- **Web application flaws** — the OWASP classes (the offensive web track), on a Windows-hosted app, leading to a web shell or code execution.
- **Weak/default/reused credentials** — for RDP, SMB, a web login, a database, or a service. Very common: internet-facing **RDP** with a weak password is a leading real-world entry point (the defensive track's warning), and password spraying against exposed services (OWA, VPN, RDP) frequently works.
- **Exposed SMB and shares** — anonymous or guest access to shares exposing files, credentials, or scripts; and historically SMB vulnerabilities (EternalBlue against unpatched SMBv1 — the defensive "disable SMBv1" lesson).
- **Phishing** — in real engagements and red teams, the dominant initial-access vector: a malicious attachment or a credential-harvesting page delivering a foothold on a user's workstation (the social-engineering topic).
- **Leaked/breached credentials** — reused from a breach (passive recon), tried against the organisation's services.

## The reverse shell / agent

As on Linux, exploitation usually aims for a **shell** or agent on the target. Reverse connections (target connects out to you) are preferred to escape outbound firewalls. On Windows this may be a reverse shell, a Meterpreter session, or a C2 agent (the concepts from the Linux track apply). The foothold typically lands you as a **low-privileged user or a service account** (like \`IIS APPPOOL\` for a web app) — not SYSTEM and not a domain admin.

## Foothold is the beginning

The Windows foothold is the *start* of the campaign, exactly as on Linux but with the domain dimension: from a low-privileged foothold you pursue **local privilege escalation** (to SYSTEM on the host) and, more importantly, **domain enumeration and lateral movement** toward Domain Admin. A single workstation foothold is a door into the domain; the interesting work is turning it into domain dominance (the intermediate/skilled levels).

## Password spraying: the Windows-typical initial access

Worth highlighting because it's so common: **password spraying** — trying one common password (\`Winter2024!\`, \`Password1\`) across *many* domain accounts — avoids per-account lockout and frequently lands a valid domain credential, which is itself a foothold (a domain account you can use to enumerate AD and log into machines). This is the technique defenders detect via failed-logon patterns, and it's a reminder that on Windows, a valid credential *is* often the foothold — no exploit required.

## The defensive mirror

Every route maps to defensive controls: patch and don't expose services, secure web apps, strong passwords + MFA + no internet-facing RDP, disable SMBv1 and require signing, phishing-resistant MFA and user awareness, and no credential reuse. When you gain a foothold via spraying a weak password or an exposed RDP on an authorized test, you're demonstrating exactly those gaps — and the report's fix is the corresponding defensive control.`,
      sample: {
        lang: 'text',
        caption: 'Common Windows initial-access routes (authorized targets only)',
        code: `Route                          Lands you as...         Defensive fix
-----------------------------------------------------------------------
vulnerable service / web app   service acct (IIS APPPOOL) patch, secure app
weak/default/reused creds      that account              strong pw + MFA
internet-facing RDP (weak pw)  that user                 VPN + MFA, no exposure
password SPRAYING a domain     a domain user             MFA, lockout, detection
  account (1 pw, many users)     (= a foothold in AD!)
exposed SMB / EternalBlue      SYSTEM (SMB) / a user     disable SMBv1, signing
phishing (real/red team)       a user's workstation      phishing-resistant MFA

Foothold = usually LOW-privileged. It's the START: escalate locally
(-> SYSTEM) and enumerate the DOMAIN (-> Domain Admin).`,
        output: `Windows footholds come from vulnerable services/web apps, weak/
reused/default credentials, exposed RDP/SMB, and phishing.
Password SPRAYING (one password, many accounts) is especially
common - a valid domain credential IS a foothold, no exploit
needed. The foothold is low-privileged and the START of the
campaign toward Domain Admin. Each route is a defensive gap.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "password spraying" (trying one common password across many accounts) such a common and effective initial-access technique against Windows domains?',
        options: [
          'Because it cracks password hashes offline',
          'Because trying a single common password across many accounts avoids triggering per-account lockout (unlike hammering one account), and in a large domain some users always choose weak/common passwords — so it frequently lands a valid domain credential, which is itself a foothold for enumerating AD and logging into machines, with no exploit required',
          'Because it exploits a vulnerability in Kerberos',
          'Because it only works against local accounts',
        ],
        answer: 1,
        explain:
          'Password spraying inverts brute force: instead of many passwords against one account (which triggers lockout), it tries one common password against many accounts, staying under per-account lockout thresholds. In any sizeable domain, some users inevitably pick weak, common passwords, so a spray of `Winter2024!` or `Password1` across the user list often succeeds. A valid domain credential is directly useful — it lets the attacker authenticate to services and machines and enumerate Active Directory — so it constitutes a foothold with no exploit at all. This is exactly the failed-logon pattern the defensive Windows track detects, and its countermeasures are MFA, sensible lockout, and monitoring — making it a clear example of a valid credential *being* the foothold on Windows.',
        hint: 'Why one password across many accounts rather than many passwords against one — what does that avoid, and what does a valid domain credential give you?',
      },
    },

    {
      id: 'rwin-b-06',
      title: 'Local privilege escalation on Windows',
      read: `A foothold usually lands you as a low-privileged user or service account. **Local privilege escalation** turns that into **SYSTEM** (the machine's most powerful local account) or local Administrator — the Windows equivalent of getting root, and the same enumeration-driven process as on Linux. This step introduces the concept; the amateur level goes deep.

## Why escalate locally

SYSTEM/Administrator lets you do anything on the host — read all files, dump credentials from LSASS (the credential-theft that feeds domain movement), install persistence, and fully control the machine. And crucially, local admin/SYSTEM on a domain-joined host lets you **harvest cached domain credentials**, which is often the bridge from a single host to the domain.

## Where Windows escalation paths come from

As on Linux, almost all local privilege escalation comes from something **misconfigured or unpatched**. The major Windows categories (each an amateur-level deep-dive, and each a defensive finding in reverse):

- **Powerful privileges** — a token holding **SeImpersonatePrivilege** (→ "potato" attacks to SYSTEM), SeDebugPrivilege, SeBackupPrivilege, etc. (\`whoami /priv\` — the first check).
- **Service misconfigurations** — a service you can modify (weak service permissions), an **unquoted service path** with a writable directory, or a service binary/directory you can overwrite; services run as SYSTEM, so controlling one is SYSTEM.
- **Registry and DLL issues** — **AlwaysInstallElevated** (a policy letting any user install MSIs as SYSTEM), weak registry permissions, and **DLL hijacking** (a program loading a DLL from a writable location).
- **Unpatched kernel/OS** — a missing patch for a known local-privilege-escalation exploit (\`systeminfo\` → check hotfixes; **Windows Exploit Suggester** maps them).
- **Credentials lying around** — passwords in files, the registry, unattended-install files (\`Unattend.xml\`), the SAM/SYSTEM registry hives, saved credentials.
- **Scheduled tasks and startup** — a task or autostart you can modify that runs as a higher privilege.
- **Token impersonation** — abusing tokens of other users present on the system.

## The method: enumerate for escalation

Like Linux, it's an enumeration problem: systematically check for these misconfigurations. **WinPEAS** (the Windows counterpart to LinPEAS), **PowerUp**, **SharpUp**, and **Seatbelt** automate the checklist and flag likely paths. As always, understand *why* each finding is exploitable rather than blindly running the tool — the understanding is the transferable skill and the basis of the report.

## The defensive mirror

Every escalation path is exactly what the defensive Windows track taught defenders to find and fix: don't grant dangerous privileges unnecessarily, fix service permissions and unquoted paths, disable AlwaysInstallElevated, patch, don't leave credentials in files, and lock down scheduled tasks. When WinPEAS flags an unquoted service path or SeImpersonate on an authorized test, that's precisely the finding a defender running the same tool on their own host should catch and remove. Offence finds the escalation paths; defence closes them — the same knowledge, both directions.`,
      sample: {
        lang: 'powershell',
        caption: 'Enumerating Windows local-escalation paths (defenders audit the same)',
        code: `whoami /priv                          # SeImpersonate? SeBackup? -> escalation
# services: unquoted paths (writable dir before a space = hijack)
wmic service get name,pathname | findstr /i /v """  | findstr /i " "
# AlwaysInstallElevated (install MSI as SYSTEM)?
reg query HKLM\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
# patch level (missing patch -> known local-privesc exploit)
systeminfo | findstr /B /C:"Hotfix"
# or run the whole checklist: winPEAS.exe  /  PowerUp Invoke-AllChecks`,
        output: `SeImpersonatePrivilege  Enabled                    <- potato -> SYSTEM
C:\\Program Files\\My App\\svc.exe  (unquoted + space)   <- hijack -> SYSTEM
AlwaysInstallElevated  0x1                          <- MSI as SYSTEM
# Each is a route to SYSTEM/Administrator - and each is EXACTLY the
# finding the defensive Windows track said to fix. Offence finds the
# path, defence removes it; understand WHY each works, don't just run WinPEAS.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is gaining SYSTEM (or local Administrator) on a domain-joined Windows host valuable beyond just controlling that one machine?',
        options: [
          'Because SYSTEM automatically grants Domain Admin',
          'Because SYSTEM/local admin lets the attacker harvest cached domain credentials (e.g. hashes and tickets from LSASS) on that host, which are then reused to move laterally toward the domain — so local escalation is often the bridge from a single host to domain compromise',
          'Because SYSTEM can only read local files',
          'Because it disables the domain controller',
        ],
        answer: 1,
        explain:
          'Local escalation is valuable on its own (full control of the host, persistence, all local data), but on a domain-joined machine its greatest value is enabling **credential harvesting**: with SYSTEM/administrator rights the attacker can dump credential material — NTLM hashes, Kerberos tickets, cached domain credentials — from LSASS and other stores, and because Windows credentials are reusable, those often unlock other machines and accounts, moving the attacker toward Domain Admin. So local privilege escalation is frequently the bridge from a single foothold to domain compromise, which is exactly why the defensive track protected LSASS (Credential Guard/PPL) and enforced tiering and LAPS. It does not by itself grant Domain Admin — it grants the local power needed to steal the credentials that lead there.',
        hint: 'What can SYSTEM do to the credential material cached on a domain-joined host, and where does that lead?',
      },
    },

    {
      id: 'rwin-b-07',
      title: 'Credentials: the currency of AD',
      read: `If enumeration is decisive and Domain Admin is the objective, **credentials are the currency that gets you there.** More than on any other platform, Windows/AD attacks revolve around stealing, cracking and — crucially — *reusing* credential material. Understanding this is central to everything that follows.

## Why credentials dominate Windows attacks

Because Windows stores **reusable** credential material (the defining difference from the last step), the attacker's core loop is: **get credentials → use them to reach more → get more credentials → repeat**, working toward a Domain Admin credential. A domain account works across every machine, and credential material can often be used directly (pass-the-hash/ticket) without cracking — so credentials, not exploits, are the primary mechanism of both escalation and lateral movement in AD.

## The forms of credential material

- **Plaintext passwords** — found in files, scripts, configs, GPP (Group Policy Preferences historically stored an encryptable password everyone could decrypt), the registry, or entered by users.
- **NTLM hashes** — the password's hash, usable directly in **pass-the-hash**. Dumped from LSASS (with local admin/SYSTEM), from the local **SAM** database, or captured over the network (LLMNR/NBT-NS poisoning → NTLMv2 hashes to crack or relay).
- **Kerberos tickets** — TGTs and service tickets in memory, usable in **pass-the-ticket**; and service tickets requestable and crackable offline (**Kerberoasting** — intermediate level).
- **Cached domain credentials** — on domain-joined hosts, for offline logon; extractable and crackable.

## The core techniques (previewed)

- **Credential dumping** — extracting hashes/tickets from LSASS and the SAM (the Mimikatz concept), needing local admin/SYSTEM.
- **Pass-the-hash / pass-the-ticket** — reusing stolen hashes/tickets to authenticate as the user without the password.
- **Cracking** — offline cracking of captured hashes (from the SAM, captured NTLMv2, or Kerberoast tickets) to recover passwords for reuse.
- **Credential hunting** — finding passwords in files, shares, scripts, and configs across the domain.

## The reuse principle at domain scale

The single highest-yield idea: **credentials found in one place are tried everywhere.** A local admin password reused across machines (the defensive LAPS problem) lets one dumped hash open the whole fleet via pass-the-hash. A service account's password found in a config reaches wherever that account is privileged. A cracked user password is tried for other accounts and services. Mapping where each credential is valid — the credential-to-access graph — is how the attacker traverses the domain toward Domain Admin.

## The defensive mirror

This is why the defensive Windows track invested so heavily in credential protection: **Credential Guard and LSASS-as-PPL** (stop dumping from LSASS), **LAPS** (unique local admin passwords → one hash no longer opens every machine → kills pass-the-hash lateral movement), **Protected Users and tiered administration** (keep powerful credentials off exposed hosts), **strong passwords and MFA**, and **disabling LLMNR/NBT-NS and requiring SMB signing** (stop hash capture and relay). Every credential technique you learn maps directly to one of those defences — because on Windows, protecting credential material *is* the core of AD security, and stealing it is the core of AD attack.`,
      sample: {
        lang: 'text',
        caption: 'The Windows credential loop toward Domain Admin',
        code: `get credentials -> use to reach more -> get more credentials -> repeat
                  (toward a DOMAIN ADMIN credential)

Forms:  plaintext (files/GPP/configs)  |  NTLM hashes (LSASS/SAM/captured)
        Kerberos tickets (TGT/service) |  cached domain creds

Techniques: dump (LSASS/SAM) | pass-the-hash/ticket (REUSE directly, no crack)
            crack (offline)  | hunt (files/shares/scripts)

REUSE is the highest-yield idea: a local-admin hash reused across
machines opens the fleet (pass-the-hash); map where each credential
is valid -> traverse to Domain Admin.

Defences (the blue track): Credential Guard/PPL, LAPS, Protected
Users + tiering, MFA, disable LLMNR/NBT-NS, SMB signing.`,
        output: `Windows/AD attacks revolve around STEALING and REUSING credential
material, because Windows stores it reusably (pass-the-hash/ticket
- often no cracking needed). The loop: get creds -> reach more ->
get more -> Domain Admin. Reuse is the highest-yield idea. Every
technique maps to a defensive credential-protection control -
protecting credentials IS AD security; stealing them IS AD attack.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is credential reuse (trying a found credential everywhere) described as the highest-yield idea in Windows/AD attacks?',
        options: [
          'Because credentials expire after one use',
          'Because Windows credentials are reusable and organisations frequently reuse them (e.g. the same local admin password across machines), so a single stolen credential or hash often authenticates to many systems — via pass-the-hash without even cracking it — letting the attacker traverse the domain toward Domain Admin without needing new exploits',
          'Because reuse only works on the domain controller',
          'Because credentials cannot be found in more than one place',
        ],
        answer: 1,
        explain:
          'Windows stores reusable credential material and enterprises routinely reuse credentials — the classic case being an identical local administrator password across many machines. So a single credential or hash obtained from one host is frequently valid on many others, and because Windows supports pass-the-hash/pass-the-ticket, it can often be used directly without cracking. Systematically trying each found credential everywhere maps out where it is valid and lets the attacker move laterally and escalate toward a Domain Admin credential, all without developing new exploits. This is precisely why the defensive track deployed LAPS (unique per-host local admin passwords), Credential Guard, tiering and no-reuse policies — to break the reuse that makes credential theft so powerful.',
        hint: 'On Windows, can a stolen credential/hash be reused directly on other machines — and do organisations tend to reuse them?',
      },
    },

    {
      id: 'rwin-b-08',
      title: 'Kerberos, the attacker’s lens',
      read: `Active Directory authenticates with **Kerberos**, and almost every advanced AD attack abuses some quirk of it. You met the ticket flow defensively; here's the attacker's-eye view of *why* Kerberos is such a rich target — the foundation for the intermediate/skilled AD attacks.

## The flow, recalled

1. **You authenticate** to the KDC (on the DC) and receive a **TGT** (Ticket-Granting Ticket), encrypted with the **krbtgt** account's key — your proof of identity for the session.
2. **To use a service**, you present the TGT and get a **service ticket (TGS)**, encrypted with **that service account's key**.
3. **You present the service ticket** to the service, which decrypts it with its own key and grants access.

## Why the design invites attack

Each step exposes something an attacker can abuse — this is the "attacker's lens" that makes the later attacks make sense:

- **Tickets are encrypted with account password hashes** → a ticket can sometimes be **cracked offline** to recover the account's password. Any authenticated user can request a service ticket for any account with a **Service Principal Name (SPN)** — so they request tickets for service accounts and crack them offline (**Kerberoasting**). Service accounts often have weak, old passwords, making this highly effective.
- **Pre-authentication can be disabled** on some accounts → anyone can request material encrypted with that account's hash and crack it offline, needing *no* credentials (**AS-REP roasting**).
- **The krbtgt key signs all TGTs** → an attacker who steals the krbtgt hash can **forge TGTs for anyone**, valid indefinitely (**golden ticket**) — total, persistent domain compromise.
- **A service account's key decrypts its service tickets** → stealing it lets you **forge service tickets** for that service, bypassing the DC (**silver ticket**).
- **Possession of a valid ticket = access** → a stolen TGT or service ticket can be reused (**pass-the-ticket**), and a stolen hash used to request fresh tickets (**overpass-the-hash**).
- **Delegation features** (a service acting on a user's behalf) → misconfigurations become impersonation primitives (unconstrained/constrained/RBCD — the skilled level).

## Why understand it now

You don't attack Kerberos yet — this level builds the foundation. But holding *why* Kerberos is targetable — tickets encrypted with crackable account hashes, the all-powerful krbtgt key, disabled pre-auth, reusable tickets, and delegation — is what makes the intermediate/skilled AD attacks coherent rather than a list of scary names. Each of those attacks abuses one arrow in the flow above.

## The defensive mirror

Every Kerberos attack maps to a defence you learned: strong/gMSA service-account passwords (defeat Kerberoasting), clearing the pre-auth-disabled flag (defeat AS-REP roasting), protecting and rotating krbtgt (defeat/recover from golden tickets), Protected Users and disabling RC4 (harden ticket handling), and fixing delegation. The attacker studies Kerberos to find the abusable quirk; the defender studies the same Kerberos to close it. Understanding the flow is the shared foundation.`,
      sample: {
        lang: 'text',
        caption: 'The Kerberos flow, and the attack each step invites',
        code: `CLIENT                         KDC (on the Domain Controller)
  |-- authenticate ------------->|  (pre-auth; if DISABLED -> AS-REP roasting)
  |<-- TGT (enc w/ KRBTGT key) --|  (steal krbtgt key -> GOLDEN TICKET: forge any TGT)
  |                              |
  |-- present TGT, "want SQL" -->|  (any user can request a service ticket...)
  |<-- service ticket -----------|  (...enc w/ the SERVICE ACCT key ->
  |                              |     crack it offline = KERBEROASTING)
  |-- present ticket --> SERVICE    (steal the service key -> SILVER TICKET)

Possession of a ticket = access -> PASS-THE-TICKET.
Every advanced AD attack abuses one arrow above.`,
        output: `Kerberos is targetable because: tickets are encrypted with
crackable account HASHES (Kerberoasting), pre-auth can be disabled
(AS-REP roasting), the KRBTGT key signs all TGTs (golden ticket),
service keys decrypt service tickets (silver ticket), and tickets
are reusable (pass-the-ticket). Understanding the flow is the
foundation for the AD attacks - and the same flow defenders harden.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can any authenticated domain user perform "Kerberoasting" — requesting a service ticket and cracking it offline to recover a service account’s password?',
        options: [
          'Because Kerberos has no encryption',
          'Because any authenticated user may request a service ticket for any account that has a Service Principal Name, and that ticket is encrypted with the service account’s password hash — so it can be taken offline and cracked, which succeeds often because service accounts frequently have weak, old passwords',
          'Because service tickets contain the password in plaintext',
          'Because it requires Domain Admin to begin with',
        ],
        answer: 1,
        explain:
          'Kerberos lets any authenticated user request a service ticket (TGS) for any account that has an SPN, and the ticket is encrypted with that service account’s password-derived key. The attacker requests such tickets and cracks them offline — no interaction with the target service, no special privileges, and offline cracking is quiet and unlimited by lockout. It succeeds so often because service accounts are commonly configured with weak, old, non-rotated passwords. The defences are exactly those from the blue track: strong service-account passwords or, better, Group Managed Service Accounts (gMSA) whose long random auto-rotated passwords are infeasible to crack, plus disabling RC4 and monitoring for the tell-tale ticket-request patterns.',
        hint: 'What is a service ticket encrypted with, who can request one, and where does the cracking happen?',
      },
    },

    {
      id: 'rwin-b-09',
      title: 'Lateral movement, in outline',
      read: `Once you have credentials and local escalation on a foothold, **lateral movement** spreads you to other machines toward the objective. On Windows this is driven by **credentials and built-in remote-administration mechanisms** — you'll go deep in the intermediate level; here's the outline.

## The Windows lateral-movement toolkit

Windows has legitimate remote-administration methods that attackers abuse to run code on other machines (using stolen credentials or hashes):

- **PsExec-style / service creation** — copy a binary to a target's admin share and run it as a service (as SYSTEM). Classic and noisy (the defensive lesson: Event 7045).
- **WMI** — remote process execution over WMI (\`wmic ... process call create\`), a stealthier route.
- **WinRM / PowerShell Remoting** — \`Enter-PSSession\`, \`Invoke-Command\` over 5985/5986 — clean remote execution if enabled.
- **RDP** — interactive remote desktop (with credentials).
- **DCOM**, scheduled tasks created remotely, and others.

## Credentials make it work

The key point: these mechanisms need **credentials**, and Windows lets you use stolen material directly:

- **Pass-the-hash** — use a stolen NTLM hash to authenticate to another machine (e.g. PsExec/WMI with a hash) without the password — the defining Windows lateral move, especially with a reused local admin hash.
- **Pass-the-ticket / overpass-the-hash** — use a stolen Kerberos ticket, or a hash to get one, then move.
- **Reused passwords** — a password valid on many machines (the reuse principle).

So lateral movement is: harvest credentials on the current host → use them (directly, via pass-the-hash/ticket, or as plaintext) to authenticate to another host via a remote-exec mechanism → land on the new host → repeat the whole cycle (escalate, harvest, move) → progress toward Domain Admin.

## The loop toward the objective

Each new host is a new position: you re-run situational awareness, escalate to SYSTEM, harvest *its* cached credentials (which may include a more privileged account — perhaps a Domain Admin who logged on there), and move again. This is how a single workstation foothold becomes domain compromise: hop by hop, harvesting more powerful credentials at each step until you reach or dump a Domain Admin credential (or compromise the DC directly). BloodHound's path shows you which hosts to target — e.g. "this server has a Domain Admin session, and you can reach it" — turning the movement into a directed hunt.

## The defensive mirror

Windows lateral movement is what the defensive track defended against with **LAPS** (unique local admin passwords → pass-the-hash dies at one host), **tiered administration and Protected Users** (keep Domain Admin credentials off workstations/servers so harvesting them yields nothing), **network segmentation and host-firewall rules** (block workstation-to-workstation admin protocols), **Credential Guard** (stop LSASS dumping), and **detection** of the remote-exec techniques (the parent-process and logon-fan-out signatures). Every lateral move you make is a demonstration of one of those gaps — and the report's fix is the corresponding control.`,
      sample: {
        lang: 'text',
        caption: 'Windows lateral movement: credentials + remote execution',
        code: `harvest creds on host A (LSASS/SAM/files)
  -> use them (directly!) to run code on host B via a remote-exec method:
       PsExec/service (SYSTEM, noisy)  |  WMI  |  WinRM  |  RDP
       pass-the-hash: authenticate with a stolen NTLM HASH (no password)
       pass-the-ticket: reuse a stolen Kerberos ticket
  -> land on B -> escalate -> harvest B's creds (maybe a Domain Admin
       logged on here!) -> move again -> ... -> Domain Admin

BloodHound shows WHICH hosts to hit (e.g. "DA session here, reachable").`,
        output: `Windows lateral movement = stolen CREDENTIALS + built-in remote-
exec (PsExec/WMI/WinRM/RDP), using pass-the-hash/ticket to
authenticate without the password. Each hop: escalate, harvest
more-privileged creds, move again - toward Domain Admin. Defences:
LAPS, tiering/Protected Users, segmentation, Credential Guard,
and detection of the remote-exec signatures.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does LAPS (unique, random local administrator passwords per machine) specifically break Windows lateral movement via pass-the-hash?',
        options: [
          'It encrypts the network traffic between machines',
          'Pass-the-hash lateral movement across machines relies on a shared local admin password (identical hash on many hosts); LAPS makes each machine’s local admin password unique, so a hash stolen from one host no longer authenticates to any other — the shared-credential condition the attack depends on is removed',
          'It disables the local administrator account entirely',
          'It forces all logons to use Kerberos only',
        ],
        answer: 1,
        explain:
          'A very common and powerful Windows lateral move is to dump the local administrator hash from one machine and pass it to others — which works only because those machines share the same local admin password (and therefore the same hash). LAPS gives every machine a unique, randomly generated, rotating local administrator password, so a hash lifted from one host is useless on the next, removing exactly the shared-credential condition pass-the-hash exploits. It is a free, high-impact control (built into modern Windows), best paired with Credential Guard (to hinder dumping in the first place), tiered administration and Protected Users (to keep powerful credentials off exposed hosts), and detection of the remote-execution techniques.',
        hint: 'Pass-the-hash across machines needs the same password (hash) on each. What does LAPS do to that sameness?',
      },
    },

    {
      id: 'rwin-b-10',
      title: 'Reaching Domain Admin',
      read: `The objective of most Windows engagements is **Domain Admin** (or equivalent control of Active Directory) — because it means control of everything. This step frames how the pieces you've met combine into the path to domain dominance; the intermediate/skilled levels teach the specific techniques.

## What Domain Admin means

A member of **Domain Admins** (or Enterprise Admins) controls the entire domain: every machine, every account, all data, and the ability to reset any password, access any resource, and reconfigure AD. Compromising a **Domain Controller** achieves the same (from a DC you can access or dump everything, including the krbtgt key). So the engagement's goal is usually stated as "reach Domain Admin" or "compromise the domain".

## The path, assembled

The route combines everything from this level into a chain:

1. **Foothold** — initial access on some machine (service, web app, weak credentials, spraying, phishing).
2. **Local escalation** — to SYSTEM on that host, enabling credential harvesting.
3. **Credential access** — dump/harvest credentials from the host (LSASS, SAM, files, cached domain creds).
4. **Domain enumeration** — map the AD relationship graph (BloodHound) to find the path to Domain Admin.
5. **Lateral movement** — use harvested credentials (pass-the-hash/ticket, reuse) to reach more machines, escalating and harvesting at each, following the BloodHound path.
6. **Escalate in AD** — the AD-specific techniques (Kerberoasting a service account into a crackable password, abusing delegation, coercion/relay, ADCS, DCSync — the intermediate/skilled levels) to obtain a privileged credential.
7. **Domain Admin / DC compromise** — reach a Domain Admin credential or compromise a DC, achieving the objective.

## Two things make it reachable

- **Credentials chain** — the reuse principle at domain scale: each host's harvested credentials open the next, and somewhere a privileged credential (a Domain Admin who logged onto a server, a crackable service account, a delegation abuse) provides the final step. The credential loop *is* the path.
- **The relationship graph** — BloodHound turns the maze into a directed route: it shows the shortest path from your foothold to Domain Admin, so you're not wandering but following identified edges (a group you can join, a session you can steal, a right you can abuse).

## Demonstrating and reporting

Reaching Domain Admin on an authorized engagement is demonstrated (not abused): you prove control (e.g. show access as a Domain Admin, or dump a hash to prove DC compromise) within scope, without causing harm or exfiltrating real data. The report then tells the story — the full path from foothold to domain compromise — with each finding and its remediation, and the choke points that break the chain (the path-documentation skill).

## The defensive mirror (the whole point)

The path to Domain Admin is a chain of the exact weaknesses the defensive Windows track addressed: initial-access gaps, local-escalation misconfigurations, credential exposure (LSASS, reuse, LAPS-less local admins), unhardened Kerberos and delegation, and — underlying it all — a lack of **tiered administration** that let a Domain Admin credential be harvestable from an exposed host. When you reach Domain Admin on a test, you're demonstrating that chain, and the report's fixes are the defensive controls: tiering, LAPS, Credential Guard, gMSA, Protected Users, ADCS/delegation hardening, and detection. And, as BloodHound shows, fixing one edge often breaks the whole path — the choke-point guidance that makes the report actionable. You attack toward Domain Admin so the defender can remove the road to it.`,
      sample: {
        lang: 'text',
        caption: 'The path to Domain Admin: a chain of this level’s pieces',
        code: `foothold (spray/phish/service)
  -> local escalation to SYSTEM
  -> harvest credentials (LSASS/SAM/cached)
  -> map the AD graph (BloodHound) -> shortest path to Domain Admin
  -> lateral movement (pass-the-hash/ticket, reuse) along the path
  -> AD escalation (Kerberoast / delegation / ADCS / coercion / DCSync)
  -> DOMAIN ADMIN or DC compromise  = objective

Two enablers: the CREDENTIAL chain (each host's creds open the next)
and the GRAPH (BloodHound turns the maze into a directed route).
Fixing one edge often breaks the whole path (choke point).`,
        output: `Domain Admin = control of everything, so it's the objective. The
path chains this level: foothold -> local escalation -> credential
harvest -> graph enumeration -> lateral movement -> AD escalation
-> Domain Admin/DC. Enabled by the credential chain + the
BloodHound graph. Every link is a defensive weakness (tiering,
LAPS, Credential Guard, Kerberos/delegation hardening); fixing one
edge often breaks the path. Attack toward it to remove the road to it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What are the two things that most make the path from an initial foothold to Domain Admin reachable?',
        options: [
          'Fast hardware and a good internet connection',
          'The credential chain (Windows credentials are reusable, so each host’s harvested credentials open the next, and somewhere a privileged credential provides the final step) and the relationship graph (BloodHound turns the maze of AD into a directed shortest path from foothold to Domain Admin)',
          'A single unpatched vulnerability on the domain controller',
          'The absence of any firewalls anywhere',
        ],
        answer: 1,
        explain:
          'Reaching Domain Admin is rarely one exploit; it is a chain enabled by two things. First, the credential chain: because Windows credentials are reusable and organisations reuse them, credentials harvested on each host authenticate to the next, and along the way a privileged credential — a Domain Admin who logged onto a server, a crackable service account, a delegation or ADCS abuse — supplies the final step. Second, the relationship graph: BloodHound maps AD’s privilege relationships and computes the shortest path from the foothold to Domain Admin, so the attacker follows identified edges rather than wandering. Both are exactly what the defensive track targeted — tiering and LAPS to break the credential chain, and BloodHound-driven path removal to cut the graph edges — so fixing one link (a choke point) often breaks the whole path.',
        hint: 'One enabler is about credentials opening the next host; the other is about a graph turning the maze into a directed route.',
      },
    },

    {
      id: 'rwin-b-11',
      title: 'Post-exploitation and reporting on Windows',
      read: `As on Linux, reaching the objective (Domain Admin / DC compromise) is the setup for the two things that give a Windows engagement value: understanding and demonstrating **impact**, and producing the **report** that lets the organisation fix everything.

## Post-exploitation on Windows/AD

With domain control (or significant access), post-exploitation demonstrates what the compromise means:

- **Understand the impact** — with Domain Admin you can access all data, all systems, all accounts. You demonstrate this within scope: access to sensitive data, control of critical systems, the ability to impersonate any user.
- **Prove domain compromise** — e.g. dumping the domain's credential material (a **DCSync** to prove you could obtain any account's hash, including krbtgt — proof of total compromise), or demonstrating access as a Domain Admin. Proof, not abuse.
- **Understand persistence potential** — showing that durable, stealthy persistence could be established (golden tickets, ADCS certificates, backdoor accounts — the skilled level) is itself a finding about detection and recovery, but on an authorized test persistence is used sparingly, documented, and removed.
- **Objectives** — meeting the specific engagement goals (reach the crown-jewel system, prove access to specific data).

## The professional constraints (the same rules)

- **Prove, don't exfiltrate** — demonstrate access to sensitive data without copying it out (a record count, a screenshot, a hash to prove capability).
- **Don't disrupt** — you have enormous power with Domain Admin; use it carefully, within the rules of engagement.
- **Stay in scope** — even with domain control, only touch what's in scope.
- **Clean up** — remove any tools, persistence, or accounts introduced, and document them so the client can verify. Leaving persistence on a domain you compromised would be a serious professional and security failure.

## The report — the product

The Windows engagement culminates in the report, which for AD compromise tells the **path story**: from initial foothold to Domain Admin, step by step, with a path diagram, each finding (initial access, local escalation, credential exposure, the AD attack used) with severity, evidence, reproduction, and — most importantly — **specific remediation**. And it highlights the **choke points**: because the path is a chain, fixing one link (e.g. deploying LAPS, tiering admin accounts, hardening the vulnerable service account) often breaks it, which is invaluable prioritisation guidance.

## Reporting AD findings for the defender

Because AD compromise is a chain, the most valuable report maps directly onto the defensive controls: "the path to Domain Admin ran through a Kerberoastable service account with a weak password (→ gMSA), a reused local admin password (→ LAPS), and a Domain Admin who logged onto a workstation (→ tiered administration); fixing the tiering alone breaks the final step." That gives the defender a prioritised, choke-point-aware plan — exactly the defensive Windows measures, aimed by the attack path.

## Notes become the report

As always, the meticulous notes kept throughout — every host, credential, ticket, path and step — are what the report is written from, and what lets the multi-step AD compromise be reproduced and verified. On a complex AD engagement, good notes are the difference between a clear, credible attack-path report and a vague one. Post-exploitation shows what domain control is worth; the report turns it into the fixes that remove the path — which is why the engagement existed.`,
      sample: {
        lang: 'text',
        caption: 'An AD attack-path finding, mapped to defensive fixes',
        code: `PATH TO DOMAIN ADMIN (the report's core narrative):
  1. foothold: password spray -> valid domain user      -> MFA, lockout
  2. Kerberoast svc-sql (weak pw) -> cracked             -> gMSA
  3. svc-sql is local admin on APP-07 -> pass-the-hash   -> LAPS, least priv
  4. a Domain Admin has a session on APP-07 -> steal it  -> TIERED ADMIN
  5. Domain Admin -> DCSync proves total compromise      -> (all of the above)

CHOKE POINT: tiered administration (step 4) alone breaks the final
step - fix it first. Each finding: evidence, reproduction, remediation.`,
        output: `Post-exploitation demonstrates impact (prove domain compromise,
e.g. DCSync - without abusing it); the REPORT is the product. For
AD it tells the PATH story (foothold -> Domain Admin) with a
diagram, each finding + remediation, and CHOKE POINTS mapping to
defensive controls (gMSA, LAPS, tiering...). Fixing one link often
breaks the path. Built from notes; prove don't exfiltrate; clean up.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is highlighting "choke points" especially valuable when reporting an Active Directory compromise?',
        options: [
          'Because it makes the report longer',
          'Because the path to Domain Admin is a chain of linked weaknesses, so identifying the links whose remediation breaks the whole chain (e.g. tiered administration removing a harvestable Domain Admin session, or LAPS breaking pass-the-hash) gives the defender prioritised, high-impact guidance — fix these first to cut the path with the least effort',
          'Because choke points are the only real findings',
          'Because it lets the attacker regain access later',
        ],
        answer: 1,
        explain:
          'AD compromise is a chain of individually-linked weaknesses (foothold, escalation, credential reuse, a Kerberoastable account, a harvestable Domain Admin session), and fixing every finding at once is rarely feasible. Because the steps are connected, some fixes break multiple downstream steps: implementing tiered administration removes the Domain Admin session the attacker needed to steal; deploying LAPS breaks pass-the-hash across machines; using gMSA defeats the Kerberoast. Highlighting these choke points tells the defender where a single, high-impact remediation cuts the whole path, giving prioritised guidance that maximises security improvement per unit of effort — which is the report’s core value, and it maps the attack directly onto the defensive Windows controls.',
        hint: 'If the path is a chain, what does fixing one particular link do to the rest of the chain?',
      },
    },

    {
      id: 'rwin-b-12',
      title: 'Project: foothold to Domain Admin in a lab',
      read: `Bring the level together into the exercise every Windows-offensive learner starts with: take a small vulnerable **Active Directory lab** and go end to end — foothold, escalate, enumerate the domain, move laterally, and reach **Domain Admin** — on a domain you own or an authorized platform.

## The exercise

Use a vulnerable AD lab (GOAD, a small lab you build, or an authorized AD lab on Hack The Box / TryHackMe), from your attacker machine:

1. **Foothold** — gain initial access: an exposed vulnerable service, a web app, weak/default credentials, or **password spraying** a discovered user list. Land as a low-privileged user or service account.
2. **Local situational awareness** — \`whoami /priv\`, \`whoami /groups\`, \`systeminfo\`, local admins, network — establish where you are.
3. **Local escalation** — get SYSTEM/local admin on the foothold (a service misconfig, a powerful privilege, a missing patch — WinPEAS/PowerUp flag candidates; understand each).
4. **Credential access** — harvest credentials from the host (understanding LSASS/SAM dumping conceptually; use the lab's tools).
5. **Domain enumeration** — run **BloodHound** (SharpHound) to map the domain and find the path to Domain Admin.
6. **Lateral movement** — follow the path: use harvested credentials (pass-the-hash/ticket, reuse) to reach the next hosts, escalating and harvesting at each.
7. **AD escalation** — where the path requires it, use an AD technique (e.g. **Kerberoast** a service account and crack it — the most common beginner-accessible AD attack).
8. **Reach Domain Admin** — obtain a Domain Admin credential or compromise the DC; demonstrate it (within the lab).
9. **Write it up** — the attack path from foothold to Domain Admin, each finding with remediation, and the choke points.

## Do it professionally

- **Enumerate thoroughly** — the domain graph (BloodHound) is what turns the maze into a route; local and domain enumeration reveal the path.
- **Credentials are the currency** — harvest and reuse relentlessly; the credential chain is the path.
- **Notes throughout** — the multi-step AD path is impossible to report accurately without them.
- **Understand every step** — foothold, escalation, credential use, and each AD attack. The understanding is the transferable skill and the basis of the report.
- **Stay authorized** — your lab or an authorized platform, always.

## The measure of success

You can take an authorized AD environment from an external/low-privileged start to Domain Admin by following the methodology — foothold, local escalation, credential harvesting, graph enumeration, lateral movement, and an AD escalation — and produce an attack-path report a defender could act on.

> The level distilled: Windows offensive work is about the **domain** — a foothold turned into **Domain Admin** through a chain of **credentials** (stolen and reused, often via pass-the-hash/ticket without cracking) walked along the **AD relationship graph** (BloodHound), with **Kerberos** quirks providing key escalations. Enumeration is decisive, credentials are the currency, and the report — the attack path with choke-point-aware remediation — is the product. Every technique maps onto the Defensive Windows track: you attack toward Domain Admin so the defender can remove the road to it. The amateur/intermediate/skilled levels deepen each phase, but this foothold-to-Domain-Admin loop, done thoughtfully and legally, is where a Windows tester is made.`,
      sample: {
        lang: 'text',
        caption: 'The foothold-to-Domain-Admin path in a lab, notes-becoming-report',
        code: `[foothold] password spray -> CORP\\jdoe (domain user)
[local]    on WS01: SeImpersonate -> SYSTEM; dump cached creds
[enum]     SharpHound -> BloodHound: path jdoe -> svc-sql -> APP-07 -> DA
[AD esc]   Kerberoast svc-sql -> crack 'Summer2024' offline
[lateral]  svc-sql is local admin on APP-07 -> pass-the-hash -> APP-07
[creds]    on APP-07: a Domain Admin session -> steal the ticket
[objective] Domain Admin -> DCSync proves total domain compromise
[report]   path diagram + findings (spray/Kerberoast/reuse/tiering) +
           remediation + choke point (tiering breaks the final step)`,
        output: `Foothold (spray) -> local escalation (SeImpersonate) -> credential
harvest -> BloodHound path -> Kerberoast -> pass-the-hash lateral
-> stolen DA session -> Domain Admin -> DCSync proof. Notes
throughout, every step understood, in the lab. That foothold-to-
Domain-Admin loop - and the choke-point report it produces - is
where a Windows tester is made, and each link is a defensive fix.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the foothold-to-Domain-Admin exercise, why is running BloodHound (mapping the AD relationship graph) so pivotal to reaching the objective efficiently?',
        options: [
          'Because BloodHound exploits the domain controller directly',
          'Because it turns the maze of Active Directory into a directed route — computing the shortest path of relationships (group memberships, admin rights, sessions) from the current foothold to Domain Admin — so the tester follows identified edges to target the right hosts and credentials instead of wandering, making the credential chain a guided hunt',
          'Because BloodHound cracks all the domain passwords',
          'Because it is the only tool that can enumerate a domain',
        ],
        answer: 1,
        explain:
          'Active Directory’s privilege relationships form a large graph, and escalation to Domain Admin is a chain of edges through it (a group you can join, an account you can compromise, a machine you can admin, a Domain Admin session you can steal). BloodHound collects that graph and computes the shortest path from your current position to Domain Admin, so instead of blindly moving between hosts you follow identified edges — knowing exactly which accounts to target, which machines to reach, and where a privileged credential is harvestable. That turns the credential chain into a directed hunt and makes the objective reachable efficiently. It does not exploit or crack anything itself; it maps the paths that the credential-and-lateral-movement techniques then walk — and the same map lets defenders remove those paths.',
        hint: 'Does BloodHound break into things, or show you the shortest relationship path to Domain Admin so you know where to go?',
      },
    },
  ],
}

export default level
