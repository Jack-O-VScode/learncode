import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Windows enumeration, access and local escalation',
  summary:
    'The working core of Windows/AD testing: enumerating hosts and the domain, gaining initial access, escalating locally to SYSTEM (services, privileges, automation, patches), dumping credentials from LSASS and the SAM, and reusing them with pass-the-hash and pass-the-ticket. Practised only in your lab and on authorized targets.',
  outcomes: [
    'Enumerate Windows hosts and Active Directory, authenticated and not',
    'Gain initial access via spraying, exposed services and shares',
    'Escalate locally via services, privileges, DLL hijacking and patches',
    'Dump credentials from LSASS and the SAM, and understand the protections',
    'Reuse credentials with pass-the-hash and pass-the-ticket',
    'Chain a foothold into local SYSTEM and harvested domain credentials',
  ],
  steps: [
    {
      id: 'rwin-a-01',
      title: 'Enumerating Active Directory',
      read: `The beginner level introduced AD enumeration; the amateur skill is doing it **thoroughly and with the right tools**, because the domain graph you build here is what every later attack acts on. You enumerate both **unauthenticated** (from outside, or before you have credentials) and **authenticated** (with a domain user — even a low-privileged one reveals enormous detail).

## Unauthenticated enumeration

Before you have credentials, you can still learn a lot:

- **Network discovery** — find the DCs and domain-joined hosts (Nmap; DCs expose 88/Kerberos, 389/LDAP, 445/SMB, 53/DNS).
- **SMB null/guest sessions** — where allowed, anonymous access reveals shares, sometimes users and the password policy (\`enum4linux-ng\`, \`smbclient -N\`, \`rpcclient -U ""\`).
- **LDAP anonymous binds** — where allowed, query the directory without credentials.
- **User enumeration** — Kerberos pre-auth responses distinguish valid from invalid usernames (\`kerbrute userenum\`), building a user list for spraying without any credentials — a key unauthenticated technique.

## Authenticated enumeration (the rich phase)

**Any** valid domain credential — even the lowest-privileged user — can read most of Active Directory, because AD is designed for authenticated users to query it. This is a crucial point: a single low-priv credential (from spraying, a foothold, a null session) unlocks comprehensive domain enumeration:

- **Users, groups, computers** — the full inventory, privileged group membership (who the Domain Admins are), account attributes (SPNs → Kerberoastable, pre-auth disabled → AS-REP roastable, descriptions sometimes containing passwords).
- **The relationship graph** — the crux, via **BloodHound/SharpHound**: memberships, admin rights, sessions, ACLs, delegation — everything needed to find the path to Domain Admin.
- **Policies, trusts, GPOs, shares** — the domain's configuration and reachable resources.

## The tools

- **PowerView** (PowerShell) and **SharpView** — flexible AD enumeration from a foothold.
- **BloodHound / SharpHound** — collects the graph; the single most important AD enumeration tool.
- **ldapsearch / windapsearch / ldeep** — LDAP queries from Linux.
- **Built-in** — \`net\`, \`Get-AD*\` cmdlets, \`setspn\` — quiet, using legitimate functionality.
- **NetExec (nxc, formerly CrackMapExec)** — a Swiss-army tool for enumerating (and later attacking) across many hosts with credentials.

## The mindset

The enumeration goal is to build a complete picture of the domain — the users, the privileged accounts, the roastable accounts, the shares with secrets, and above all the **graph** showing the path to Domain Admin. A low-privileged credential is not a dead end; it is the key that unlocks the whole map. Thorough AD enumeration is, as ever, what turns "I have a foothold" into "here is the route to domain compromise" — and it's the same enumeration a defender runs (BloodHound against their own AD) to find and remove those paths.`,
      sample: {
        lang: 'bash',
        caption: 'Unauthenticated user enum, then authenticated domain mapping',
        code: `# UNAUTH: valid usernames via Kerberos pre-auth (no creds needed)
kerbrute userenum -d corp.local userlist.txt
# UNAUTH: SMB null session for shares/users/policy
enum4linux-ng -A 10.10.10.10

# AUTHED (any low-priv domain cred unlocks the whole directory):
nxc smb 10.10.10.0/24 -u jdoe -p 'Spring2024' --users --groups --shares
# collect the relationship graph for BloodHound
bloodhound-python -u jdoe -p 'Spring2024' -d corp.local -c all`,
        output: `[kerbrute] VALID: jdoe, asmith, svc-sql, backupadmin ...   <- user list
[smb null] Shares: SYSVOL, NETLOGON, Backups(READ)
[authed]   Domain Admins: Administrator, da-alice
           svc-sql has an SPN  -> Kerberoastable
           asmith: pre-auth disabled -> AS-REP roastable
[bloodhound] graph collected -> path jdoe -> ... -> Domain Admin
# ONE low-priv credential unlocks the whole domain map.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is even a single low-privileged domain credential so valuable for enumerating Active Directory?',
        options: [
          'Because low-privileged accounts are secretly administrators',
          'Because Active Directory is designed to let any authenticated user query most of the directory, so one low-priv credential unlocks comprehensive enumeration — users, privileged groups, roastable accounts, and the full relationship graph (via BloodHound) that reveals the path to Domain Admin',
          'Because low-privileged credentials bypass authentication',
          'Because it grants access to the domain controller’s filesystem',
        ],
        answer: 1,
        explain:
          'AD is built for authenticated users to read the directory they operate in, so authorization to *query* most objects is broad even for the lowest-privileged account. That means a single low-priv credential — obtained by spraying, a null session, or a foothold — unlocks the rich, authenticated enumeration phase: the full user/group/computer inventory, who the Domain Admins are, which accounts are Kerberoastable (have SPNs) or AS-REP roastable (pre-auth disabled), shares that may hold secrets, and, critically, the relationship graph that BloodHound uses to compute the path to Domain Admin. So a low-priv credential is not a dead end but the key to the whole map — which is why defenders also run BloodHound against their own AD to find and remove those paths.',
        hint: 'Who is AD designed to let read the directory, and what does that let even a low-priv account see?',
      },
    },

    {
      id: 'rwin-a-02',
      title: 'Enumerating SMB and services',
      read: `SMB and other Windows services are rich enumeration targets, both for information and for direct access. Knowing how to enumerate them thoroughly is core amateur work. (Authorized targets and your lab only.)

## SMB (445) — the workhorse

SMB (file/printer sharing, and much Windows communication) exposes a lot:

- **Shares** — list them (\`smbclient -L\`, \`smbmap -H\`, \`nxc smb ... --shares\`) and check permissions. **Readable shares** frequently contain configs, backups, scripts, and credentials; **writable shares** enable planting payloads or capturing hashes.
- **Null/guest sessions** — anonymous access, where allowed, reveals shares, users, groups, and the password policy without credentials (the last step).
- **Users and the password policy** — the policy (\`--pass-pol\`) tells you the lockout threshold, which governs how aggressively you can spray.
- **SMB signing** — whether it's required matters for relay attacks (the skilled level; \`nxc smb ... --gen-relay-list\`).
- **Version/vulnerabilities** — SMBv1 present (EternalBlue territory), and the OS version.

**NetExec (nxc)** is the key tool: with a credential (or null session) it enumerates shares, users, policy, sessions, and more across an entire subnet at once — and later executes attacks. It's the Windows-network Swiss-army knife.

## Other services worth enumerating

- **RDP (3389)** — reachable? A target for credential attacks (spraying) and, with credentials, interactive access.
- **WinRM (5985/5986)** — remote management; with credentials, clean remote command execution (\`evil-winrm\`).
- **LDAP (389/636)** — the directory; anonymous binds and authenticated queries (the last step).
- **Kerberos (88)** — user enumeration and roasting.
- **MSSQL (1433)** — database servers; weak credentials, and \`xp_cmdshell\` for command execution; MSSQL often runs as a service account that can be abused.
- **DNS (53)**, **web (80/443/IIS)**, and management interfaces.

## Reading shares for credentials

A recurring high-yield find: **credentials in file shares**. Configs with database passwords, scripts with hardcoded credentials, backup files, and — classically — **SYSVOL** (readable by all domain users) sometimes containing Group Policy Preferences (GPP) files with an *encryptable, publicly-decryptable* password (the \`cpassword\` issue). Enumerating shares for secrets is one of the most productive AD activities.

## The method

For each Windows service: identify it and its version, try anonymous/null/default/weak access, enumerate what it exposes (shares, users, policy, databases), and read everything reachable for credentials and leads — recording each finding as a thread. SMB especially is where usernames, the password policy (for spraying), shares full of secrets, and hosts to attack all come from. The same thoroughness as Linux service enumeration, applied to the Windows stack — and the same findings a defender should eliminate (lock down shares, disable null sessions, remove GPP passwords, require SMB signing, disable SMBv1).`,
      sample: {
        lang: 'bash',
        caption: 'Enumerating SMB across a subnet, and reading shares for secrets',
        code: `# shares, users, password policy across the subnet (one credential)
nxc smb 10.10.10.0/24 -u jdoe -p 'Spring2024' --shares --users --pass-pol
# browse a readable share for credentials/configs/backups
smbclient //10.10.10.20/Backups -U jdoe%Spring2024
# hunt SYSVOL for GPP cpassword (publicly decryptable)
nxc smb 10.10.10.10 -u jdoe -p 'Spring2024' -M gpp_password`,
        output: `SMB  10.10.10.20  Shares: Backups (READ), Transfer (READ,WRITE)
     Password policy: lockout after 5 attempts / 30 min  <- spray carefully
Backups\\  db_backup.bak   deploy.ps1  (hardcoded creds inside?)
[gpp_password] found cpassword in SYSVOL -> decrypts to: GPP-Pass!23  <- reuse!
# Shares are a goldmine: configs, backups, scripts, GPP passwords.
# Defences: lock down shares, no null sessions, remove GPP creds, SMB signing.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are readable SMB file shares (including SYSVOL) such a high-yield target during AD enumeration?',
        options: [
          'Because shares grant Domain Admin directly',
          'Because shares frequently contain configs, backups, and scripts with hardcoded credentials — and SYSVOL (readable by all domain users) has historically held Group Policy Preferences files with a publicly-decryptable password — so enumerating shares for secrets often yields reusable credentials, one of the most productive AD activities',
          'Because reading a share disables the domain controller',
          'Because only administrators can read any share',
        ],
        answer: 1,
        explain:
          'File shares are where organisations casually leave secrets: application and service configs with database passwords, deployment and admin scripts with hardcoded credentials, and backup files. SYSVOL is especially notable because every domain user can read it, and it has historically contained Group Policy Preferences (GPP) files storing a password encrypted with a key Microsoft published — so any domain user could decrypt it (the classic `cpassword` find). Because Windows credentials are reusable, a credential pulled from a share often authenticates elsewhere, making share enumeration one of the most productive AD activities. The defensive countermeasures are exactly locking down share permissions, removing GPP passwords, disabling null sessions, and requiring SMB signing.',
        hint: 'What do organisations tend to leave in shares, and what is special about SYSVOL being readable by everyone?',
      },
    },

    {
      id: 'rwin-a-03',
      title: 'Initial access techniques',
      read: `Turning enumeration into a foothold: the amateur level makes the beginner's initial-access routes concrete. On authorized targets and in your lab, these are the practical ways to land the first shell or valid credential.

## Password spraying (the AD-typical foothold)

The most common credential-based initial access: with a **user list** (from Kerbrute, SMB, LDAP, OSINT) and the **password policy** (so you stay under lockout), try one or two common passwords across all users:

- Common patterns work disturbingly often: \`Season+Year!\` (\`Winter2024!\`, \`Spring2024\`), \`CompanyName123\`, \`Password1\`, and the like.
- **Respect lockout** — spray one password, wait out the observation window, then the next. Hammering triggers lockout (and detection).
- Tools: \`nxc smb/ldap/winrm ... -u users.txt -p 'Winter2024!'\`, \`kerbrute passwordspray\`.

A hit gives a **valid domain credential** — itself a foothold (unlocking authenticated enumeration and often a login somewhere). This is the technique defenders detect via failed-logon patterns.

## Exposed and vulnerable services

- **Vulnerable services** — a known remote flaw in an exposed service (the CVE-research workflow), including web apps on IIS.
- **Weak service credentials** — MSSQL with a weak \`sa\` password (→ \`xp_cmdshell\` for command execution), RDP/WinRM with guessable credentials, exposed management interfaces.
- **SMB access** — a writable share to plant a payload, or (historically) SMB vulnerabilities against unpatched hosts.

## Credentials from enumeration

Often you don't need to "attack" at all — enumeration hands you a credential: a GPP password from SYSVOL, a credential in a readable share's config, a description field containing a password, or a reused breached credential (passive recon). These are footholds you found, not exploited.

## Hash capture (LLMNR/NBT-NS poisoning)

On the internal network, **Responder** poisons LLMNR/NBT-NS broadcasts (the defensive lesson) so victims authenticate to you, capturing **NTLMv2 hashes** — which you crack offline or relay. This is a classic internal initial-access/credential technique that needs no prior credential, only a position on the LAN.

## Phishing (real engagements / red teams)

The dominant real-world initial access: a malicious attachment or a credential-harvesting page delivering a foothold on a user's workstation (the social-engineering topic — pro level). On authorized engagements this is done within strict rules; conceptually, it's how most real intrusions begin, targeting the human rather than a service.

## Landing the foothold

However you get in, you usually land as a **low-privileged user or a service account** (or you hold a valid low-priv credential). That's the start: authenticated domain enumeration (the last steps), local privilege escalation (next), and credential harvesting toward the domain. On Windows, remember, a **valid credential is often the foothold** — no exploit required — which is why spraying, hash capture, and credentials-from-shares are so central.

## The defensive mirror

Every route maps to a defensive control: MFA and sensible lockout + detection (spraying), patch and secure services, strong service-account passwords, disable LLMNR/NBT-NS and require SMB signing (hash capture/relay), remove secrets from shares/SYSVOL, and phishing-resistant MFA + awareness (phishing). When you spray your way in or capture an NTLMv2 hash on an authorized test, you demonstrate exactly those gaps.`,
      sample: {
        lang: 'bash',
        caption: 'Password spraying (respecting lockout) and hash capture',
        code: `# spray ONE password across the user list (stay under lockout)
nxc smb 10.10.10.0/24 -u users.txt -p 'Winter2024!' --continue-on-success

# capture NTLMv2 hashes by poisoning LLMNR/NBT-NS on the LAN (Responder)
responder -I eth0        # victims resolve a name -> authenticate to us`,
        output: `[spray] 10.10.10.10  corp.local\\asmith:Winter2024!   [+]  <- foothold!
        (one password, whole user list, under the lockout threshold)
[responder] [SMB] NTLMv2 hash captured for CORP\\bwilson
   BWILSON::CORP:1122...:...   -> crack offline OR relay
# A valid domain credential IS a foothold (no exploit). Defences:
# MFA + lockout + detection (spray), disable LLMNR/NBT-NS + SMB signing (capture).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When password spraying an AD domain, why must a tester spray one password at a time and respect the account-lockout policy?',
        options: [
          'Because spraying more passwords is illegal',
          'Because trying many passwords against one account triggers lockout (and loud detection); spraying one common password across all accounts stays under the per-account lockout threshold, avoiding lock-outs and reducing noise while still frequently landing a valid credential from users with weak passwords',
          'Because the domain controller can only check one password per hour',
          'Because lockout policies do not apply to spraying',
        ],
        answer: 1,
        explain:
          'Lockout thresholds count failed attempts *per account*, so hammering one account with many passwords locks it out quickly (disrupting the real user and generating obvious detection), while spraying a single common password across the whole user list produces only one failed attempt per account — staying under the threshold. The tester sprays one password, waits out the observation window, then tries the next, which avoids lock-outs, keeps noise down, and still succeeds because in any sizeable domain some users choose weak, common passwords. This is precisely the failed-logon pattern defenders monitor for, and the countermeasures are MFA, sensible lockout, and detection.',
        hint: 'What does trying many passwords against one account trigger, and how does one-password-many-accounts avoid it?',
      },
    },

    {
      id: 'rwin-a-04',
      title: 'Local escalation: services and permissions',
      read: `A foothold lands you low-privileged; local privilege escalation to **SYSTEM** (or local admin) unlocks credential harvesting and full host control. The largest category of Windows local escalation is **service misconfigurations**, because Windows services run as SYSTEM and controlling one means controlling SYSTEM.

## Why services are the prime target

A Windows **service** runs a program automatically, usually as **SYSTEM** (the most powerful local account). If a low-privileged user can influence what a service runs — its binary, its configuration, or the DLLs it loads — they inherit SYSTEM when the service starts. The categories:

## Weak service permissions

If your user can **modify a service's configuration** (change its binary path) or **restart it**, you point it at your payload and restart it → SYSTEM. Check with **AccessChk** or PowerUp: does your user have \`SERVICE_CHANGE_CONFIG\` or write access to the service? \`sc config <svc> binPath= "..."\` then \`sc start <svc>\`.

## Weak service binary/directory permissions

If the service's **executable or its directory is writable** by your user, replace or plant a binary → when the service runs (or you restart it), your code runs as SYSTEM. \`icacls\` on the binary/directory reveals writability.

## Unquoted service paths

A service path with spaces and **no quotes** — \`C:\\Program Files\\My App\\svc.exe\` — makes Windows try \`C:\\Program.exe\`, then \`C:\\Program Files\\My.exe\`, etc. If you can **write to an earlier location** (e.g. \`C:\\Program Files\\My.exe\` where that directory is writable), your binary runs as the service (SYSTEM). Hunt: services with unquoted paths containing spaces, cross-referenced with writable directories.

## The method and tools

1. Enumerate services and their configs, binaries, directories, and your permissions on each.
2. **PowerUp** (\`Invoke-AllChecks\`), **SharpUp**, **WinPEAS**, and **AccessChk** automate finding modifiable services, writable binaries/dirs, and unquoted paths — and PowerUp can even abuse them for you. Understand *why* each is exploitable.
3. Exploit: modify/replace/plant, restart or wait, get SYSTEM.

## Beyond services: scheduled tasks and autoruns

The same principle applies to **scheduled tasks** (a task you can modify that runs as a higher privilege) and **autostart** entries — anything that runs automatically with more privilege than you, that you can influence.

## The defensive mirror

Every service-escalation path is a defensive finding the blue track covered: correct service permissions (users can't modify service configs), non-writable service binaries and directories, quoted service paths (or non-writable path directories), and locked-down scheduled tasks. When PowerUp flags a modifiable service or an unquoted path on an authorized test, that's exactly what a defender running the same check should find and fix. Services are the prime Windows escalation surface precisely because they run as SYSTEM — and securing their configuration is the corresponding defence.`,
      sample: {
        lang: 'powershell',
        caption: 'Finding a modifiable service and an unquoted path (PowerUp/sc)',
        code: `# PowerUp checks all of these at once:
powershell -ep bypass; . .\\PowerUp.ps1; Invoke-AllChecks

# manual: can I reconfigure a service? (SERVICE_CHANGE_CONFIG)
accesschk.exe -uwcqv "Authenticated Users" *
# unquoted service paths with spaces:
wmic service get name,pathname,startmode | findstr /i /v """ | findstr /i " "
# exploit a modifiable service -> SYSTEM:
sc config vulnsvc binPath= "C:\\temp\\rev.exe" && sc start vulnsvc`,
        output: `[PowerUp] ModifiableService: 'UpdaterSvc' - you can change its binPath
[PowerUp] UnquotedServicePath: 'C:\\Program Files\\My App\\svc.exe'
          writable: C:\\Program Files\\  -> plant C:\\Program Files\\My.exe
[accesschk] Authenticated Users: SERVICE_CHANGE_CONFIG on UpdaterSvc
# reconfigure/restart -> the service (SYSTEM) runs your binary -> SYSTEM.
# Defences: correct service perms, non-writable binaries/dirs, quoted paths.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are misconfigured Windows services the prime target for local privilege escalation to SYSTEM?',
        options: [
          'Because services store the administrator password',
          'Because services typically run as SYSTEM (the most powerful local account), so if a low-privileged user can influence what a service runs — modifying its config/binary path, writing to its executable or directory, or exploiting an unquoted path plus a writable directory — their code executes as SYSTEM when the service runs',
          'Because services bypass Windows authentication',
          'Because only services can spawn processes',
        ],
        answer: 1,
        explain:
          'Windows services generally run under SYSTEM, so controlling what a service executes means executing as SYSTEM. A low-privileged user achieves that through several service misconfigurations: permission to modify the service configuration (repoint its binary path) or to write to the service’s executable/directory (replace or plant a binary), or an unquoted service path with spaces combined with a writable earlier directory (Windows runs the attacker’s binary instead). In each case, when the service starts (or is restarted), the attacker’s code runs as SYSTEM. That is why services are the largest local-escalation category, and the defences are exactly correct service permissions, non-writable binaries and directories, and quoted paths — which the defensive Windows track covered.',
        hint: 'What account do services usually run as, and what happens if you can control what one of them executes?',
      },
    },

    {
      id: 'rwin-a-05',
      title: 'Local escalation: privileges and hijacking',
      read: `Beyond services, several potent Windows local-escalation routes come from **powerful token privileges**, **policy misconfigurations**, and **DLL hijacking**. These often give SYSTEM directly and are staples of Windows escalation.

## Abusing powerful privileges

A token can hold privileges that are effectively keys to SYSTEM (\`whoami /priv\`):

- **SeImpersonatePrivilege** — allows impersonating a client that connects to you. Service accounts (like \`IIS APPPOOL\`, MSSQL) often hold it, and the **"Potato" family** of attacks (JuicyPotato, PrintSpoofer, RoguePotato, GodPotato, etc.) abuse it to coerce a SYSTEM process to authenticate to the attacker, then impersonate it → SYSTEM. This is the most common escalation from a web/database service-account foothold.
- **SeDebugPrivilege** — read/write any process's memory → dump LSASS credentials, or inject into a SYSTEM process.
- **SeBackupPrivilege / SeRestorePrivilege** — read (or write) any file bypassing ACLs → read the SAM/SYSTEM registry hives (extract local hashes) or sensitive files.
- **SeTakeOwnershipPrivilege**, **SeLoadDriverPrivilege**, **SeManageVolumePrivilege** — each an escalation route.

So \`whoami /priv\` is a first check: a low-priv account holding one of these is often a direct path to SYSTEM.

## Policy misconfigurations

- **AlwaysInstallElevated** — if both the machine and user registry keys are set, *any* user can install an MSI package as SYSTEM. Craft a malicious MSI (\`msfvenom\`), install it → SYSTEM. A pure misconfiguration, checked with two registry queries.
- **Stored credentials** — Windows Credential Manager, saved RDP credentials, autologon credentials in the registry, unattended-install files (\`Unattend.xml\`, \`sysprep.xml\`) containing passwords.

## DLL hijacking

Programs load DLLs, searching a defined order of directories. If a program (especially one running as SYSTEM, or that an admin runs) loads a DLL by name and searches a **writable directory** before the legitimate one, you plant a malicious DLL there → your code runs in that program's context. Related: **missing DLLs** a program tries to load from a writable path. Requires finding the right program/DLL/writable-path combination, but is a reliable route where present.

## The method and tools

\`whoami /priv\` first; then **WinPEAS**, **PowerUp**, **Seatbelt** enumerate privileges, AlwaysInstallElevated, stored credentials, and hijackable DLLs. As always, understand *why* each works — the Potato attacks abuse impersonation, AlwaysInstallElevated abuses a policy, DLL hijacking abuses the search order — so you can exploit reliably and report accurately.

## The defensive mirror

Each maps to a defensive control: don't grant powerful privileges (SeImpersonate/SeDebug/SeBackup) to accounts that don't need them and audit who holds them; never enable AlwaysInstallElevated; don't leave credentials in files/registry; and fix DLL-hijack conditions (no writable directories in search paths, fully-qualified DLL loads). When WinPEAS flags SeImpersonate on a service account or AlwaysInstallElevated on an authorized test, those are exactly the findings a defender should remove — the same knowledge from both sides.`,
      sample: {
        lang: 'powershell',
        caption: 'SeImpersonate -> SYSTEM (Potato), and AlwaysInstallElevated',
        code: `whoami /priv | findstr /i "Impersonate Debug Backup"
#  SeImpersonatePrivilege  Enabled   <- service acct -> Potato attack:
PrintSpoofer.exe -i -c cmd            # coerce+impersonate SYSTEM -> SYSTEM shell

# AlwaysInstallElevated: both keys = 1 -> install MSI as SYSTEM
reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated
msiexec /quiet /i evil.msi             # runs as SYSTEM`,
        output: `SeImpersonatePrivilege  Enabled
[PrintSpoofer] Impersonated SYSTEM. nt authority\\system   <- SYSTEM!
AlwaysInstallElevated  HKLM=0x1  HKCU=0x1                  <- MSI as SYSTEM
# Powerful privileges (SeImpersonate/SeDebug/SeBackup), policy
# misconfigs (AlwaysInstallElevated), and DLL hijacking each give
# SYSTEM. Defences: don't grant these privileges, never enable
# AlwaysInstallElevated, no creds in files, fix DLL search paths.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A web-application service account holds `SeImpersonatePrivilege`. Why is this a common and direct path to SYSTEM?',
        options: [
          'Because SeImpersonate is the same as being an administrator',
          'Because SeImpersonatePrivilege lets the account impersonate a client that authenticates to it, and "Potato"-family attacks (PrintSpoofer, JuicyPotato, etc.) coerce a SYSTEM process into authenticating to the attacker so it can be impersonated — yielding a SYSTEM shell; service accounts like IIS APPPOOL and MSSQL commonly hold this privilege',
          'Because it disables User Account Control',
          'Because it grants Domain Admin automatically',
        ],
        answer: 1,
        explain:
          'SeImpersonatePrivilege permits a process to impersonate the security context of a client that connects and authenticates to it — a legitimate need for service accounts, which is why IIS APPPOOL, MSSQL and similar accounts hold it. The Potato family of attacks exploits this by coercing a highly-privileged (SYSTEM) process to authenticate to an endpoint the attacker controls, then impersonating that SYSTEM token, resulting in code execution as SYSTEM. Because web and database footholds so often land as exactly these service accounts, SeImpersonate is one of the most common and reliable local-escalation paths, which is why `whoami /priv` is a first check — and why defenders audit and minimise who holds such powerful privileges.',
        hint: 'What does impersonation privilege let the account do with a token, and which powerful process can be coerced to authenticate to it?',
      },
    },

    {
      id: 'rwin-a-06',
      title: 'Automating escalation and patches',
      read: `Two things complete the local-escalation picture: **automated enumeration** (to find candidate paths fast) and **kernel/OS exploits** (when misconfigurations don't pan out) — mirroring the LinPEAS-and-kernel approach from the Linux track.

## Automated enumeration

Windows privilege-escalation checks are automated by well-known tools that walk the whole checklist and flag likely paths:

- **WinPEAS** — the Windows counterpart to LinPEAS: checks privileges, services (permissions, unquoted paths, writable binaries), AlwaysInstallElevated, stored credentials, scheduled tasks, patches, and much more, colour-coding likely wins.
- **PowerUp** / **SharpUp** — focused on escalation, and PowerUp can *exploit* many findings directly (\`Invoke-AllChecks\`, then abuse functions).
- **Seatbelt** — broad host survey (security-relevant configuration, credentials, and more).

Use them as accelerators: run to find candidates, then **verify and understand each by hand** (the recurring lesson — an automated flag is a lead, not a confirmed path; understanding is what lets you exploit reliably and report accurately). And, as always, this is the same tooling defenders run against their own hosts to find and fix these paths.

## Kernel and OS exploits

When misconfigurations don't provide a path, an **unpatched kernel/OS** with a known local-privilege-escalation exploit may:

1. **Check the patch level** — \`systeminfo\` lists installed hotfixes. Tools like **Windows Exploit Suggester (WES-NG)** compare \`systeminfo\` output against known exploits to suggest candidates.
2. **Assess applicability** — the exact build, architecture, and whether the relevant patch is present (the CVE-applicability judgement).
3. **Use with care** — some are reliable, some can crash the system (bluescreen), which on an authorized engagement can disrupt production. Snapshot in the lab; weigh the risk on real targets.

Famous Windows local-privesc examples (PrintNightmare, various kernel/driver flaws) show how a missing patch can give SYSTEM. As on Linux, kernel exploits are a **later resort** after misconfigurations, both because misconfigs are more reliable and because kernel exploits carry crash risk.

## The complete Windows escalation checklist

You now have the main categories: **powerful privileges** (SeImpersonate/SeDebug/SeBackup → Potato/dumping), **service misconfigurations** (permissions, unquoted paths, writable binaries), **policy misconfigs** (AlwaysInstallElevated), **DLL hijacking**, **stored credentials** (files, registry, Credential Manager, Unattend), **scheduled tasks/autoruns**, and **unpatched kernel/OS**. The professional method: run WinPEAS/PowerUp to find candidates fast, verify and understand each, exploit the most reliable, and reach for kernel exploits last.

## The defensive mirror

Automated escalation tools are a **blue-team self-audit** — a defender runs WinPEAS/PowerUp on their own hosts to find exactly these misconfigurations before an attacker does — and patch level is the classic defensive control (the kernel-exploit route is closed entirely by patching). When you find a SYSTEM path via WinPEAS on an authorized test, you're producing precisely the defensive finding the blue track said to catch. Offence finds the escalation; defence removes it — the same checklist, both directions.`,
      sample: {
        lang: 'powershell',
        caption: 'Automate the checklist, then check patches for a kernel exploit',
        code: `# run the whole escalation checklist (find candidates fast)
.\\winPEAS.exe                       # or:  . .\\PowerUp.ps1; Invoke-AllChecks
# verify + understand each flagged candidate by hand.

# patch level -> suggest known kernel/OS local-privesc exploits
systeminfo > si.txt
python wes.py si.txt                  # Windows Exploit Suggester (WES-NG)`,
        output: `[WinPEAS] SeImpersonate enabled | UpdaterSvc modifiable | AlwaysInstallElevated=1
          (candidates - VERIFY and understand each, don't run blind)
[WES-NG]  Missing KB50xxxxx -> CVE-20xx-xxxx (local privesc) -> assess/last resort
# Automated tools find candidates fast; understanding turns a flag
# into a reliable, reportable SYSTEM. Kernel exploits are a LAST
# resort (crash risk). Defenders run the SAME tools + patch to close these.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are kernel/OS exploits generally a "last resort" for local privilege escalation, after checking for misconfigurations?',
        options: [
          'Because kernel exploits never work on Windows',
          'Because misconfiguration-based escalations are more reliable, while kernel exploits must match the exact build and can crash the system (bluescreen) — disrupting a production host on an authorized engagement — so testers exhaust the safer misconfiguration paths first and use kernel exploits cautiously (and patching closes them entirely)',
          'Because kernel exploits require Domain Admin first',
          'Because misconfigurations cannot lead to SYSTEM',
        ],
        answer: 1,
        explain:
          'Misconfiguration-based paths (service permissions, powerful privileges, AlwaysInstallElevated, DLL hijacking, stored credentials) are typically reliable and low-risk to exploit, so testers pursue them first. Kernel/OS exploits require a precise match to the target build and architecture and can destabilise or bluescreen the system if they fail or mismatch — which on an authorized engagement can disrupt a production host — so they carry real risk and are held as a later resort, assessed carefully and snapshotted in a lab. They are also completely preventable by patching, the classic defensive control, whereas misconfigurations require their own specific fixes. Automated tools (WES-NG for patches; WinPEAS/PowerUp for misconfigs) help find candidates, but understanding and risk assessment govern which to use.',
        hint: 'Which is more reliable and safer to exploit — a misconfiguration, or a kernel exploit that can bluescreen the host?',
      },
    },

    {
      id: 'rwin-a-07',
      title: 'Dumping credentials',
      read: `With SYSTEM/local admin on a host, the highest-value action is **dumping credentials** — extracting the reusable credential material (hashes, tickets, cached credentials) that fuels lateral movement and the path to Domain Admin. Understanding the credential stores and how they're dumped is central Windows tradecraft (used on authorized targets and in your lab).

## LSASS — the prime target

**LSASS** (Local Security Authority Subsystem Service) holds, in memory, the credential material of logged-on users to enable single sign-on: **NTLM hashes**, **Kerberos tickets** (TGTs and service tickets), and sometimes more. With SYSTEM (or SeDebugPrivilege), you can read LSASS memory and extract all of it. This is the single most valuable dump, because it yields **currently-usable** credentials — especially any privileged user who logged onto the host (a Domain Admin's credential harvested from a server is the classic path to domain compromise).

- **Mimikatz** is the canonical tool (\`sekurlsa::logonpasswords\`, \`sekurlsa::tickets\`); many others exist.
- A common technique is **dumping LSASS's memory to a file** (e.g. with built-in tools) and extracting credentials offline — quieter than running a known tool live.

## The SAM — local account hashes

The **SAM** database holds *local* account password hashes (including the local Administrator). With admin access you dump it (from the registry hives \`SAM\` + \`SYSTEM\`, via \`reg save\` or SeBackupPrivilege, then parse with tools like secretsdump). Local admin hashes are gold for **pass-the-hash** across machines that share them (the LAPS problem).

## Other stores

- **LSA secrets** — service account passwords and other secrets in the registry.
- **Cached domain credentials** — for offline logon (MSCache hashes; crackable, not directly usable).
- **DPAPI-protected secrets** — saved browser/app passwords, which SYSTEM/user context can often decrypt.
- **The domain database (NTDS.dit)** — on a DC, *every* domain account's hash (the ultimate dump; via DCSync or extracting NTDS.dit — the skilled level).

## secretsdump and remote dumping

**Impacket's secretsdump** remotely dumps the SAM, LSA secrets, and (on a DC) NTDS.dit given appropriate credentials — a workhorse. NetExec integrates dumping across many hosts.

## The protections (the defensive reality)

Modern Windows makes LSASS dumping harder, which is exactly the defensive controls you learned:

- **Credential Guard** — isolates LSASS secrets in a VBS-protected environment malware can't read.
- **LSASS as a Protected Process (RunAsPPL)** — stops non-protected processes (including most dumpers) opening LSASS memory.
- **Restricting SeDebugPrivilege**, and **EDR detection** of LSASS access (the high-fidelity Sysmon Event 10 you learned defensively).

So on a hardened target, dumping LSASS is harder or detected — and demonstrating whether you *can* dump it is itself a finding about those controls. On a lab or unhardened target, it's straightforward.

## The defensive mirror

Credential dumping is the direct counterpart of the defensive credential-protection controls: Credential Guard and PPL (stop LSASS dumping), disabling reuse via LAPS (limit what a dumped local hash opens), tiered admin and Protected Users (keep privileged credentials off dumpable hosts), and EDR alerting on LSASS access. When you dump a Domain Admin's credential from a server on an authorized test, you demonstrate exactly the gap those controls close. The whole point of protecting credentials, defensively, is to prevent this dump — and the whole point of this dump, offensively, is to demonstrate that the protection is needed.`,
      sample: {
        lang: 'text',
        caption: 'Credential stores and what dumping each yields',
        code: `With SYSTEM / local admin, dump:
  LSASS memory   -> logged-on users' NTLM hashes + Kerberos TICKETS
                    (incl. any Domain Admin who logged on here!) - USABLE now
  SAM + SYSTEM   -> LOCAL account hashes (local admin -> pass-the-hash)
  LSA secrets    -> service account passwords
  cached creds   -> MSCache (crackable, not directly usable)
  NTDS.dit (DC)  -> EVERY domain account's hash (the ultimate dump)

Tools: Mimikatz (sekurlsa::logonpasswords), Impacket secretsdump.
Protections (harden the target): Credential Guard, LSASS RunAsPPL,
restrict SeDebug, EDR alerts on LSASS access (Sysmon Event 10).`,
        output: `Dumping credentials (with SYSTEM/admin) yields REUSABLE material:
LSASS -> logged-on hashes+tickets (esp. a Domain Admin's -> the path
to the domain), SAM -> local hashes (pass-the-hash), NTDS.dit on a
DC -> everything. Modern defences (Credential Guard, PPL, EDR)
make it harder/detected - so whether you CAN dump is itself a
finding. Dumping is the mirror of credential-protection controls.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is dumping LSASS memory the single most valuable credential-dumping action after gaining SYSTEM on a domain-joined host?',
        options: [
          'Because LSASS stores the domain controller’s IP',
          'Because LSASS holds, in memory, the currently-usable credential material (NTLM hashes and Kerberos tickets) of everyone logged onto the host — so it can yield a privileged user’s credential (e.g. a Domain Admin who logged onto that server), which is the classic bridge from a single host to domain compromise',
          'Because LSASS contains every domain account’s password',
          'Because dumping LSASS disables Windows Defender',
        ],
        answer: 1,
        explain:
          'LSASS caches the credential material of logged-on users to provide single sign-on, so its memory contains currently-valid NTLM hashes and Kerberos tickets that can be reused immediately (pass-the-hash/pass-the-ticket). The highest-value case is when a privileged account has logged onto the host — a Domain Admin whose session was cached on a compromised server hands the attacker a domain-level credential, the classic path from one host to full domain compromise. That is why LSASS is the prime dump target and why the defensive controls (Credential Guard, LSASS-as-PPL, EDR alerting on LSASS access, and tiering to keep privileged sessions off exposed hosts) focus so heavily on protecting it. Every domain account’s hash lives in NTDS.dit on a DC, not in a member host’s LSASS.',
        hint: 'What does LSASS hold for logged-on users, and why does a Domain Admin having logged onto a server matter so much?',
      },
    },

    {
      id: 'rwin-a-08',
      title: 'Pass-the-hash and pass-the-ticket',
      read: `Having dumped credential material, the defining Windows technique is **reusing it directly** — authenticating with a stolen hash or ticket, **without knowing the password**. This is what makes Windows credential theft so powerful and drives lateral movement toward Domain Admin.

## Pass-the-Hash (PtH)

NTLM authentication proves you know the password by using its **hash**, not the password. So a stolen **NTLM hash** can be used to authenticate directly — no cracking needed:

- Use the hash with remote-execution tools: \`nxc smb <target> -u administrator -H <hash>\`, \`impacket-psexec administrator@<target> -hashes :<hash>\`, \`evil-winrm -u administrator -H <hash>\`.
- The devastating case: a **local Administrator hash reused across machines** (the LAPS problem). Dump it from one host, PtH to every machine sharing it → own the fleet without a single password. This is the classic Windows lateral-movement engine.

## Pass-the-Ticket (PtT)

The Kerberos equivalent: a stolen **Kerberos ticket** (TGT or service ticket, dumped from LSASS) can be injected into your session and used to authenticate as that user for the ticket's lifetime:

- Inject a ticket (\`mimikatz kerberos::ptt\`, or Rubeus, or set \`KRB5CCNAME\` on Linux) and act as that user.
- **Overpass-the-Hash (pass-the-key)** — use a stolen hash/key to request a *fresh, legitimate TGT*, then use it — bridging PtH into Kerberos.

## Why this is the core of AD movement

Because these techniques need no password and use *valid* credential material, they turn a single credential dump into broad access:

- A dumped local admin hash → PtH across all machines sharing it.
- A dumped Domain Admin ticket/hash → authenticate as Domain Admin.
- A service account's hash → reach wherever it's privileged.

The credential-reuse loop (dump → reuse → dump more → reach Domain Admin) runs on PtH/PtT. It's why "get a hash" is often as good as "get a password", and why Windows lateral movement is credential-driven rather than exploit-driven.

## Detection and the defensive reality

These are subtle because the authentication itself is *valid* — but detectable (the defensive lesson): NTLM authentication where Kerberos is expected, an account authenticating to many hosts rapidly, a ticket used from a different machine than issued, and anomalous logon patterns. And they're *prevented/limited* by the controls you learned:

- **LAPS** — unique local admin passwords, so a dumped local hash opens only one machine (kills PtH lateral movement via local admin).
- **Credential Guard / PPL** — stop the dump that feeds PtH/PtT in the first place.
- **Tiered administration / Protected Users** — keep powerful credentials off exposed hosts, so there's nothing valuable to dump-and-reuse; Protected Users also hardens ticket handling.

## The defensive mirror

Pass-the-hash and pass-the-ticket are the exact reason those defensive controls exist. When you PtH a reused local admin hash across ten machines on an authorized test, you demonstrate precisely the failure LAPS fixes; when you PtT a Domain Admin ticket dumped from a workstation, you demonstrate what tiered administration prevents. On Windows, a hash or ticket *is* a credential — offence reuses it, defence stops the theft and limits the reach.`,
      sample: {
        lang: 'bash',
        caption: 'Reusing a stolen hash and a stolen ticket — no password needed',
        code: `# PASS-THE-HASH: authenticate with the NTLM hash directly
nxc smb 10.10.10.0/24 -u administrator -H aad3b...:31d6cfe0d16ae931b73c59d7e0c089c0
#   -> shows which machines that (reused local admin) hash opens
impacket-psexec administrator@10.10.10.20 -hashes :31d6cfe0...   # -> SYSTEM shell

# PASS-THE-TICKET: inject a stolen Kerberos ticket and act as that user
export KRB5CCNAME=da-alice.ccache        # a Domain Admin's ticket from LSASS
nxc smb 10.10.10.10 --use-kcache          # authenticate as da-alice`,
        output: `[PtH] administrator hash valid on 10.10.10.20, .21, .22 ...   <- reuse!
      (one dumped local admin hash opens every machine sharing it)
[psexec] NT AUTHORITY\\SYSTEM  on 10.10.10.20   (no password, just the hash)
[PtT] authenticated as CORP\\da-alice via her ticket   -> Domain Admin actions
# A hash/ticket IS a credential. Defences: LAPS (unique local pw),
# Credential Guard/PPL (stop the dump), tiering/Protected Users.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a pass-the-hash attack, why does the attacker not need to crack the password, and what makes it so effective for lateral movement?',
        options: [
          'Because they already stole the plaintext password',
          'Because NTLM authentication uses the password’s hash as the proof of identity, so possessing the hash is enough to authenticate as the user — and because organisations reuse credentials (notably the same local admin password across machines), one dumped hash often authenticates to many hosts directly, driving lateral movement without cracking or a password',
          'Because the hash contains the password in readable form',
          'Because pass-the-hash only works on the domain controller',
        ],
        answer: 1,
        explain:
          'NTLM proves knowledge of the password via its hash, so the hash itself is a usable credential — "passing" it authenticates you as the user with no cracking and no plaintext. Its power for lateral movement comes from credential reuse: when the same local administrator password (and therefore hash) exists on many machines, a hash dumped from one host authenticates to all of them, letting the attacker sweep the fleet via remote-execution tools. Combined with pass-the-ticket for Kerberos, this makes Windows lateral movement credential-driven rather than exploit-driven. The defences are exactly LAPS (unique per-host passwords so a hash opens only one machine), Credential Guard/PPL (prevent the dump), and tiering/Protected Users (limit what powerful credentials are exposed to theft).',
        hint: 'What does NTLM use as proof of the password, and what does credential reuse do to a single stolen hash?',
      },
    },

    {
      id: 'rwin-a-09',
      title: 'Roasting Kerberos accounts',
      read: `Two of the most accessible AD attacks let you obtain crackable credential material from Kerberos with only a low-privileged domain account (or none). **Kerberoasting** and **AS-REP roasting** are staples every Windows tester uses, on authorized targets and in the lab.

## Kerberoasting

Any authenticated user can request a **service ticket** for any account with a **Service Principal Name (SPN)** — typically service accounts. That ticket is encrypted with the **service account's password hash**, so you request it, extract it, and **crack it offline** to recover the service account's password:

- **Find roastable accounts** — accounts with SPNs (\`GetUserSPNs.py\`, PowerView \`Get-DomainUser -SPN\`, \`setspn\`).
- **Request and extract tickets** — \`impacket-GetUserSPNs corp.local/jdoe:pass -request\`, or Rubeus \`kerberoast\`.
- **Crack offline** — Hashcat mode 13100. Service accounts often have weak, old, non-rotated passwords, so cracking frequently succeeds.
- Prefer requesting **RC4** tickets (easier to crack) where the domain allows it (a tell defenders watch).

Why it's so useful: it needs only *one* low-priv credential, the cracking is offline (quiet, no lockout), and service accounts are often **privileged** (a cracked service account may be a local admin on many hosts, or even in a privileged group) — so a Kerberoast can jump you a long way toward Domain Admin.

## AS-REP roasting

For accounts with **Kerberos pre-authentication disabled** (\`DONT_REQ_PREAUTH\`), anyone can request an AS-REP whose encrypted portion is derived from the account's password hash — crackable offline, needing **no credentials at all**, just the account name:

- **Find them** — \`GetNPUsers.py\` / PowerView \`Get-DomainUser -PreauthNotRequired\`; from a user list you can test each even unauthenticated.
- **Request and crack** — \`impacket-GetNPUsers corp.local/ -usersfile users.txt -request\`, then Hashcat mode 18200.

Its distinguishing value: it needs no foothold, so it's an *initial-access* technique — from a user list alone you may crack a password and get your first credential.

## Why these matter

Both convert Kerberos's design (tickets encrypted with account hashes) into crackable material, and both are high-yield: Kerberoasting because service accounts are often weak and privileged; AS-REP roasting because it needs no credentials. They're among the first things a tester tries in AD, and they frequently provide a foothold or a jump toward Domain Admin.

## The defensive mirror

Both map directly to the defensive Kerberos controls:

- **Kerberoasting** → **gMSA** (Group Managed Service Accounts: 120+ character auto-rotated passwords that can't be cracked), strong service-account passwords, least-privilege service accounts (so a cracked one isn't valuable), and disabling RC4.
- **AS-REP roasting** → **clear the pre-auth-disabled flag** on accounts (the primary fix), strong passwords where it must remain.

When you Kerberoast a weak, over-privileged service account or AS-REP roast a flagged account on an authorized test, you demonstrate exactly those gaps — and the report's fixes are gMSA, the cleared flag, least privilege, and disabling RC4. Offence roasts the account; defence removes the roastability.`,
      sample: {
        lang: 'bash',
        caption: 'Kerberoasting (needs a credential) and AS-REP roasting (needs none)',
        code: `# KERBEROAST: request service tickets for SPN accounts, crack offline
impacket-GetUserSPNs corp.local/jdoe:'Spring2024' -request -dc-ip 10.10.10.10
hashcat -m 13100 kerb.hashes rockyou.txt        # crack the service-account pw

# AS-REP ROAST: no credentials needed - just account names
impacket-GetNPUsers corp.local/ -usersfile users.txt -request -dc-ip 10.10.10.10
hashcat -m 18200 asrep.hashes rockyou.txt`,
        output: `[Kerberoast] svc-sql (SPN MSSQL/...) ticket obtained
  hashcat -> svc-sql:Summer2024    (weak, old service-acct pw - cracked)
  and svc-sql is local admin on 8 hosts -> a big jump toward Domain Admin
[AS-REP]   asmith (pre-auth disabled) AS-REP obtained (NO credential needed)
  hashcat -> asmith:Password1      -> an initial foothold from a user list alone
# Defences: gMSA + strong service pws + no RC4 (Kerberoast);
#           clear the pre-auth-disabled flag (AS-REP).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes AS-REP roasting from Kerberoasting in terms of what the attacker needs to begin?',
        options: [
          'AS-REP roasting requires Domain Admin; Kerberoasting does not',
          'Kerberoasting requires at least one valid domain credential to request service tickets, whereas AS-REP roasting needs no credentials at all — only the name of an account that has Kerberos pre-authentication disabled — so AS-REP roasting can be an initial-access technique from a user list alone',
          'They are identical and require the same access',
          'AS-REP roasting only works on the domain controller itself',
        ],
        answer: 1,
        explain:
          'Kerberoasting works by requesting service tickets for SPN accounts, which requires the attacker to be an authenticated domain user (any low-priv credential). AS-REP roasting exploits accounts configured with pre-authentication disabled: for those, anyone can request an AS-REP whose encrypted portion is derived from the account’s password hash, so it needs no credentials at all — just the account name — making it usable even before you have a foothold, potentially as initial access from a discovered user list. Both then crack offline to recover a password. Their defences differ accordingly: gMSA/strong passwords/no-RC4/least-privilege for Kerberoasting, and clearing the DONT_REQ_PREAUTH flag for AS-REP roasting.',
        hint: 'One needs a valid domain credential to request tickets; the other needs only an account name. Which is which?',
      },
    },

    {
      id: 'rwin-a-10',
      title: 'Mapping attack paths with BloodHound',
      read: `**BloodHound** is the tool that turns Active Directory's complexity into a directed route to Domain Admin. Using it well is a defining AD skill — for attackers to find paths, and (identically) for defenders to remove them.

## What BloodHound does

BloodHound ingests data about AD's **relationships** and represents the domain as a **graph** you can query. The relationships (edges) include:

- **Group memberships** (MemberOf).
- **Admin rights** — who is local admin on which machines (AdminTo).
- **Sessions** — where users are currently/recently logged on (HasSession) — so you know where a Domain Admin's credentials could be harvested.
- **ACLs** — rights over other objects: reset a password (ForceChangePassword), modify a group (AddMember), full control (GenericAll/WriteDacl), etc.
- **Delegation**, **GPO control**, **trusts**, and more.

## Collection

**SharpHound** (Windows) or **bloodhound-python** (from Linux, with a credential) collect this data — running with any domain user's access, because AD lets authenticated users read most of it. You feed the output into BloodHound (the graph database + UI).

## Finding the path

BloodHound's power is answering graph questions:

- **"Shortest path to Domain Admin"** from your current principal — the killer query, giving the exact chain of edges to walk.
- **"Find principals with DCSync rights"**, **"Kerberoastable accounts"**, **"paths from owned principals"**, and many pre-built queries.
- Mark accounts/machines you've compromised as **owned**, and BloodHound shows paths *from* them to high-value targets.

The result is that AD stops being a maze: you see, for example, "jdoe → member of Helpdesk → can reset svc-app's password → svc-app is admin on APP-07 → a Domain Admin has a session on APP-07" — a concrete 4-edge path you can execute, each edge a technique from this track (group membership, ACL abuse, lateral movement, credential harvesting).

## Executing the path

Each edge maps to an action: a group you can add yourself to, a password you can reset (ACL abuse), a machine you can admin (lateral movement via PtH/PtT), a session whose credentials you can dump. BloodHound tells you *what* to do at each step; the techniques from this track are *how*. Walking the path edge by edge is the directed hunt to Domain Admin.

## The defensive mirror (identical tool, opposite goal)

This is the clearest offence-defence mirror in the track: defenders run **the exact same BloodHound** against their own AD to find the paths to Domain Admin and **cut the edges** — remove the excess ACL, empty the over-privileged group, stop the Domain Admin logging onto that workstation (the session edge), fix the delegation. The defensive metric "number of paths to Domain Admin, trending to zero" is measured with BloodHound. So the attacker uses BloodHound to find the path; the defender uses it to remove the path; and fixing one edge (a choke point) often breaks many paths. BloodHound is where offensive AD attack and defensive AD hardening are literally the same activity, aimed in opposite directions.`,
      sample: {
        lang: 'text',
        caption: 'BloodHound turning AD into a directed path to Domain Admin',
        code: `Collect:  bloodhound-python -u jdoe -p 'Spring2024' -d corp.local -c all
Mark jdoe as OWNED; query "Shortest Path from Owned to Domain Admins":

  [jdoe] --MemberOf--> [Helpdesk]
         --ForceChangePassword--> [svc-app]   (ACL abuse: reset its pw)
         --MemberOf--> [Server Admins]
         --AdminTo--> [APP-07]                 (lateral: PtH here)
         --HasSession--> [da-alice] (Domain Admin logged on!)  (dump her creds)
  => 4 edges from jdoe to Domain Admin

Each edge = a technique from this track. BloodHound says WHAT; you know HOW.
Defenders run the SAME query to CUT an edge (choke point) and break the path.`,
        output: `BloodHound represents AD as a GRAPH of relationships (memberships,
admin rights, sessions, ACLs, delegation) and answers "shortest
path to Domain Admin". It turns the maze into a directed route -
each edge a technique you execute. Defenders run the IDENTICAL
tool to find and CUT those edges (paths-to-DA -> zero). Same
activity, opposite goals - the purest offence-defence mirror.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'BloodHound is used by both attackers and defenders. How does each use the identical tool and data?',
        options: [
          'Attackers use it to exploit; defenders cannot use it at all',
          'Both map AD as a graph of relationships and query for paths to Domain Admin — the attacker walks the shortest path, executing a technique at each edge, while the defender cuts the edges (removing excess ACLs, over-privileged group memberships, or Domain Admin sessions on exposed hosts) to break the paths, tracking "paths to Domain Admin" toward zero',
          'Defenders use it to crack passwords; attackers to scan ports',
          'It only works for whoever runs it first',
        ],
        answer: 1,
        explain:
          'BloodHound collects the same relationship data (group memberships, admin rights, sessions, ACLs, delegation) and represents AD as the same graph regardless of who runs it. The attacker queries "shortest path to Domain Admin" from their foothold and walks it, executing the appropriate technique at each edge (join a group, abuse an ACL to reset a password, PtH to a machine they admin, dump a Domain Admin session). The defender runs the identical query against their own AD to find those paths and cut the edges — remove the excess ACL, empty the over-privileged group, stop the Domain Admin logging onto that workstation, fix the delegation — driving the number of paths to Domain Admin toward zero. It is the same activity aimed in opposite directions, which is why fixing one edge (a choke point) often breaks many attacker paths at once.',
        hint: 'The attacker finds and walks the path; what does the defender do with the exact same path information?',
      },
    },

    {
      id: 'rwin-a-11',
      title: 'Lateral movement in practice',
      read: `Lateral movement — reaching and compromising additional hosts — is where harvested credentials become domain progress. The beginner level outlined it; here are the practical techniques, used with stolen credentials/hashes/tickets against authorized targets and in the lab.

## The remote-execution methods

Windows offers legitimate remote-administration mechanisms attackers abuse to run code on other machines, each with tools and a detection signature:

- **PsExec-style / service creation** — \`impacket-psexec\`, Sysinternals PsExec: copies a binary to the target's admin share (\`ADMIN$\`/\`C$\`) and runs it as a service (**SYSTEM**). Powerful but **noisy** (service creation, Event 7045; the defensive signature).
- **WMI** — \`impacket-wmiexec\`, \`wmic ... process call create\`: remote execution over WMI, stealthier (no service, no binary dropped by default). Parent process \`WmiPrvSE.exe\` (the defensive tell).
- **WinRM / PowerShell Remoting** — \`evil-winrm\`, \`Invoke-Command\`: clean remote command execution over 5985/5986 where enabled. Parent \`wsmprovhost.exe\`.
- **SMB exec** — \`impacket-smbexec\`: command execution over SMB.
- **RDP** — interactive access with credentials (Type-10 logon; the defensive tell).
- **DCOM**, remote scheduled tasks, and others.

## Credentials make them work

All of these need credentials, and Windows lets you supply stolen material directly:

- **With a password** — \`evil-winrm -u admin -p 'Pass'\`.
- **With a hash (pass-the-hash)** — \`impacket-psexec admin@target -hashes :<hash>\`, \`nxc smb target -u admin -H <hash>\`.
- **With a ticket (pass-the-ticket)** — inject the ticket, then execute.

## NetExec: movement at scale

**NetExec (nxc)** shines here: give it credentials/a hash and a subnet, and it tells you **which machines they work on** (spraying the credential across hosts) and can execute commands on all of them. This is how you rapidly map where a harvested credential is valid and move across many hosts — the reuse principle, operationalised.

## The loop, executed

Lateral movement in practice: harvest credentials on host A → use NetExec/psexec/wmiexec/evil-winrm with those credentials (password, hash, or ticket) to reach host B → land on B (often SYSTEM via PsExec, or as the user) → escalate if needed, harvest B's credentials (maybe a more privileged account) → repeat, following the BloodHound path → reach Domain Admin. Each hop combines a *credential* (harvested) with a *method* (remote exec).

## Choosing the method (OPSEC awareness)

The methods differ in noise: PsExec is loud (service creation), WMI/WinRM quieter, and each has a detection signature you learned defensively. On a stealthy engagement you prefer quieter methods and valid-credential authentication over exploits; on a normal pentest, thoroughness matters more. Either way, understanding what each method looks like to a defender (the parent processes, the events, the logon types) informs both your choice and your report.

## The defensive mirror

Every method and its abuse maps to defensive controls and detections: **LAPS** (unique local admin passwords, so PtH stops at one host), **tiered admin/Protected Users** (limit credential reach), **network segmentation and host firewalls** (block workstation-to-workstation admin protocols), **disable/limit unneeded remote-exec** (WinRM/RDP where not needed), and **detection** of the remote-exec signatures (7045, WmiPrvSE/wsmprovhost parents, logon fan-out). When you move laterally with a reused credential on an authorized test, you demonstrate exactly those gaps.`,
      sample: {
        lang: 'bash',
        caption: 'Moving laterally with harvested credentials, and finding where they work',
        code: `# where does this credential/hash work across the subnet? (reuse map)
nxc smb 10.10.10.0/24 -u administrator -H 31d6cfe0...      # PtH sweep
# remote execution on a target (choose method by noise/availability):
impacket-wmiexec administrator@10.10.10.20 -hashes :31d6cfe0...   # quiet (WMI)
evil-winrm -u svc-admin -H <hash> -i 10.10.10.21                  # WinRM
impacket-psexec administrator@10.10.10.22 -hashes :31d6cfe0...    # SYSTEM (loud)`,
        output: `[nxc] administrator hash -> valid on .20, .21, .22, .30 (Pwn3d!)  <- reuse map
[wmiexec] shell on 10.10.10.20 (as administrator, via WMI - quiet)
[psexec]  NT AUTHORITY\\SYSTEM on 10.10.10.22 (loud: service created, 7045)
# Each hop = harvested CREDENTIAL + remote-exec METHOD. NetExec maps
# where a credential works; then move, harvest more, repeat -> Domain Admin.
# Defences: LAPS, tiering, segmentation, limit remote-exec, detection.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Windows offers several lateral-movement methods (PsExec, WMI, WinRM). Beyond availability, what practical factor distinguishes them for a tester?',
        options: [
          'Only PsExec can use stolen credentials',
          'Their noise/detectability differs — PsExec creates a service (loud, Event 7045), while WMI and WinRM are quieter with different parent-process signatures (WmiPrvSE, wsmprovhost) — so on a stealthy engagement a tester prefers quieter methods, and understanding each method’s footprint informs both the choice and the report',
          'WMI and WinRM cannot execute commands remotely',
          'They differ only in speed, not in detectability',
        ],
        answer: 1,
        explain:
          'All these methods can use harvested credentials (password, hash, or ticket) to execute code on a remote host, so the practical differentiator is their footprint. PsExec-style service creation is powerful (often yielding SYSTEM) but loud — it drops a binary to an admin share and creates a service (Event 7045, the defensive signature). WMI and WinRM are generally quieter, leaving different tells (parent processes WmiPrvSE.exe and wsmprovhost.exe respectively). On a stealthy engagement a tester chooses quieter methods and valid-credential authentication over exploits; on a thorough pentest, noise matters less. Understanding each method’s detection signature — which the defensive Windows track taught — informs both the operational choice and the report’s detection guidance, and the corresponding defences are LAPS, tiering, segmentation, limiting remote-exec, and detecting these signatures.',
        hint: 'They all run code remotely with credentials. What differs is how loud each is — which parent process and event does each leave?',
      },
    },

    {
      id: 'rwin-a-12',
      title: 'Project: an AD compromise chain',
      read: `Bring the level together into the exercise that consolidates Windows offensive fundamentals: take a vulnerable **Active Directory lab** and drive it from a low-privileged start to **Domain Admin**, chaining enumeration, initial access, local escalation, credential dumping, roasting, BloodHound-guided lateral movement, and reuse — thoroughly and with understanding.

## The exercise

Use a vulnerable AD lab (GOAD, a lab you build, or an authorized AD lab on Hack The Box / TryHackMe), from your attacker machine:

1. **Enumerate** — unauthenticated (Kerbrute user enum, SMB null sessions) then, once you have a credential, authenticated (nxc, LDAP, and **BloodHound/SharpHound** for the graph). Record everything.
2. **Initial access** — password spray the user list (respecting lockout), AS-REP roast for a no-credential foothold, capture a hash with Responder, or use a credential found in a share. Land a valid domain credential / foothold.
3. **Kerberoast** — request and crack service-account tickets; a cracked service account may be privileged (a jump toward DA).
4. **Local escalation** — on any host you land on, get SYSTEM (service misconfig, SeImpersonate/Potato, AlwaysInstallElevated — WinPEAS/PowerUp flag candidates; understand each).
5. **Dump credentials** — with SYSTEM, dump LSASS and the SAM; harvest hashes and tickets (understanding the stores and protections).
6. **Map the path** — use BloodHound to find the shortest path from what you own to Domain Admin.
7. **Move laterally** — follow the path with pass-the-hash/ticket and reuse (nxc, wmiexec, evil-winrm), escalating and harvesting at each host, until you reach a Domain Admin credential or compromise the DC.
8. **Reach Domain Admin** — demonstrate it (within the lab), and write it up.

## Do it professionally

- **Enumerate thoroughly** — BloodHound turns the maze into a route; a low-priv credential unlocks the whole map.
- **Credentials are the currency** — dump, crack, and **reuse** relentlessly; pass-the-hash/ticket is the movement engine.
- **Notes throughout** — the multi-step AD path is impossible to report accurately without them.
- **Understand every step** — enumeration, each escalation, each roast, each credential reuse. The understanding is the transferable skill and the basis of the report.
- **Stay authorized** — your lab or an authorized platform, always.

## The measure of success

You can take an authorized AD environment from a low-privileged start to Domain Admin by chaining the level's techniques — enumeration, a credential-based foothold, roasting, local escalation, credential dumping, BloodHound-guided lateral movement, and reuse — and produce an attack-path report a defender could act on.

> The level distilled: Windows offensive practice is a **credential-driven chain** — enumerate the domain (BloodHound), get a foothold (often a valid credential via spraying/roasting/capture, no exploit), escalate locally to SYSTEM (services/privileges), **dump credentials** (LSASS/SAM), and **reuse them** (pass-the-hash/ticket) along the BloodHound path, roasting Kerberos accounts for extra credentials, until Domain Admin. Enumeration is decisive, credentials are the currency, and each technique maps onto the Defensive Windows track (LAPS, Credential Guard, gMSA, tiering, detection). The intermediate/skilled levels deepen the AD attacks; this foothold-to-Domain-Admin chain, done thoughtfully and legally, is the offensive Windows core — and every link is a defensive fix waiting to be written.`,
      sample: {
        lang: 'text',
        caption: 'The AD compromise chain in a lab, notes-becoming-report',
        code: `[enum]      kerbrute -> user list; nxc null session -> shares; BloodHound graph
[access]    AS-REP roast asmith -> crack -> foothold (no credential needed)
[kerberoast] svc-sql -> crack 'Summer2024'; svc-sql = local admin on APP-07
[local esc] on the foothold host: SeImpersonate -> PrintSpoofer -> SYSTEM
[dump]      LSASS + SAM -> hashes + tickets (a cached admin!)
[path]      BloodHound: owned -> svc-sql -> APP-07 -> da-alice session -> DA
[lateral]   PtH svc-sql -> APP-07; dump da-alice's ticket (PtT)
[objective] Domain Admin -> proof of domain compromise
[report]    path diagram + findings (AS-REP flag, weak svc pw, SeImpersonate,
            reuse, DA session) + remediation + choke point (tiering)`,
        output: `Enumerate (BloodHound) -> foothold (AS-REP roast, no exploit) ->
Kerberoast -> local escalation (SeImpersonate) -> dump creds ->
BloodHound path -> pass-the-hash/ticket lateral -> Domain Admin.
A credential-driven chain, notes throughout, every step understood,
in the lab. Enumeration decisive, credentials the currency. Each
link maps to a defensive fix - the offensive Windows core.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Across the AD compromise chain, what single theme most defines Windows offensive practice?',
        options: [
          'Finding one critical exploit on the domain controller',
          'It is credential-driven — enumeration (via BloodHound) reveals the path, footholds often come from valid credentials rather than exploits, and progress to Domain Admin is made by dumping and reusing credential material (pass-the-hash/ticket, roasting, reuse) along the graph, so credentials are the currency that chains the whole compromise together',
          'Scanning ports faster than the defender can respond',
          'Avoiding enumeration to stay stealthy',
        ],
        answer: 1,
        explain:
          'Unlike Linux engagements that often turn on host/service exploits, the Windows/AD chain is fundamentally about credentials: BloodHound enumeration reveals the relationship path to Domain Admin; the foothold is frequently a valid credential obtained by spraying, AS-REP roasting, hash capture, or a share — no exploit needed; and every step of progress comes from dumping credential material (LSASS/SAM) and reusing it directly (pass-the-hash/ticket) or cracking it (Kerberoasting), walking the graph until a Domain Admin credential is reached. Credentials are the currency that links enumeration, escalation, and lateral movement into a single chain, which is exactly why the defensive Windows track concentrated on protecting and de-reusing credential material (Credential Guard, LAPS, gMSA, tiering) alongside BloodHound-driven path removal.',
        hint: 'Do Windows engagements chain together via one big exploit, or via stealing and reusing credentials along the graph?',
      },
    },
  ],
}

export default level
