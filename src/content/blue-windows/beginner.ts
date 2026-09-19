import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'The defender’s Windows — from zero',
  summary:
    'Assumes no security background. Learn the Windows security model — accounts and SIDs, UAC, NTFS permissions, the Registry, PowerShell, services and the Event Log — plus the built-in defences (Defender, firewall, updates). The foundation for defending the world’s most-attacked desktop and server OS.',
  outcomes: [
    'Set up a safe Windows lab to practise in',
    'Understand Windows accounts, groups, SIDs and UAC',
    'Read NTFS permissions and the Registry’s run keys',
    'Use PowerShell to inspect processes, services and the system',
    'Find security events in the Windows Event Log',
    'Use Defender, the firewall and Windows Update as a defender',
  ],
  steps: [
    {
      id: 'bwin-b-01',
      title: 'Why Windows, and the rules first',
      read: `Windows runs most desktops and a huge share of business servers, so it is the most-attacked platform on earth. Defending it is where a great deal of real blue-team work happens. This track assumes **no security background** and builds up.

Everything is still measured against the **CIA triad** — Confidentiality, Integrity, Availability — you met in the Linux track. Windows just has its own security model for enforcing them.

## The rule before anything else

You only ever practise on systems **you own or have explicit written permission to test**. This whole track is built around your own machine or a virtual machine you create. Accessing someone else's computer without authorization is a crime almost everywhere — the Computer Fraud and Abuse Act (US), the Computer Misuse Act (UK), and equivalents. Keep everything you do here on your own turf.

## How Windows thinks about security

Three ideas underpin the whole model, and everything later builds on them:

- **Security principals** — users, groups and computers, each identified by a unique **SID** (Security Identifier). Windows makes decisions about SIDs, not names.
- **Access tokens** — when you log on, Windows builds a token listing your SID and your groups' SIDs and privileges. Every action you take carries that token.
- **Securable objects** — files, registry keys, services and more each have a **security descriptor** saying which SIDs may do what. Access = "does your token allow this action on this object's descriptor?"

Hold those three in mind and Windows security stops feeling like a maze of dialog boxes and starts making sense.`,
      sample: {
        lang: 'text',
        caption: 'The Windows access decision, in plain terms',
        code: `You log on  ->  Windows builds your ACCESS TOKEN:
    SID: S-1-5-21-...-1103  (you)
    Groups: Users, Remote Desktop Users
    Privileges: SeShutdownPrivilege, ...

You open  C:\\Reports\\q3.xlsx  ->  Windows checks the file's
    SECURITY DESCRIPTOR (its list of who-can-do-what)
    against the SIDs in your token.

    Your SID allowed to Read?  -> yes -> access granted
    Allowed to Write?          -> no  -> save is denied`,
        output: `Access is always: does THIS token permit THIS action on
THIS object? Names are for humans; Windows decides on SIDs.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the Windows security model, what does Windows actually use to identify a user or group when making an access decision?',
        options: [
          'The account’s display name',
          'A unique Security Identifier (SID) carried in the user’s access token',
          'The user’s password',
          'The computer’s IP address',
        ],
        answer: 1,
        explain:
          'Windows decides access on **SIDs**, not names. At logon it builds an access token listing your SID and your groups’ SIDs; every object has a security descriptor listing which SIDs get which rights. This is why renaming an account does not change its access — the SID stays the same — and why understanding SIDs is foundational.',
        hint: 'Names are for people; Windows compares something unique and numeric.',
      },
    },

    {
      id: 'bwin-b-02',
      title: 'A safe Windows lab',
      read: `As on Linux, never learn on a machine that matters. You want a Windows you can break, infect and reset without risk.

## Getting one

- **A virtual machine** is the proper lab. Install **VirtualBox** or **VMware** (free tiers exist), then a Windows VM inside it. Microsoft publishes **free evaluation and developer VMs** (search "Windows 11 development environment VM" and "Windows Server evaluation") that are legitimate for learning.
- **Snapshots** are your safety net — exactly as on Linux. Snapshot the clean VM, experiment, roll back in seconds if you wreck it. Take one before anything risky.
- **Isolate it.** For anything involving malware samples, set the VM's network to host-only or disconnected, so nothing escapes to your real network.

## Built-in defences are on by default

Modern Windows ships defended: **Microsoft Defender Antivirus**, **Windows Firewall**, **SmartScreen**, and **User Account Control (UAC)** are all on out of the box. A defender's job is often not to add tools but to *understand and correctly configure* what is already there — and to notice when something has turned them off (a classic attacker move).

## Two ways to drive Windows

- **The GUI** — Settings, Control Panel, Event Viewer, Task Manager. Fine for learning where things are.
- **PowerShell** — the command line that lets you inspect and configure everything, scriptably. This is the defender's real tool, and this track leans on it. Open it as **Administrator** (right-click → Run as administrator) when a task needs elevation.`,
      sample: {
        lang: 'powershell',
        caption: 'Confirming your lab and that the built-in defences are on',
        code: `# who am I, and on what build?
whoami
Get-ComputerInfo -Property WindowsProductName, OsVersion

# are the built-in defences running?
Get-MpComputerStatus | Select AntivirusEnabled, RealTimeProtectionEnabled
Get-NetFirewallProfile | Select Name, Enabled`,
        output: `desktop-lab\\student
WindowsProductName : Windows 11 Enterprise Evaluation
OsVersion          : 10.0.22631

AntivirusEnabled RealTimeProtectionEnabled
---------------- -------------------------
            True                      True

Name    Enabled
----    -------
Domain     True
Private    True
Public     True`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a virtual machine with snapshots, and network isolation, the right place to study Windows attacks and malware?',
        options: [
          'VMs are immune to malware',
          'You can safely run risky things, observe them, and roll back to a clean state instantly, while isolation stops anything escaping to your real network',
          'Only VMs can run PowerShell',
          'Snapshots encrypt the disk',
        ],
        answer: 1,
        explain:
          'Isolation plus instant rollback is exactly what studying attacks needs: detonate something, watch what it does to the system, then revert. Host-only or disconnected networking keeps a live sample from reaching machines that matter. A snapshot is a saved clean state, not a security control against a real attacker.',
        hint: 'What lets you detonate something dangerous and undo it, without risking your network?',
      },
    },

    {
      id: 'bwin-b-03',
      title: 'Accounts, groups and UAC',
      read: `Windows access hinges on **who you are** and **how much power that identity holds**.

## Account types

- **Standard user** — can run programs and use their own files, but cannot change system settings or other users' data. Most people should work here every day.
- **Administrator** — full control of the machine. The built-in \`Administrator\` account is the Windows equivalent of root and is disabled by default on modern Windows for good reason.
- **Local vs domain** — a **local** account exists only on that one machine; a **domain** account is managed centrally by Active Directory (covered later) and works across many machines.

## Key built-in groups

- **Administrators** — members have full control. Membership here is the thing attackers want and defenders audit.
- **Users** — ordinary, limited.
- Powerful groups to watch: **Backup Operators**, **Remote Desktop Users**, and later, in AD, **Domain Admins**.

## UAC — why admins still see prompts

**User Account Control** means that even when you are an administrator, your programs run with a *standard* token by default. When something needs admin power, UAC prompts you to consent (or a standard user to enter admin credentials), and *only then* is the powerful token used. This is **least privilege on Windows**: you hold admin rights but do not wield them constantly, so a rogue program in your normal session cannot silently reconfigure the system. An attacker's goal is to get around UAC ("UAC bypass"); a defender keeps it at its highest setting and treats surprise prompts as a warning.`,
      sample: {
        lang: 'powershell',
        caption: 'Who has admin power on this box, and my own privileges',
        code: `# members of the local Administrators group — audit this
Get-LocalGroupMember -Group "Administrators"

# is the built-in Administrator account enabled? (it should be No)
Get-LocalUser -Name "Administrator" | Select Name, Enabled`,
        output: `ObjectClass Name                      PrincipalSource
----------- ----                      ---------------
User        DESKTOP-LAB\\student       Local
User        DESKTOP-LAB\\Administrator Local
User        DESKTOP-LAB\\support       Local   <- who added this?

Name          Enabled
----          -------
Administrator   False   <- good: built-in admin stays disabled`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You are logged in as an administrator, yet Windows still prompts you (UAC) before making a system change. What is the security benefit?',
        options: [
          'It slows attackers down by being annoying',
          'Your programs run with a limited standard token by default, and the powerful admin token is only used after you consent — so a rogue program in your session cannot silently make administrative changes',
          'UAC encrypts your files',
          'It disables the Administrator account',
        ],
        answer: 1,
        explain:
          'UAC gives even admins a split token: standard by default, elevated only on explicit consent. That is least privilege — you are not wielding full admin power every moment, so malware that runs as you cannot quietly reconfigure the system without triggering the prompt. Keeping UAC at its highest level and being suspicious of unexpected prompts is basic Windows hygiene.',
        hint: 'What token do your programs use before you click "Yes", and what does that limit?',
      },
    },

    {
      id: 'bwin-b-04',
      title: 'NTFS permissions',
      read: `Windows files live on **NTFS**, which attaches an **Access Control List (ACL)** to every file and folder — the security descriptor from step 1, made concrete. Reading ACLs is the Windows equivalent of reading \`ls -l\`.

## The pieces of an ACL

- **ACEs** (Access Control Entries) — each grants or denies a specific SID a specific right.
- **Rights** — Read, Write, Read & Execute, Modify, and **Full Control** (everything, including changing the ACL itself).
- **Inheritance** — folders pass their permissions down to new files inside them, so you usually set permissions on a folder and let them flow.

## Reading them

\`Get-Acl\` shows the ACL; \`icacls\` is the classic command-line tool. Watch especially for:

- **Everyone** or **Authenticated Users** with **Modify/Full Control** on something sensitive — often too open.
- **Users** able to write to program folders (\`C:\\Program Files\\...\`) — a path for an attacker to replace a trusted executable.

## Deny wins, and Full Control is dangerous

Two rules matter for a defender:

1. An explicit **Deny** ACE overrides any Allow. Useful, but overused Deny ACEs make permissions hard to reason about.
2. **Full Control** includes the right to *change the permissions*. Give a user Full Control of a file and they can re-grant themselves anything later — so prefer **Modify** over Full Control unless someone genuinely needs to manage the ACL.

## Share vs NTFS permissions

Files reached over the network pass through **two** gates: the **share** permissions and the **NTFS** permissions, and the *most restrictive* of the two wins. A common misconfiguration is a share set to "Everyone – Full Control" that people think is safe because NTFS is tighter — a fragile arrangement worth flagging.`,
      sample: {
        lang: 'powershell',
        caption: 'Reading an ACL and spotting an over-broad grant',
        code: `(Get-Acl C:\\Reports\\q3.xlsx).Access |
  Select IdentityReference, FileSystemRights, AccessControlType`,
        output: `IdentityReference        FileSystemRights AccessControlType
-----------------        ---------------- -----------------
BUILTIN\\Administrators   FullControl      Allow
DESKTOP-LAB\\student      Modify           Allow
Everyone                 Modify           Allow   <- too open!
                                                     everyone can edit it`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should you usually grant a user "Modify" rather than "Full Control" on a file, even when they need to edit it?',
        options: [
          'Modify is faster',
          'Full Control includes the right to change the file’s permissions (the ACL itself), so a user with Full Control could later re-grant themselves or others any access — Modify lets them edit the content without controlling who else can',
          'Modify allows deletion but Full Control does not',
          'There is no difference',
        ],
        answer: 1,
        explain:
          'Full Control is a superset that includes "change permissions" and "take ownership". A user with it can rewrite the ACL — a privilege-escalation and persistence risk. Modify covers read/write/delete of the content without the power to alter who has access, which is what editing a file actually requires. Least privilege: grant the right needed, not the biggest one.',
        hint: 'What extra power does Full Control include beyond reading and writing the content?',
      },
    },

    {
      id: 'bwin-b-05',
      title: 'The Registry',
      read: `The **Registry** is Windows' central hierarchical database of settings — for the OS, for hardware, and for installed software. There is no single \`/etc\` on Windows; the Registry is where most configuration lives, so defenders must know it.

## Structure

- **Hives** (top-level roots):
  - \`HKEY_LOCAL_MACHINE\` (**HKLM**) — settings for the whole machine.
  - \`HKEY_CURRENT_USER\` (**HKCU**) — settings for the logged-on user.
- **Keys** are like folders; **values** are the settings inside them (with a name, a type, and data).

## Why attackers love it, so defenders watch it

The Registry is a favourite place for **persistence** — making malware run automatically. The classic spots (**"Run keys"**):

\`\`\`
HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
\`\`\`

Anything listed here runs at logon. Malware adds a value pointing at itself; a defender checks these keys and asks "should this be here?" Other abused areas include services, and keys that weaken security settings (e.g. disabling Defender).

## Reading it safely

Use \`reg query\` or PowerShell's \`Get-ItemProperty\` to read. Editing the Registry can break Windows, so on a real box you read first, change deliberately, and back up a key (\`reg export\`) before altering it. On your lab VM, snapshot first and experiment freely.`,
      sample: {
        lang: 'powershell',
        caption: 'Checking a classic persistence location for the unexpected',
        code: `Get-ItemProperty "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" |
  Format-List
Get-ItemProperty "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" |
  Format-List`,
        output: `SecurityHealth : C:\\Windows\\System32\\SecurityHealthSystray.exe
OneDrive       : "C:\\Users\\student\\AppData\\...\\OneDrive.exe"
Updater        : C:\\Users\\student\\AppData\\Roaming\\svch0st.exe  <- suspicious:
                 misspelled name, in a user AppData folder, unknown`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do defenders regularly inspect Registry "Run" keys such as `HKLM\\...\\CurrentVersion\\Run`?',
        options: [
          'They store user passwords',
          'Programs listed there run automatically at logon, so it is a favourite spot for malware to establish persistence — an unexpected entry (especially pointing to an odd path or misspelled name) is a red flag',
          'They control the screen resolution',
          'They speed up the boot process',
        ],
        answer: 1,
        explain:
          'Run keys auto-launch whatever they list every time the user logs on, which makes them a top **persistence** mechanism. Malware drops a value here so it survives reboots. Checking these keys — and questioning entries pointing to user AppData folders, temp directories, or names impersonating system files (like `svch0st.exe`) — is a core Windows hunting step.',
        hint: 'What happens to a program whose path is listed in a Run key, every time you log on?',
      },
    },

    {
      id: 'bwin-b-06',
      title: 'PowerShell for defenders',
      read: `**PowerShell** is the defender's primary Windows tool. Unlike a classic shell that passes text around, PowerShell passes **objects** — so you can filter and select real properties instead of scraping strings.

## Cmdlets

Commands are **Verb-Noun**: \`Get-Process\`, \`Get-Service\`, \`Get-LocalUser\`, \`Stop-Service\`. The consistent naming means you can often guess a command. \`Get-Help\` and \`Get-Command\` help you find them.

## The pipeline passes objects

\`\`\`
Get-Process | Where-Object CPU -gt 100 | Sort-Object CPU -Descending
\`\`\`

"Get the processes, keep those using more than 100 CPU-seconds, sort by CPU." Because these are objects, \`CPU\` is a real property, not a column you had to \`awk\` out.

## The workhorses

- \`Get-*\` — inspect anything (processes, services, users, event logs, files).
- \`Where-Object\` (\`?\`) — filter.
- \`Select-Object\` (\`select\`) — pick properties.
- \`Sort-Object\` — order.
- \`Format-List\` / \`Format-Table\` — display.
- \`Export-Csv\` — save results for evidence.

## A note on execution policy

PowerShell's **execution policy** governs whether scripts can run; it is a safety and administration feature, **not** a security boundary (an attacker can bypass it trivially with a flag). Do not mistake it for real protection — it stops accidents, not adversaries. Real defence comes from the controls in the rest of this track, not from execution policy alone.`,
      sample: {
        lang: 'powershell',
        caption: 'Objects in the pipeline: top CPU consumers, as data',
        code: `Get-Process |
  Sort-Object CPU -Descending |
  Select-Object -First 4 Name, Id, CPU, Path`,
        output: `Name       Id   CPU Path
----       --   --- ----
chrome   4820 812.4 C:\\Program Files\\Google\\Chrome\\...
svch0st  6112 640.1 C:\\Users\\student\\AppData\\Roaming\\svch0st.exe
MsMpEng  1240  95.2 C:\\ProgramData\\Microsoft\\Windows Defender\\...
explorer 3300  44.8 C:\\Windows\\explorer.exe`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'PowerShell’s execution policy prevents scripts from running unless configured. Is it a reliable security boundary against an attacker?',
        options: [
          'Yes — it stops all malicious scripts',
          'No — it is an administrative/safety feature to prevent accidental script execution, and an attacker can bypass it trivially (e.g. a command-line flag), so it must not be relied on as real protection',
          'Yes — attackers cannot run PowerShell at all',
          'It encrypts scripts so they cannot be read',
        ],
        answer: 1,
        explain:
          'Execution policy exists to stop users double-clicking a script by accident and to enforce administrative preference. It is documented as **not** a security control: `-ExecutionPolicy Bypass`, piping to `powershell -`, or other trivial tricks defeat it. Treat it as guard-rails against mistakes, and get real protection from Defender, application control, logging and least privilege.',
        hint: 'If a single command-line flag turns it off, how strong a boundary is it against someone deliberate?',
      },
    },

    {
      id: 'bwin-b-07',
      title: 'Processes and services',
      read: `To spot an intrusion you must know what is running and what *should* be running.

## Processes

- \`Get-Process\` (or Task Manager) lists running programs with their PID, CPU/memory and, importantly, their **path**.
- The defender's questions: Where does it run from? A legitimate \`svchost.exe\` lives in \`C:\\Windows\\System32\`; one in a user's AppData folder is an impostor. What is its **parent**? \`winword.exe\` (Word) spawning \`powershell.exe\` is a classic malicious document.
- Know the real system processes — \`System\`, \`smss.exe\`, \`csrss.exe\`, \`wininit.exe\`, \`services.exe\`, \`lsass.exe\`, \`svchost.exe\`, \`explorer.exe\` — and their normal parents and paths. Impostors imitate these names.

## Services

A **service** is a background program that Windows starts automatically, often before anyone logs on — the Windows equivalent of a Linux daemon. \`Get-Service\` lists them; \`Get-CimInstance Win32_Service\` also shows each service's **binary path** and the **account** it runs as.

Defenders check services for:

- A service whose **binary path** points somewhere odd (a temp folder, a user profile) — a common persistence trick.
- A service running as **LocalSystem** (the most powerful account) that does not need to.
- New or renamed services that impersonate real ones.

## Why this is core

Attackers must run code and often want it to survive reboots, so they appear as processes and install as services. Building a mental baseline of "normal" on your own machine is what makes the abnormal jump out later — the same instinct as on Linux, with Windows-specific tells.`,
      sample: {
        lang: 'powershell',
        caption: 'A service with a suspicious binary path',
        code: `Get-CimInstance Win32_Service |
  Where-Object { $_.PathName -notlike "C:\\Windows\\*" -and
                 $_.PathName -notlike '"C:\\Program Files*' } |
  Select-Object Name, StartName, PathName | Format-List`,
        output: `Name     : WinDefragSvc
StartName: LocalSystem
PathName : C:\\Users\\student\\AppData\\Local\\Temp\\wds.exe
# A "service" running as the all-powerful LocalSystem, from a
# Temp folder, with a name imitating a real one: textbook
# persistence. No legitimate service lives in Temp.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You see a process named `svchost.exe` running from `C:\\Users\\student\\AppData\\Roaming\\`. Why is that suspicious?',
        options: [
          'svchost.exe uses too much memory',
          'The genuine svchost.exe runs from C:\\Windows\\System32; a copy running from a user’s AppData folder is an impostor using a trusted name to blend in — a common malware technique',
          'svchost.exe should never run at all',
          'AppData folders cannot contain programs',
        ],
        answer: 1,
        explain:
          'Malware often names itself after core Windows processes (svchost, lsass, services) to hide in a busy process list. The tell is the **path**: the real svchost.exe lives in System32, so one in AppData, Temp, or a user profile is masquerading. Knowing the correct home of the key system processes turns "another svchost" into "an impostor".',
        hint: 'Where does the *real* svchost.exe live, and is AppData that place?',
      },
    },

    {
      id: 'bwin-b-08',
      title: 'The Windows Event Log',
      read: `Windows records what happens in the **Event Log** — the equivalent of \`/var/log\`, but structured. Reading it is central to Windows defence.

## Where events live

- **Security** log — logons, privilege use, account changes. The defender's primary hunting ground.
- **System** log — services, drivers, hardware, the OS itself.
- **Application** log — apps and their errors.
- Plus many specialised logs under **Applications and Services Logs** (PowerShell, Windows Defender, Task Scheduler, and more).

You read them in **Event Viewer** (GUI) or with PowerShell's \`Get-WinEvent\` (powerful) and the older \`Get-EventLog\`.

## Events are numbered

Each event type has an **Event ID**. A handful you will use constantly:

- **4624** — a successful logon. (The **Logon Type** matters: 2 = interactive/at the keyboard, 3 = network, 10 = Remote Desktop.)
- **4625** — a *failed* logon. A flood of these is a brute-force attempt.
- **4720** — a user account was created.
- **4732 / 4728** — a member was added to a security group (e.g. Administrators).
- **4688** — a new process was created (superb for spotting malicious execution, once enabled).
- **1102** — the Security log was cleared (attackers do this to hide; the act itself is an event).

## The instinct

As on Linux, you go to the logs to answer specific questions: Who logged in, from where, and did it succeed? Did anyone get added to Administrators? Was the log cleared? \`Get-WinEvent\` with a filter turns thousands of events into the answer.`,
      sample: {
        lang: 'powershell',
        caption: 'Counting failed logons (4625) to spot a brute-force',
        code: `Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=4625 } |
  Group-Object { $_.Properties[19].Value } |   # source IP
  Sort-Object Count -Descending |
  Select-Object Count, Name -First 3`,
        output: `Count Name            (source of failed logons)
----- ----
  742 203.0.113.9     <- 742 failures from one IP: brute-force
   58 198.51.100.4
    3 192.168.1.50`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the Windows Security log, a sudden burst of Event ID 4625 events from a single source most likely indicates what?',
        options: [
          'Normal successful logons',
          'A brute-force / password-guessing attack — 4625 is a failed logon, so many of them from one source is repeated failed attempts to authenticate',
          'The account was deleted',
          'A software update installed',
        ],
        answer: 1,
        explain:
          '4625 is a **failed** logon (4624 is success). A flood of 4625s from one IP or against one account is the signature of a brute-force or password-spray attempt. Watching failed-logon volume — and noticing when it succeeds (a 4624 after many 4625s) — is a fundamental Windows detection, the direct parallel to grepping "Failed password" on Linux.',
        hint: '4624 is success; what is 4625, and what does a burst of them mean?',
      },
    },

    {
      id: 'bwin-b-09',
      title: 'Defender, firewall and SmartScreen',
      read: `Windows ships with capable built-in defences. A defender's job is to keep them on, configured well, and to notice when something disables them.

## Microsoft Defender Antivirus

Real-time protection that scans files and behaviour. Manage and inspect it with the \`*-Mp*\` cmdlets (\`Get-MpComputerStatus\`, \`Get-MpThreat\`, \`Start-MpScan\`). Key points:

- **Real-time protection** should be **on**. Malware routinely tries to disable it — \`Get-MpComputerStatus\` showing it off (without a good reason) is itself a finding.
- **Exclusions** (\`Get-MpPreference | Select Exclusion*\`) tell Defender to ignore certain paths. Attackers add exclusions for their own folder so their malware is never scanned — always audit the exclusion list.
- Signatures should be **current**; an out-of-date engine misses recent threats.

## Windows Firewall

Controls network traffic per **profile** (Domain / Private / Public). Inspect with \`Get-NetFirewallProfile\` and \`Get-NetFirewallRule\`. Defenders want it **enabled on all profiles**, with a **default-deny inbound** stance and only the needed rules allowed — the same "least exposure" idea as \`ufw\` on Linux.

## SmartScreen

Warns before running downloaded programs and visiting known-malicious sites, using Microsoft's reputation data. It is a useful layer against users being tricked into launching malware.

## The recurring lesson

Much of Windows defence is **configuration and vigilance over these built-ins**, not buying add-ons. And a very common early sign of compromise is a defence that has been **switched off or excluded** — so checking that Defender, its exclusions, and the firewall are in the expected state is a routine, high-value check.`,
      sample: {
        lang: 'powershell',
        caption: 'Auditing Defender — including the exclusions attackers abuse',
        code: `Get-MpComputerStatus |
  Select AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureAge
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath`,
        output: `AntivirusEnabled RealTimeProtectionEnabled AntivirusSignatureAge
---------------- ------------------------- --------------------
            True                      True                    1

C:\\Users\\student\\AppData\\Roaming\\svc   <- suspicious exclusion:
                                            malware often excludes
                                            its own folder`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'While auditing Defender you find a scan exclusion for `C:\\Users\\student\\AppData\\Roaming\\svc`. Why is an unexpected exclusion a red flag?',
        options: [
          'Exclusions make Defender run faster and are always fine',
          'An exclusion tells Defender to ignore that path, so malware in it is never scanned or blocked — attackers add exclusions for their own folder, making an unexplained one a sign of compromise',
          'Exclusions delete the files in that folder',
          'Exclusions only affect scheduled scans',
        ],
        answer: 1,
        explain:
          'A scan exclusion is a blind spot by design. Attackers who gain enough rights add an exclusion for their working directory so their tools run unmolested by Defender. An exclusion nobody can account for — especially pointing at a user AppData/Temp folder — is a strong indicator that something turned off the guard, and warrants investigating what lives there.',
        hint: 'What does Defender do with files in an excluded path, and who benefits from that?',
      },
    },

    {
      id: 'bwin-b-10',
      title: 'Patching Windows',
      read: `As on every platform, the most common way real Windows systems get breached is an **unpatched known vulnerability**. Keeping Windows and its software current is the highest-value, most boring thing a defender does.

## Windows Update

- Delivers OS and Microsoft security fixes, typically on **"Patch Tuesday"** (the second Tuesday each month), plus out-of-band emergency fixes for serious flaws.
- Check state and history in Settings → Windows Update, or with PowerShell/tools. \`Get-HotFix\` lists installed updates and when.
- In organisations, updates are managed centrally (WSUS, Intune, or similar) so patching is consistent and reportable — the Windows parallel to config-management on Linux.

## Beyond the OS

Windows Update covers Windows and Microsoft products, but **third-party software** (browsers, Java, PDF readers, and countless apps) is a huge part of the real attack surface and needs its own patching. Attackers exploit an outdated Chrome or Acrobat just as happily as an outdated Windows. A complete patch strategy covers third-party apps too.

## Reduce the surface, as always

The Linux lesson holds here: run less software, and keep what you run current. Uninstall applications and disable Windows features you do not use — every one is code that can carry a vulnerability. A patched, minimal Windows is a smaller target.

## Why "installed but not rebooted" matters

Many Windows updates only take full effect after a **reboot**. A machine that has downloaded and staged patches but not restarted may still be vulnerable. "Are we patched?" includes "and have the pending-reboot machines actually rebooted?" — a genuinely common gap.`,
      sample: {
        lang: 'powershell',
        caption: 'What is installed, and whether a reboot is still pending',
        code: `Get-HotFix | Sort-Object InstalledOn -Descending | Select -First 3

# is a reboot pending (so staged patches are not yet fully applied)?
$cbs = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Component Based Servicing"
Test-Path "$cbs\\RebootPending"`,
        output: `Source     Description  HotFixID   InstalledOn
------     -----------  --------   -----------
DESKTOP    Security     KB5039212  6/12/2024
DESKTOP    Update       KB5037771  5/15/2024

True    <- a reboot is pending: patches are NOT fully applied yet`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A Windows machine shows recent security updates as downloaded and installed, but a reboot is pending. Is it fully protected?',
        options: [
          'Yes — once installed, updates are always active',
          'Not necessarily — many Windows patches only take full effect after a reboot, so a machine with pending-reboot updates can still be exposed to the vulnerabilities those patches fix until it restarts',
          'Reboots have no effect on patching',
          'Only third-party apps need reboots',
        ],
        answer: 1,
        explain:
          'Windows frequently stages update files and only completes the change on restart. A "pending reboot" state means the fix is not fully live, so the vulnerability may still be exploitable. This is a common real-world gap: patches "installed" per the dashboard, but machines never rebooted. Verifying reboots complete is part of confirming you are actually patched.',
        hint: 'What has to happen after many Windows updates before the fix is truly in effect?',
      },
    },

    {
      id: 'bwin-b-11',
      title: 'Hardening accounts and logon',
      read: `A large share of real Windows compromises come down to **accounts**: weak passwords, too many admins, and abused remote access. Tightening these is cheap and high-impact.

## Passwords and accounts

- Enforce **strong, long passwords** (and, wherever possible, **multi-factor authentication**). Length beats complexity — a long passphrase resists guessing better than a short mangled word.
- **Least privilege for people** — everyday accounts should be **standard users**, not administrators. Admin rights only when a task needs them (that is what UAC assumes).
- **Fewer admins** — every member of the Administrators (and later Domain Admins) group is a key to the kingdom. Audit membership and remove what is not needed.
- **Disable, don't just ignore, unused accounts** — a dormant, enabled account with an old password is an easy way in. \`Disable-LocalUser\` for leavers and stale accounts.

## Account lockout

An **account lockout policy** temporarily locks an account after several failed attempts, blunting brute-force attacks. It is a balance — too aggressive and you invite a denial-of-service (an attacker locking everyone out); too loose and guessing succeeds. Sensible thresholds plus monitoring of 4625/lockout events is the defensive combination.

## Remote Desktop (RDP)

RDP is a top target: attackers scan the internet for exposed RDP and brute-force it constantly. If you must use it: never expose it directly to the internet (put it behind a VPN), require MFA, limit who is in **Remote Desktop Users**, and monitor logon type 10 events. An open, internet-facing RDP with a weak password is one of the most common ways ransomware crews get in.

## The theme

None of this needs extra products. Strong authentication, least privilege, disabling what is unused, and not exposing remote access to the internet — done consistently — prevent a large fraction of real attacks.`,
      sample: {
        lang: 'powershell',
        caption: 'Finding stale enabled accounts and who can use RDP',
        code: `# enabled accounts that have never (or long-ago) logged on
Get-LocalUser | Where-Object Enabled |
  Select Name, Enabled, LastLogon

# who is allowed to Remote Desktop in?
Get-LocalGroupMember -Group "Remote Desktop Users"`,
        output: `Name       Enabled LastLogon
----       ------- ---------
student       True 6/18/2024
support       True 2/02/2023   <- enabled, unused 16 months: disable it
Administrator False

ObjectClass Name                 PrincipalSource
----------- ----                 ---------------
User        DESKTOP-LAB\\student  Local
User        DESKTOP-LAB\\support  Local   <- should support have RDP?`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is exposing Remote Desktop (RDP) directly to the internet with password-only logon considered one of the most dangerous common misconfigurations?',
        options: [
          'RDP uses too much bandwidth',
          'Attackers continuously scan for and brute-force internet-facing RDP, so a directly exposed, password-only endpoint is a prime entry point — frequently the initial access for ransomware; it should be behind a VPN, require MFA, and be tightly restricted',
          'RDP cannot be encrypted',
          'RDP only works on servers',
        ],
        answer: 1,
        explain:
          'Internet-facing RDP is relentlessly scanned and brute-forced, and stolen or guessed RDP credentials are a leading initial-access vector for ransomware. The defenses are structural: do not expose it directly (require a VPN first), enforce MFA, restrict Remote Desktop Users membership, and monitor Type-10 logons. Password-only, internet-facing RDP combines maximum exposure with weak authentication.',
        hint: 'What are attackers constantly scanning the internet for, and what do stolen RDP creds often lead to?',
      },
    },

    {
      id: 'bwin-b-12',
      title: 'Project: a Windows host checkup',
      read: `Put the level together into a PowerShell "is this box healthy and who is on it?" checkup — the Windows sibling of the Linux \`checkup.sh\`. Every command here uses something from this level.

The routine, and what each part answers:

1. **Who am I / who exists?** — \`whoami\`, \`Get-LocalUser\`.
2. **Who has admin power?** — members of Administrators.
3. **Who is logged on now, and recent logon failures?** — Event IDs 4624 / 4625.
4. **What is running, and from where?** — processes and their paths (impostors in AppData/Temp).
5. **What persists at logon?** — the Run keys.
6. **Any odd services?** — services whose binary path is outside Windows/Program Files.
7. **Are the defences on?** — Defender real-time protection, exclusions, firewall profiles.
8. **Are we patched?** — recent hotfixes and any pending reboot.

Run it on your lab VM. As on Linux, the point is not the individual commands — it is building the **habit** of asking these questions and knowing what a normal answer looks like, so an abnormal one stands out. That baseline in your head is the start of real detection.

> Save it as a \`.ps1\` script, keep it somewhere only admins can edit, and run it when you sit down at a box. You have written your first Windows defensive tool — and you now understand the security model underneath every finding it reports.`,
      sample: {
        lang: 'powershell',
        caption: 'checkup.ps1 — a first Windows defensive script',
        code: `Write-Host "== identity =="; whoami
Write-Host "== local admins =="
Get-LocalGroupMember Administrators | Select Name
Write-Host "== failed logons (24h) =="
(Get-WinEvent -FilterHashtable @{LogName='Security';Id=4625;
  StartTime=(Get-Date).AddDays(-1)} -EA SilentlyContinue).Count
Write-Host "== processes outside System32/Program Files =="
Get-Process | Where-Object { $_.Path -and
  $_.Path -notlike "C:\\Windows\\*" -and
  $_.Path -notlike "C:\\Program Files*" } | Select Name, Path
Write-Host "== Run keys =="
Get-ItemProperty "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
Write-Host "== Defender =="
Get-MpComputerStatus | Select RealTimeProtectionEnabled
Get-MpPreference | Select -Expand ExclusionPath`,
        output: `== local admins ==
student
support           <- unexpected admin?
== failed logons (24h) ==
742               <- brute-force volume
== processes outside System32/Program Files ==
svch0st  C:\\Users\\student\\AppData\\Roaming\\svch0st.exe
== Defender ==
RealTimeProtectionEnabled : True
C:\\Users\\student\\AppData\\Roaming\\svc   <- malware's own exclusion`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your checkup shows an unexpected admin account, 742 failed logons in 24h, `svch0st.exe` running from AppData, and a Defender exclusion for that same folder. What is the most reasonable read?',
        options: [
          'Four unrelated, harmless quirks',
          'A coordinated compromise: active brute-forcing, a masquerading malicious process, a Defender blind spot the attacker created for it, and a backdoor admin account — investigate as one incident and respond, do not dismiss any single finding',
          'Only the failed logons matter',
          'Reboot and ignore it',
        ],
        answer: 1,
        explain:
          'The findings reinforce each other: the failed-logon flood is the attack, `svch0st.exe` in AppData is the payload masquerading as a system process, the matching Defender exclusion is the attacker blinding the AV to their folder, and the extra admin account is persistence. Together they describe one intrusion. The value of the checkup habit is surfacing this whole picture in minutes — then you contain, preserve and eradicate, as in the IR process.',
        hint: 'Do the findings point the same way and support each other? What does the matching exclusion tell you about the process?',
      },
    },
  ],
}

export default level
