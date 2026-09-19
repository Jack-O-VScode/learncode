import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'The deep end: advanced AD attack and defence',
  summary:
    'The frontier of Windows defence: AD Certificate Services abuse, coerced authentication and NTLM relay, advanced delegation attacks, stealthy domain persistence, EDR/telemetry evasion and how to catch it, behavioural analytics, identity threat detection across hybrid/cloud, adversary emulation, and recovering trust after a full domain compromise.',
  outcomes: [
    'Understand and defend AD Certificate Services (ESC) attacks',
    'Detect coerced authentication and NTLM relay chains',
    'Recognise advanced delegation and stealthy persistence',
    'Detect EDR/telemetry evasion (AMSI, ETW, BYOVD)',
    'Apply behavioural analytics and identity threat detection',
    'Emulate real adversaries and recover from domain compromise',
  ],
  steps: [
    {
      id: 'bwin-p-01',
      title: 'AD Certificate Services attacks (ESC)',
      read: `**Active Directory Certificate Services (ADCS)** — the enterprise PKI many domains run — became one of the most impactful AD attack surfaces after the 2021 "Certified Pre-Owned" research. Misconfigured certificate templates let an attacker **enrol for a certificate that authenticates as anyone, including Domain Admin.** Certificates are long-lived and survive password resets, making this both an escalation and a persistence technique.

## The core idea

Certificates can be used for authentication (PKINIT/Kerberos, Schannel). If an attacker can get a **certificate whose subject is a privileged user**, they can authenticate as that user — without a password, until the certificate expires. The **ESC1–ESC8+** classes each describe a misconfiguration that allows this:

- **ESC1** — a template that lets low-priv users enrol *and* supply an arbitrary Subject Alternative Name (SAN). Request a cert "for" Domain Admin → become Domain Admin.
- **ESC2/ESC3** — overly permissive templates / enrolment agent abuse.
- **ESC4** — write access to a template's settings (turn a safe template into an ESC1).
- **ESC6** — the CA honours attacker-supplied SANs globally (EDITF_ATTRIBUTESUBJECTALTNAME2).
- **ESC8** — **HTTP enrolment endpoint vulnerable to NTLM relay** (ties into the next step — relay a DC's authentication to the CA and get a DC certificate).

## Detection and hardening

- **Audit templates** — tools like **Certify**/**Certipy** (offensive) and **PSPKIAudit**/**Locksmith** (defensive) enumerate vulnerable templates. Find and fix: remove "supply subject in request" from templates low-priv users can enrol, tighten enrolment permissions, disable the EDITF flag, enforce **manager approval** for sensitive templates.
- **Log CA events** — certificate issuance (**4886/4887**) and **4768** (a TGT obtained via a certificate — PKINIT). A cert issued for, or a PKINIT logon as, a privileged account that did not request it is the signal.
- **ESC8** — disable NTLM on the CA web enrolment, or enable **Extended Protection for Authentication (EPA)** and require HTTPS.

ADCS is often the fastest path from a foothold to Domain Admin in a modern network — and because a stolen/forged certificate is valid for its lifetime regardless of password changes, remediation may require **revoking certificates** and even reissuing the CA, not just resetting passwords. Auditing your PKI templates is now a mandatory part of AD defence.`,
      sample: {
        lang: 'text',
        caption: 'ESC1: a low-priv user enrols a cert that authenticates as Domain Admin',
        code: `Vulnerable template "UserAuth":
  Enrollment rights: Domain Users        <- anyone can request
  msPKI-Certificate-Name-Flag: ENROLLEE_SUPPLIES_SUBJECT  <- pick your SAN
  EKU: Client Authentication             <- usable to log on

Attack:  request a cert with SAN = "Administrator", then use it
         (PKINIT) to get a TGT as Administrator. No password needed.

Detection: 4886/4887 (cert requested/issued) for template UserAuth
           with SAN=Administrator, requested by a normal user; and
           4768 PKINIT logon as Administrator via certificate.`,
        output: `A certificate that authenticates as Domain Admin, valid for its
lifetime, surviving password resets. Fix the template (remove
ENROLLEE_SUPPLIES_SUBJECT / tighten enrolment); revoke issued certs.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an ADCS certificate-template misconfiguration (like ESC1) both a privilege-escalation and a persistence problem, and why can it be hard to remediate?',
        options: [
          'Certificates are only used for encryption, not authentication',
          'A vulnerable template lets an attacker obtain a certificate that authenticates as a privileged user (escalation); because certificates are valid for their lifetime and are not invalidated by password changes, that certificate keeps working (persistence) until it is revoked or expires — so resetting passwords alone does not remediate it',
          'It only affects the certificate server itself',
          'The attack requires Domain Admin to begin with',
        ],
        answer: 1,
        explain:
          'If a template lets a low-privileged user enrol and supply an arbitrary subject, they can get a certificate that authenticates as Domain Admin — immediate escalation. And unlike a stolen password, a certificate stays valid for its (often long) lifetime regardless of password resets, so it is durable persistence. Remediation therefore requires fixing the template *and* revoking the issued certificates (sometimes reissuing the CA), not just changing credentials — which is why auditing PKI templates is now essential.',
        hint: 'A certificate authenticates you and stays valid for its lifetime. What does a password reset do to it?',
      },
    },

    {
      id: 'bwin-p-02',
      title: 'Coerced authentication and NTLM relay',
      read: `Some of the most powerful AD attacks never crack a password: they **coerce** a privileged machine into authenticating to the attacker, then **relay** that authentication to a service that grants control. Understanding this chain is essential modern defence.

## Coercion

Windows has features that make a machine authenticate to a path you specify. Attackers abuse them to force a target — often a **Domain Controller** — to authenticate to the attacker's host:

- **PetitPotam** (MS-EFSRPC), **PrinterBug**/SpoolSample (MS-RPRN), **DFSCoerce**, **ShadowCoerce**, and others — each is an RPC call that says "authenticate to \\\\attacker\\share". The DC's **machine account** dutifully authenticates to the attacker.

## Relay

NTLM authentication can be **relayed**: the attacker forwards the coerced authentication to another service that accepts NTLM, authenticating *as the coerced machine* to that service. The devastating combination:

- **PetitPotam → relay to ADCS (ESC8)** — coerce a DC to authenticate, relay it to the certificate web enrolment, and receive a **certificate for the Domain Controller's account** → then use it to DCSync / act as the DC → **domain compromise**, often from an unauthenticated start.
- Relay to **LDAP** (configure RBCD on the DC), to **SMB**, etc.

## Detection and defence

- **Disable NTLM where possible**, and require **SMB signing** and **LDAP signing + channel binding** — signing/EPA break relay because the relayed session cannot be validly re-signed.
- **Enable Extended Protection for Authentication (EPA)** on ADCS web enrolment and other HTTP auth endpoints; ideally disable NTLM on the CA.
- **Patch** the coercion vectors (Microsoft has hardened several) and **restrict the RPC** where feasible.
- **Detect** — a machine account (especially a DC's) authenticating to an unexpected host; NTLM authentication to ADCS/LDAP from odd sources; certificate issuance for machine accounts; MS-EFSRPC/MS-RPRN calls to DCs.

The mental model: **authentication can be coerced and relayed**, so the defence is to (1) remove the endpoints that accept relayable auth (disable NTLM, require signing/EPA), (2) patch/limit the coercion methods, and (3) alert on privileged machine accounts authenticating where they should not. The PetitPotam→ADCS chain in particular can take a domain from zero to owned, so closing it is a priority.`,
      sample: {
        lang: 'text',
        caption: 'The PetitPotam -> relay -> ADCS chain to domain compromise',
        code: `1. attacker (unauth) --MS-EFSRPC "authenticate to \\\\attacker"--> DC01
2. DC01$ (machine acct) --NTLM auth--> attacker relay
3. attacker relays DC01$ auth --> ADCS web enrolment (ESC8, NTLM)
4. CA issues a certificate FOR DC01$  (a Domain Controller!)
5. attacker uses DC01$ cert --> DCSync / act as the DC --> domain owned

Break the chain:
  - EPA + HTTPS on ADCS web enrolment (or disable NTLM there) -> step 3 fails
  - LDAP signing + channel binding -> relay to LDAP fails
  - patch/limit coercion (MS-EFSRPC) -> step 1 harder`,
        output: `No password was cracked. Coerced auth + NTLM relay turned an
unauthenticated position into Domain Controller compromise.
Defence: kill the relay targets (signing/EPA/disable NTLM),
limit coercion, and alert on machine-account auth anomalies.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the PetitPotam → ADCS relay attack, why does requiring Extended Protection for Authentication (EPA) / disabling NTLM on the CA web enrolment break the attack?',
        options: [
          'It makes the DC faster',
          'The attack relies on relaying the coerced NTLM authentication to the CA’s HTTP enrolment endpoint; EPA binds the authentication to the specific TLS channel (and disabling NTLM removes the relayable protocol), so the relayed session can no longer be validly presented to the CA — the relay step fails',
          'It patches the MS-EFSRPC coercion',
          'It revokes all certificates automatically',
        ],
        answer: 1,
        explain:
          'The chain needs to relay the DC’s coerced NTLM authentication to the certificate web enrolment. EPA ties the authentication to the TLS channel it arrived on, so a relayed authentication (arriving on a different channel) is rejected; disabling NTLM on that endpoint removes the relayable protocol entirely. Either breaks the relay step. Full defence also limits coercion and requires LDAP/SMB signing, but closing the relay target is what stops this specific zero-to-domain chain.',
        hint: 'Which step of the chain does EPA/disabling NTLM target — the coercion, or the relay to the CA?',
      },
    },

    {
      id: 'bwin-p-03',
      title: 'Advanced delegation abuse',
      read: `The intermediate level introduced Kerberos delegation as a hardening item. At the pro level you need to understand the **attack techniques** deeply, because delegation abuse is a common, subtle escalation path — and detecting it requires knowing what the legitimate protocol looks like.

## The three delegation types, as attack surface

- **Unconstrained delegation** — a host so configured caches the **TGT** of every user who authenticates to it. Attack: compromise the host, then coerce a **Domain Controller** (previous step) to authenticate to it, capture the DC's TGT, and impersonate the DC. Any non-DC with unconstrained delegation is effectively tier-0.
- **Constrained delegation (S4U2Proxy)** — a service may request tickets to *specific* services on a user's behalf. Abuse: if an attacker controls a constrained-delegation account, **S4U2Self** lets it obtain a ticket to *itself* as any user, then **S4U2Proxy** to the allowed service — impersonating arbitrary users (including admins) to that service. "Protocol transition" (TrustedToAuthForDelegation) makes it worse.
- **Resource-Based Constrained Delegation (RBCD)** — delegation configured on the *target* resource (\`msDS-AllowedToActOnBehalfOfOtherIdentity\`). Attack: if an attacker can **write that attribute** on a computer object (e.g. via an ACL weakness, or after relaying LDAP), they configure a machine they control to be trusted to act on behalf of any user *to that computer* — then impersonate an admin onto it. A very common modern escalation, often chained with coercion/relay.

## Detection

- **4769** service-ticket requests with the **S4U** hallmarks (a ticket obtained on behalf of another user), especially targeting privileged accounts.
- Changes to delegation attributes — writes to \`msDS-AllowedToActOnBehalfOfOtherIdentity\` (RBCD), or a computer newly flagged for delegation — via directory-change auditing. An unexpected RBCD write is a strong signal.
- **Unconstrained-delegation hosts** authenticating as/for other accounts; a machine account behaving like a user.

## Hardening

- Eliminate unconstrained delegation (use constrained/RBCD); mark tier-0 accounts **"sensitive and cannot be delegated"** (or put them in **Protected Users**) so their tickets are never cached by a delegating host.
- Tightly control **who can write delegation attributes** (ACLs on computer objects) — this is the RBCD entry point.
- Audit all delegation regularly (BloodHound surfaces these edges).

Delegation is a place where a single misconfigured attribute becomes an impersonate-any-user primitive. Knowing the S4U flow and watching for the attribute writes and S4U ticket patterns is how you catch it.`,
      sample: {
        lang: 'text',
        caption: 'RBCD abuse: writing one attribute to impersonate an admin',
        code: `Precondition: attacker can WRITE msDS-AllowedToActOnBehalfOf...
              on target computer SRV-07 (ACL weakness or relayed LDAP)

1. attacker sets SRV-07's RBCD to trust attacker-controlled FAKE01$
2. FAKE01$ does S4U2Self+S4U2Proxy -> service ticket to SRV-07
      "as Administrator"
3. attacker accesses SRV-07 as Administrator

Detection:
  - directory-change audit: write to msDS-AllowedToActOnBehalf... on SRV-07
  - 4769 S4U service tickets for Administrator to SRV-07 from FAKE01$`,
        output: `One writable attribute on a computer object becomes
"impersonate any user onto that computer." Control who can
write delegation attributes; alert on those writes; put
tier-0 accounts in Protected Users so they cannot be delegated.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the key precondition for a Resource-Based Constrained Delegation (RBCD) attack, and what defensive control most directly addresses it?',
        options: [
          'The attacker must already be Domain Admin; nothing can prevent it',
          'The attacker needs write access to the target computer’s delegation attribute (msDS-AllowedToActOnBehalfOfOtherIdentity); tightly controlling and auditing who can write delegation attributes on computer objects — and alerting on such writes — directly addresses it',
          'The attacker must physically access the server',
          'It only works if Kerberos is disabled',
        ],
        answer: 1,
        explain:
          'RBCD is configured by writing the msDS-AllowedToActOnBehalfOfOtherIdentity attribute on the *target* object. If an attacker can write it (via a weak ACL or a relayed LDAP authentication), they configure a controlled account to impersonate any user to that target. So the control is to restrict who can write delegation attributes (ACL hygiene on computer objects), audit/alert on those writes, and place tier-0 accounts in Protected Users so their tickets cannot be delegated. Watching for S4U ticket patterns catches the follow-through.',
        hint: 'RBCD is set by writing one attribute on the target. Who is allowed to write it?',
      },
    },

    {
      id: 'bwin-p-04',
      title: 'Stealthy domain persistence',
      read: `An attacker who reaches Domain Admin wants to keep it *invisibly*. Beyond golden tickets, AD offers deep persistence spots that survive password resets and even partial cleanups. A pro defender knows them, because eviction fails if you miss one.

## The stealthy techniques

- **DCShadow** — the attacker registers a **rogue Domain Controller** and uses replication to push malicious changes (e.g. add SID history, modify ACLs) directly into AD — bypassing normal change logging, because it looks like DC-to-DC replication. Detection: unexpected DC registration, replication from a non-DC (again 4662/replication anomalies).
- **AdminSDHolder / SDProp** — AD periodically reapplies a protected ACL template (AdminSDHolder) to privileged accounts. An attacker who edits AdminSDHolder plants an ACL (e.g. "attacker has FullControl on Domain Admins") that AD itself **re-stamps every hour**, so removing it from a specific account is undone automatically. Detection: changes to the AdminSDHolder object; unexpected ACEs on protected groups.
- **ACL backdoors** — grant an innocuous account rights like **DCSync** (replication) or password-reset over privileged objects. Quiet, and easy to miss without ACL auditing/BloodHound.
- **SID History injection** — add a privileged group's SID to a controlled account's sidHistory; it carries that privilege invisibly.
- **DSRM abuse** — the Directory Services Restore Mode local admin on a DC, configurable to allow network logon — a backdoor into the DC itself.
- **Skeleton Key** — malware patched into LSASS on a DC that adds a master password accepting any account (memory-resident; gone on reboot but total while present).
- **GPO abuse** — modify a widely linked GPO to run code across many machines.

## The defensive stance

- **Assume, after any tier-0 compromise, that multiple persistence mechanisms exist.** Eviction is a *systematic* review of AD's control points — ACLs on the domain root, privileged groups and AdminSDHolder; sidHistory; delegation; DSRM; GPOs; and the certificate templates (ESC) — not just "reset passwords and kill the process."
- **Continuously audit AD ACLs and privileged-group membership** (tools like PingCastle, Purple Knight, and BloodHound), and alert on changes to the crown-jewel objects (AdminSDHolder, the domain object's ACL, DC objects, key GPOs).

The theme: at tier-0, persistence hides in **AD's own configuration and replication**, where it looks legitimate. Detecting it means auditing the control plane itself and alerting on changes to the objects that grant domain power — and eviction means checking every one of these spots, because attackers plant several.`,
      sample: {
        lang: 'text',
        caption: 'AdminSDHolder persistence: an ACL AD re-stamps for the attacker',
        code: `Attacker (with DA) adds to the AdminSDHolder object's ACL:
   ACE: "svc-helpdesk"  ->  FullControl

Every 60 min, SDProp copies AdminSDHolder's ACL onto ALL
protected accounts (Domain Admins, etc.). So even if you
remove svc-helpdesk's rights from Domain Admins directly,
AD RE-ADDS them within the hour. The backdoor is self-healing.

Detection: audit writes to CN=AdminSDHolder,...; alert on any
new ACE on it; review protected-group ACLs for odd principals.`,
        output: `Removing the attacker's access from the group does not work —
SDProp re-stamps it from AdminSDHolder. You must clean the
AdminSDHolder ACL itself. This is why eviction is a systematic
audit of AD's control points, not a per-symptom fix.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An attacker who reached Domain Admin planted an ACE on the AdminSDHolder object. Why does removing the attacker’s rights from the Domain Admins group fail to evict them?',
        options: [
          'The group cannot be edited',
          'AD’s SDProp process periodically re-applies the AdminSDHolder ACL to all protected privileged accounts, so an ACE planted on AdminSDHolder is automatically re-stamped onto the groups within the hour — you must remediate the AdminSDHolder object itself, illustrating why tier-0 eviction requires a systematic audit of AD’s control points',
          'The attacker also changed all passwords',
          'AdminSDHolder is stored offline',
        ],
        answer: 1,
        explain:
          'AdminSDHolder is a template whose ACL SDProp copies onto protected accounts on a schedule. An attacker who edits AdminSDHolder makes their access self-healing: fixes to individual groups are reverted at the next SDProp run. Remediation means cleaning AdminSDHolder itself — and, since attackers plant several tier-0 persistence mechanisms (DCShadow, ACL/DCSync backdoors, sidHistory, DSRM, GPOs, ESC certs), eviction is a systematic review of the whole control plane, not a per-symptom fix.',
        hint: 'What does SDProp do to protected groups on a schedule, and where did the attacker actually plant the ACE?',
      },
    },

    {
      id: 'bwin-p-05',
      title: 'Detecting EDR and telemetry evasion',
      read: `Advanced attackers do not just avoid detection — they actively **blind the tools that would detect them**. A pro defender must understand these evasion techniques *and* how to detect the evasion itself, because the act of blinding is often noisier than what it hides.

## The common evasions

- **AMSI bypass** — the **Antimalware Scan Interface** lets AV/Defender inspect scripts (including de-obfuscated PowerShell/.NET) at runtime. Attackers patch AMSI in their process memory (e.g. \`AmsiScanBuffer\`) so it always returns "clean", then run malicious scripts unseen.
- **ETW patching** — **Event Tracing for Windows** underlies much telemetry (including .NET and PowerShell logging). Attackers patch \`EtwEventWrite\` in their process to suppress the events, going dark to ETW-based sensors.
- **Userland unhooking** — EDRs hook API functions in \`ntdll\`/\`kernel32\` to observe behaviour. Attackers overwrite those hooks with the clean on-disk copy (or use **direct/indirect syscalls**) to call the kernel without passing through the EDR's hooks.
- **BYOVD (Bring Your Own Vulnerable Driver)** — load a legitimately signed but vulnerable driver, then exploit it to run code in the kernel and **kill or blind the EDR** from below it. A very common modern technique.
- **Process injection / hollowing** — run inside a trusted process to hide.

## Detecting the evasion

You often cannot see what was hidden, but you *can* see the blinding:

- **AMSI/ETW patching** — memory-integrity signals: a process modifying its own \`amsi.dll\`/\`ntdll\` code pages (some EDRs detect the write); a sudden **absence** of expected telemetry from a process that should be producing it (silence itself is a signal). AMSI-bypass strings sometimes appear in the 4104 block *before* the patch takes.
- **Unhooking** — EDRs increasingly detect tampering with their hooks; direct-syscall patterns (a syscall instruction from outside ntdll) are flaggable.
- **BYOVD** — a **known-vulnerable driver loading** (Microsoft's vulnerable-driver blocklist / HVCI helps *prevent* it; Sysmon Event 6 driver load and service/driver creation help detect it). An EDR/AV service **stopping unexpectedly** is a red alert.
- **Tamper protection** — enable Defender **Tamper Protection** and monitor for attempts to disable AV/EDR, stop its services, or add exclusions (the "defence turned off" signal from the beginner level, at pro depth).

## The mindset

Assume a capable adversary will try to blind you, so (1) **harden the sensors** (Tamper Protection, HVCI + vulnerable-driver blocklist against BYOVD, PPL for AV), (2) **treat telemetry gaps as signal** — a process that should emit ETW/AMSI events and suddenly doesn't, or an EDR service that stops, is itself an alert, and (3) **have out-of-band telemetry** (network sensors, WEF already off-host) so blinding one layer doesn't blind you entirely. The evasion is part of the attack; catching the evasion catches the attacker.`,
      sample: {
        lang: 'text',
        caption: 'Catching the blinding: BYOVD and telemetry going dark',
        code: `Sysmon Event 6 (driver loaded):
  ImageLoaded: C:\\Windows\\Temp\\RTCore64.sys   <- known-vulnerable driver
  Signed: yes (legit signature)               <- BYOVD hallmark

Seconds later:
  EDR service "Sense" -> Stopped (unexpected)
  Sysmon events from host: STOP    <- telemetry went dark

Detection logic:
  vulnerable-driver load  +  security service stop  +  telemetry gap
  = an active EDR-blinding attempt. Alert with high severity.`,
        output: `You may not see what the attacker did after blinding you, but
the BYOVD load, the AV/EDR service stopping, and the sudden
silence are all detectable. The evasion is louder than the
payload — so detect the evasion, and harden sensors (HVCI +
driver blocklist, Tamper Protection) to prevent it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A capable attacker patches ETW and AMSI in their process and kills the EDR via a vulnerable driver. How can a defender still detect this, given the payload itself is now hidden?',
        options: [
          'They cannot — blinding the tools makes the attacker invisible',
          'The act of blinding is itself detectable: a known-vulnerable driver loading, security services stopping unexpectedly, and a sudden absence of expected telemetry from a process are all high-signal indicators — so you alert on the evasion, treat telemetry gaps as signal, and harden the sensors (HVCI + driver blocklist, Tamper Protection) to prevent it',
          'Only a reboot reveals the attack',
          'Antivirus signatures always catch it',
        ],
        answer: 1,
        explain:
          'Evasion trades stealth-of-payload for noise-of-tampering. Loading a vulnerable driver (BYOVD), stopping the EDR/AV service, and the resulting silence from a process that should emit ETW/AMSI events are all observable. Mature defence alerts on these, treats unexpected telemetry gaps as a signal in themselves, keeps out-of-band sensors (network, off-host WEF), and hardens the sensors (Tamper Protection, HVCI with the vulnerable-driver blocklist) so the blinding is prevented or, failing that, loud.',
        hint: 'Turning off the sensors is an action too. What does that action look like in the telemetry you still have?',
      },
    },

    {
      id: 'bwin-p-06',
      title: 'Behavioural analytics and UEBA',
      read: `Signature and rule-based detection catches the known. To catch novel and low-and-slow attacks, mature programs add **behavioural analytics** — modelling what normal looks like for each user, host and account, and alerting on statistically significant deviations. This is **UEBA** (User and Entity Behaviour Analytics).

## What it models

Rather than "match this pattern", UEBA builds a **baseline per entity** and scores anomalies:

- **Users** — normal logon times, locations, devices, the systems they access, data volumes they touch. Alerts: a logon from a new country, at 3am, to systems this user never touches, or a sudden data-access spike (potential exfiltration or account takeover).
- **Hosts/service accounts** — a service account that suddenly authenticates interactively, or to hosts outside its pattern (lateral movement); a workstation that starts making unusual outbound connections.
- **Peer-group analysis** — compare an entity to similar ones; an account behaving unlike its peer group (other accounts in the same role) is suspicious even without a fixed rule (the stacking idea, statistical).

## Where it fits

UEBA complements, not replaces, rules and hunting:

- **Rules** catch known TTPs precisely (high precision, known coverage).
- **UEBA** catches the *unknown* and the *insider*/compromised-account cases where each individual action looks authorised — the value is spotting that the *pattern* changed.
- Products (Microsoft Sentinel UEBA, Defender for Identity, Exabeam, etc.) provide this; the concept matters more than any product.

## The pitfalls

- **False positives and drift** — behaviour legitimately changes (new role, travel); models need tuning and context, or they cry wolf.
- **"Anomalous" ≠ "malicious"** — analytics surface deviations; a human decides. UEBA is a lead generator, not a verdict.
- **Baseline poisoning** — an attacker present *during* baselining can make their activity look normal; models should weight established history.

## The pro perspective

Detection has three complementary layers: **rules** (known TTPs), **hunting** (human-driven hypotheses), and **analytics/UEBA** (statistical anomalies). The insider threat and the patient, credentialed attacker — whose every action is individually authorised — are exactly where signatures fail and behavioural baselining shines. Adding UEBA is how a mature program extends detection to "this account is doing things this account never does," catching compromises that no rule anticipated.`,
      sample: {
        lang: 'text',
        caption: 'UEBA: each action is "authorised", but the pattern screams anomaly',
        code: `Account: svc-backup   (a service account)
  Baseline: logs on as a SERVICE to BACKUP-01 nightly, no interactive use

  Anomaly score  Event
  ------------------------------------------------------------
   +40  interactive (Type 2/10) logon  (never done before)
   +35  logon from a WORKSTATION       (only ever BACKUP-01)
   +50  accessed 118 hosts in 1 hour   (peer service accts: ~1)
   +30  outbound to an external IP     (never seen)
  = composite risk 155 (HIGH) -> raise, investigate as takeover`,
        output: `Every single action is "permitted" for this account — no rule
is broken. UEBA fires because the BEHAVIOUR PATTERN changed
drastically from the account's own baseline and its peers.
That is the compromised-credential / insider case rules miss.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does behavioural analytics (UEBA) catch compromised-account and insider threats that signature- and rule-based detection often miss?',
        options: [
          'It has more attack signatures',
          'It baselines each entity’s normal behaviour and alerts on significant deviations, so it can flag a case where every individual action is technically authorised but the overall pattern (times, locations, systems, volumes) has changed drastically — the hallmark of a compromised or insider account that breaks no explicit rule',
          'It blocks all anomalous actions automatically',
          'It only works on network traffic',
        ],
        answer: 1,
        explain:
          'A patient attacker using stolen valid credentials, or a malicious insider, performs actions each of which is permitted — so no rule fires. UEBA models the entity’s own historical behaviour (and its peer group) and scores deviations, catching "this account is suddenly logging on interactively from a new place and touching 118 hosts" even though each action is authorised. It complements rules (known TTPs) and hunting (hypotheses) as the statistical, anomaly-focused detection layer — a lead generator a human then triages.',
        hint: 'What does an attacker with valid stolen credentials break — an explicit rule, or the account’s normal pattern?',
      },
    },

    {
      id: 'bwin-p-07',
      title: 'Identity threat detection and response',
      read: `Modern attacks target **identity** above all — credentials, tokens, tickets, and the directory itself. **Identity Threat Detection and Response (ITDR)** is the discipline (and product category) focused specifically on protecting and monitoring the identity fabric: on-prem AD, cloud identity (Entra ID/Azure AD), and the hybrid links between them.

## Why identity is the battleground

Everything in this track converges here: Kerberoasting, pass-the-hash/ticket, golden tickets, DCSync, ADCS abuse, delegation, coercion/relay — all are attacks on identity. In cloud and hybrid environments the target shifts but the theme holds: steal a token, abuse a federation trust, escalate in the directory.

## On-prem: Microsoft Defender for Identity (MDI)

**MDI** (formerly Azure ATP) is Microsoft's AD-focused sensor: it runs on Domain Controllers and analyses AD traffic and events to detect the specific AD attacks — reconnaissance (LDAP enumeration, BloodHound), Kerberoasting, DCSync, golden/silver tickets, pass-the-hash, lateral movement, and more — mapped to ATT&CK, with an identity-centric view. It is purpose-built for exactly the attacks in this level, and it also seeds **honeytoken accounts** (deception, integrated).

## Cloud & hybrid identity attacks

- **Primary Refresh Token (PRT)** theft — steal the token that grants SSO to cloud resources.
- **Golden SAML** — forge SAML assertions using a stolen federation signing key (the ADFS/federation equivalent of a golden ticket) to authenticate to cloud services as anyone.
- **Illicit OAuth consent / app registrations** — trick a user (or plant an app) to grant a malicious application persistent access to cloud data.
- **Hybrid pivots** — from on-prem AD to Entra ID via Entra Connect (the sync account is highly privileged), or vice versa.

## The ITDR stance

- **Monitor the identity providers as tier-0** — DCs, ADCS, ADFS/federation, and Entra Connect are crown jewels; compromise of any can mint or forge identity.
- **Detect identity-specific TTPs** with identity-aware tooling (MDI on-prem; Entra ID Protection, sign-in risk, and cloud detections for the cloud side).
- **Protect tokens and keys** — the federation signing key, the Entra Connect sync account, PRTs — as you protect krbtgt.
- **Unify visibility** across on-prem and cloud, because attackers pivot between them.

The pro takeaway: as environments go hybrid, the perimeter *is* identity. ITDR reframes defence around protecting and monitoring the entire identity fabric — the directories, the trusts, the tokens and the keys — because that is what attackers are really after, on-prem and in the cloud alike.`,
      sample: {
        lang: 'text',
        caption: 'Golden SAML: the cloud equivalent of a golden ticket',
        code: `On-prem golden ticket:            Cloud golden SAML:
  steal krbtgt key                  steal the ADFS token-signing key
  forge any Kerberos TGT            forge any SAML assertion
  -> authenticate as anyone         -> authenticate to cloud apps as anyone
     in the domain                     (bypassing MFA, password resets)
  recovery: reset krbtgt x2         recovery: rotate the signing cert/key

Protect the token-signing key like krbtgt; monitor ADFS; detect
SAML assertions not issued by your ADFS (impossible-travel, odd claims).`,
        output: `As identity goes hybrid, the same "steal the signing key ->
forge identities" pattern appears in the cloud. ITDR protects
and monitors the whole identity fabric — DCs, ADCS, federation
keys, Entra Connect, PRTs — because that is the real target.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A "Golden SAML" attack is often described as the cloud/federation equivalent of a golden ticket. Why, and what does that imply for defence?',
        options: [
          'Both require physical access to a server',
          'Both forge identities by abusing a stolen signing key — krbtgt for Kerberos TGTs on-prem, the federation (ADFS) token-signing key for SAML assertions in the cloud — so an attacker can authenticate as anyone and survive password resets/MFA; defence means protecting and monitoring those signing keys as tier-0 crown jewels and rotating them to remediate',
          'Both only affect a single user account',
          'Neither can be detected or remediated',
        ],
        answer: 1,
        explain:
          'A golden ticket forges TGTs with the stolen krbtgt key; Golden SAML forges SAML assertions with the stolen ADFS token-signing key. In both, possession of the signing key lets the attacker mint valid identities for anyone, bypassing passwords and even MFA, until the key is rotated. So the federation signing key (like krbtgt, the Entra Connect account, and PRTs) is a tier-0 secret to protect and monitor, and remediation is key rotation — the ITDR mindset applied to hybrid identity.',
        hint: 'Golden ticket abuses the krbtgt key. What key does Golden SAML abuse, and what does stealing a signing key let you do?',
      },
    },

    {
      id: 'bwin-p-08',
      title: 'Adversary emulation of real threat actors',
      read: `The intermediate and skilled levels validated detections by emulating individual techniques. At the pro level you emulate **whole adversaries** — chaining the specific TTPs of a real threat group relevant to your organisation — to test defence the way it will actually be tested.

## Intelligence-driven emulation

Instead of "run some attacks", you:

1. **Choose a threat** from intelligence — an actor known to target your sector (e.g. a ransomware affiliate, an APT). Sources: CISA advisories, vendor reports, MITRE ATT&CK **Groups**.
2. **Extract their TTPs** — the specific techniques they use, in the order they use them, mapped to ATT&CK. **MITRE ATT&CK** and the **Center for Threat-Informed Defense** publish adversary profiles and emulation plans.
3. **Emulate the full chain** in a controlled way — initial access → execution → persistence → privilege escalation → credential access → lateral movement → collection → exfiltration/impact — using tools like **Caldera**, **Atomic Red Team**, and purpose-built emulation plans.
4. **Measure** detection and prevention at each step (MTTD per technique), and response.

## Why full-chain, actor-specific emulation matters

- **Realism** — real attacks are chains; testing techniques in isolation misses whether you catch the *sequence* and whether your response holds under a realistic tempo.
- **Prioritisation** — emulating the actors that actually threaten you focuses defence on relevant TTPs, not a generic checklist.
- **Coverage truth** — it reveals the *chained* blind spots: you might detect step 3 and step 6 but be blind at 4–5, giving the attacker room.

## Purple, at program scale

This is purple teaming matured: red emulates the actor, blue instruments and watches, and together you produce a **before/after ATT&CK coverage map** for that adversary's TTPs, close the gaps, and re-run. Track it as a program metric: "we can detect/prevent N% of [actor]'s known techniques, up from M%."

## The deliverable

An **ATT&CK coverage assessment against the adversaries that matter to you**, with evidence from emulation, a prioritised gap backlog, and validated improvements. That is the difference between "we run some tests" and "we have measured our defences against the specific threats we face and are systematically closing the gaps" — intelligence-driven, adversary-focused, and continuously re-measured.`,
      sample: {
        lang: 'text',
        caption: 'Emulating a real actor’s full chain and mapping coverage',
        code: `Emulation: ransomware affiliate TTP chain (from CISA advisory + ATT&CK)

Step  Technique                       Prevent  Detect  MTTD
------------------------------------------------------------------
 1    T1566 phishing attachment       -        yes     2m
 2    T1059 PowerShell (LOLBin)       ASR      yes      -
 3    T1003 LSASS dump                CredGrd  yes     1m
 4    T1207 DCShadow                  -        NO      -    <- gap
 5    T1021 RDP/SMB lateral movement  fw seg   yes     3m
 6    T1486 ransomware encryption     -        yes     -

Coverage vs THIS actor: 5/6 detected, gap at step 4 (DCShadow).
Backlog: build DCShadow detection (replication from non-DC), re-run.`,
        output: `Testing the actor's FULL chain reveals the chained blind spot
(DCShadow) that per-technique testing might rank low. Coverage
is measured against the adversaries that actually threaten you,
gaps are prioritised and closed, and the chain is re-emulated.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is emulating a specific real threat actor’s full TTP chain more valuable than testing individual techniques in isolation?',
        options: [
          'It uses fewer resources',
          'Real attacks are sequences, so full-chain emulation of an actor that actually threatens you reveals whether you catch the whole chain (including chained blind spots between detected steps), focuses effort on relevant TTPs, and produces an actor-specific ATT&CK coverage assessment to prioritise and close gaps',
          'Individual techniques are never worth testing',
          'It guarantees the attacker will be stopped',
        ],
        answer: 1,
        explain:
          'Adversaries operate in chains, and defence can have gaps *between* steps you individually detect (detect 3 and 6 but be blind at 4–5, leaving room to operate). Intelligence-driven, full-chain emulation of the actors relevant to your sector tests realism and sequence, prioritises the TTPs that matter to you, and yields a measurable per-adversary coverage map with a prioritised backlog — matured purple teaming that turns "we run tests" into "we have measured and are closing our defences against the threats we actually face."',
        hint: 'Do real attacks happen one isolated technique at a time, or as a sequence with gaps possible between the steps?',
      },
    },

    {
      id: 'bwin-p-09',
      title: 'Recovering from domain compromise',
      read: `The hardest scenario a Windows defender faces: **the domain is fully compromised** — the attacker has (or you must assume they have) Domain Admin and krbtgt. Recovery is not "clean the infected machines"; it is a deliberate **rebuild of trust** in the identity fabric, and knowing the process is a pro-defining skill.

## Why ordinary IR is not enough

Once krbtgt and tier-0 are compromised, the attacker can forge golden tickets, has likely planted multiple stealthy persistence mechanisms (previous step), and may hold certificates (ESC) and ACL backdoors that survive password resets. You **cannot trust** anything the compromised AD asserts. Piecemeal cleanup fails because the attacker re-enters through a spot you missed.

## The recovery process (Microsoft's AD forest recovery guidance)

At a high level:

1. **Scope and contain** — determine the blast radius; isolate; preserve evidence. Assume tier-0 compromise if there is any doubt.
2. **Establish a clean foundation** — recover DCs from known-good backups taken *before* compromise, or rebuild, in an isolated environment. Do not reconnect compromised infrastructure.
3. **Reset the crown-jewel secrets** — reset **krbtgt twice** (invalidates golden tickets), reset the **DSRM** passwords, reset **all privileged accounts**, reset the **trust passwords**, and address the **Entra Connect / federation signing key** in hybrid environments (rotate — Golden SAML).
4. **Purge persistence** — clean **AdminSDHolder** and privileged-group ACLs, remove rogue **ACL/DCSync grants**, check **sidHistory**, **delegation** attributes, **GPOs**, and **ADCS templates/certificates** (revoke/reissue as needed). This is the systematic control-plane audit from the persistence step.
5. **Rebuild trust outward** — bring services back on the clean foundation, reset service/computer accounts, and force credential rotation broadly (assume all credentials touched by compromised hosts are stolen).
6. **Harden before reconnecting** — apply the tiering, LAPS, Protected Users, ADCS fixes, and detection so the same path cannot be reused.

## The scale of it

Full forest recovery is a major, planned operation — often days, with a documented runbook, tested backups, and a clean-room environment. That is *why* prevention (tiering especially) and early detection (shortening dwell time before tier-0 falls) matter so much: recovery from domain compromise is enormously costly, so the whole program aims to stop attackers reaching tier-0, and to catch them fast if they do.

## The pro takeaway

Know that domain compromise means **rebuild trust deliberately** — reset krbtgt (twice) and the other signing/trust secrets, purge control-plane persistence, and reconstitute on a clean, hardened foundation — not just "reimage the affected machines." Have the runbook and tested tier-0 backups *before* you need them. And treat it as the ultimate argument for everything upstream: assume-breach, tiering, detection and drill, so this day either never comes or is survivable.`,
      sample: {
        lang: 'text',
        caption: 'Why "reset passwords and reimage" is not domain recovery',
        code: `Naive response after DA/krbtgt compromise:
  reimage infected PCs + reset admin passwords
  -> golden tickets STILL valid (krbtgt unchanged)
  -> AdminSDHolder ACL re-stamps attacker access hourly
  -> ADCS certificates for privileged users STILL authenticate
  -> ACL/DCSync backdoor still lets them pull hashes again
  = attacker walks back in within hours.

Actual recovery (rebuild of trust):
  clean foundation (pre-compromise backup / rebuild, isolated)
  + reset krbtgt x2, DSRM, trusts, all privileged accounts
  + rotate federation/Entra Connect keys (Golden SAML)
  + purge AdminSDHolder/ACL/sidHistory/delegation/GPO/ADCS persistence
  + harden (tiering, LAPS, Protected Users) before reconnecting`,
        output: `Domain compromise is a trust problem, not a malware-cleanup
problem. Recovery rebuilds the identity fabric deliberately.
Have a tested forest-recovery runbook and clean tier-0 backups
BEFORE the day you need them.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After a full domain compromise (attacker has Domain Admin and krbtgt), why is "reimage the infected machines and reset admin passwords" insufficient, and what does real recovery require?',
        options: [
          'It is sufficient — that fully removes the attacker',
          'Golden tickets (krbtgt), self-healing ACL persistence (AdminSDHolder), ACL/DCSync backdoors, and issued ADCS certificates all survive password resets and reimaging, so recovery requires a deliberate rebuild of trust: a clean foundation, resetting krbtgt (twice) and other signing/trust secrets, purging control-plane persistence, and hardening before reconnecting',
          'You must pay the ransom to recover',
          'Only the antivirus needs updating',
        ],
        answer: 1,
        explain:
          'Tier-0 compromise poisons the identity fabric itself. Forged TGTs remain valid until krbtgt is reset (twice); AdminSDHolder re-stamps attacker ACLs; DCSync/ACL backdoors and ESC certificates keep working through password resets. So recovery is a planned rebuild of trust — clean foundation from pre-compromise backups, reset krbtgt and other signing/trust secrets (including federation keys in hybrid), systematic purge of control-plane persistence, and hardening before reconnecting — not machine cleanup. Its cost is the strongest argument for prevention (tiering) and fast detection.',
        hint: 'What survives a password reset and a reimage — golden tickets, AdminSDHolder, ADCS certs? What does that force recovery to actually do?',
      },
    },

    {
      id: 'bwin-p-10',
      title: 'Detection engineering maturity',
      read: `A pro program does not just have detections — it **manages** them as an engineering discipline with measured coverage, quality and lifecycle. This is what turns a pile of rules into a dependable capability.

## Coverage: know what you can and cannot see

- **Map detections to ATT&CK** and visualise coverage with the **ATT&CK Navigator** — a heatmap of which techniques you detect, partially detect, or are blind to.
- Frameworks like **DeTT&CT** assess your *data source* coverage (do you even collect the telemetry a technique needs?) and detection coverage/quality per technique — separating "we have no data" from "we have data but no rule."
- Coverage is honest only when **validated by emulation** (Atomic/Caldera): a rule you have not tested is a hope, not coverage.

## Quality: detections as code, tuned relentlessly

- **Version control, peer review, CI** — rules live in a repo; changes are reviewed; a pipeline tests each rule against known-good (no false positives) and known-bad (it fires) data before deployment. **Sigma** keeps rules portable across backends.
- **Track per-rule metrics** — true/false-positive rates, alert volume, time-to-triage. Prune or fix noisy rules; a rule firing 500 times a day is negative value.
- **The detection lifecycle** — proposed → developed → tested → deployed → tuned → (deprecated). Each rule has an owner, an ATT&CK mapping, documented false positives, and a validation status. Maturity models like **MaGMa** help manage this at scale.

## Balancing the pyramid

Prioritise detections high in the **Pyramid of Pain** (TTPs/behaviours over hashes/IPs) so coverage is durable, and ensure **defence in depth across the kill chain** — you want detections at multiple stages (initial access, execution, persistence, lateral movement, exfiltration), so missing one stage does not mean missing the whole attack.

## The measure of maturity

An immature program says "we have lots of rules." A mature one can state: our validated ATT&CK coverage is X% (with the gaps named and prioritised), our data-source coverage is Y%, our rules are version-controlled and CI-tested with tracked false-positive rates, and our coverage and MTTD are improving each quarter because of specific work. Detection engineering maturity is measured, honest, and continuously improving — the organisational expression of everything technical in this track.`,
      sample: {
        lang: 'text',
        caption: 'A detection-engineering coverage and quality view',
        code: `ATT&CK coverage (validated by emulation), by tactic:
  Initial Access     ####------  40%   (email gaps)
  Execution          ########--  80%
  Persistence        ######----  60%   (DCShadow, WMI subs: gaps)
  Priv Escalation    #######---  70%
  Credential Access  #########-  90%   (LSASS, DCSync, Kerberoast)
  Lateral Movement   ########--  80%
  Exfiltration       #####-----  50%   <- prioritise next

Rule health: 214 rules | FP rate <10%: 198 | noisy (prune/fix): 16
All rules: version-controlled, CI-tested, ATT&CK-mapped, owned.`,
        output: `"We have 214 rules" is not maturity. "Validated 72% ATT&CK
coverage, gaps named and prioritised, rules CI-tested with
tracked FP rates, coverage +11% this quarter" is. Measured,
honest, defense-in-depth across the kill chain, improving.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What most distinguishes a mature detection-engineering program from one that simply "has a lot of detection rules"?',
        options: [
          'The number of rules is all that matters',
          'It measures validated ATT&CK coverage (and data-source coverage) with gaps named and prioritised, manages rules as version-controlled, CI-tested, ATT&CK-mapped code with tracked false-positive rates and a lifecycle, and can show coverage and MTTD improving over time — honest, measured, continuously improving detection rather than an unmanaged pile of rules',
          'It never has any false positives',
          'It only uses commercial detection content',
        ],
        answer: 1,
        explain:
          'Maturity is management and measurement: know your coverage against ATT&CK (validated by emulation, distinguishing "no data" from "no rule"), treat rules as code (version control, peer review, CI testing against known-good/known-bad, per-rule FP tracking and a lifecycle), prioritise durable behavioural detections and defence-in-depth across the kill chain, and demonstrate improvement over time. "We have 214 rules" says nothing about whether they work, are tuned, or cover what matters.',
        hint: 'Is maturity about the count of rules, or about measured coverage, tested quality, and improvement over time?',
      },
    },

    {
      id: 'bwin-p-11',
      title: 'The SOC and the human system',
      read: `All the telemetry, detections and tooling in this track are operated by people under process. At the pro level you must understand the **Security Operations Center (SOC)** as a system — because the best detection is worthless if alerts are missed, mis-triaged, or drowned in noise.

## The functions

- **Triage (tier 1)** — validate and prioritise incoming alerts; escalate real ones, close false positives, feedback noisy rules to detection engineering.
- **Investigation (tier 2)** — scope confirmed incidents: what happened, how far, what to contain.
- **Incident response / threat hunting (tier 3)** — deep IR (the forensic and recovery skills from earlier), proactive hunting, and adversary emulation.
- **Detection engineering** — builds and tunes the detections the SOC runs on (previous step).
- **Threat intelligence** — feeds priorities: which actors, which TTPs, which IOCs matter now.

## Process and metrics

- **Playbooks / runbooks** — documented, repeatable responses per alert type, so response is consistent and fast under pressure (and juniors can act correctly). The domain-recovery runbook is an extreme example.
- **SOAR** — Security Orchestration, Automation and Response: automate the repetitive triage and enrichment (pull asset owner, reputation, related alerts; auto-isolate on high-confidence detections) so humans focus on judgement, not toil.
- **Metrics** — MTTD, MTTR, alert volume, false-positive rate, analyst dwell/queue time, coverage. These manage the *program*, not just the tech (the Linux pro "measure the program" lesson, operationalised).

## Alert fatigue: the real failure mode

The most common way a well-tooled SOC fails is **drowning in false positives**. Analysts become desensitised, real alerts sit unactioned, and the mean-time-to-detect balloons despite excellent sensors. This is why the entire chain — good telemetry, *tuned* high-signal detections, deception (near-zero FP), enrichment and automation — exists: to deliver a **manageable stream of high-fidelity alerts** a human can actually action. Detection maturity and SOC health are the same problem from two angles.

## The pro perspective

Security is a **socio-technical system**: technology, process and people together. A pro can reason not only about a Kerberoast detection but about whether the SOC will *notice and act* on it — the playbook, the analyst's workload, the false-positive budget, the automation, the metrics that reveal whether the whole machine is working. Building great detections and then burying analysts in noise is a classic, avoidable failure; the mature defender engineers the human system as deliberately as the technical one.`,
      sample: {
        lang: 'text',
        caption: 'Two SOCs with identical tools; only one actually detects',
        code: `SOC A                              SOC B
  8,000 alerts/day                   180 alerts/day
  ~65% false positive                ~8% false positive
  analysts desensitised              alerts investigated in minutes
  real Kerberoast alert sits         Kerberoast alert triaged,
    unactioned for 3 days              escalated, contained in 40m
  MTTD: weeks                        MTTD: under an hour

Same sensors, same rules available. The difference is tuning,
deception (low FP), enrichment, automation, and process.`,
        output: `The best detection is useless if it drowns in noise. A mature
SOC delivers a manageable stream of high-fidelity alerts to
humans with playbooks, automation and metrics — engineering the
human system as carefully as the technical one.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Two SOCs have identical sensors and detection rules, but one has a weeks-long MTTD and the other under an hour. What most likely explains the difference?',
        options: [
          'The slow SOC has worse hardware',
          'Alert quality and process: the effective SOC delivers a manageable stream of tuned, high-fidelity alerts (low false-positive rate) with enrichment, automation and playbooks, so analysts actually notice and act — whereas an untuned, noise-flooded SOC desensitises analysts and lets real alerts sit unactioned, ballooning MTTD despite good sensors',
          'The fast SOC blocks all attacks automatically',
          'Detection rules do not affect MTTD',
        ],
        answer: 1,
        explain:
          'Security is socio-technical: identical tooling produces wildly different outcomes depending on alert quality and process. A flood of false positives desensitises analysts and buries real detections, so MTTD balloons even with excellent sensors. The effective SOC invests in tuning, deception (near-zero FP), enrichment, SOAR automation and playbooks to deliver high-fidelity alerts humans can action — plus metrics to manage it. Engineering the human system (workload, false-positive budget, process) is as important as the detections themselves.',
        hint: 'If both have the same rules, what determines whether a human actually notices and acts on the real alert?',
      },
    },

    {
      id: 'bwin-p-12',
      title: 'Capstone: purple-team and recover a domain',
      read: `Tie the entire Windows track together into the exercise a senior AD defender leads: a full **purple-team engagement plus a domain-recovery drill** — proving, with evidence, that you can detect a realistic adversary and recover if they win.

## Part 1 — intelligence-driven purple team

1. **Choose an adversary** relevant to your organisation and extract its TTP chain (ATT&CK Groups / advisories).
2. **Confirm telemetry** first (WEF, Sysmon, PowerShell/command-line logging, MDI, cloud identity logs) — you cannot detect what you do not log.
3. **Emulate the full chain** in a controlled lab/scope: initial access → LOLBin execution → LSASS credential access → an AD escalation (Kerberoast/AS-REP/ADCS ESC/coercion+relay/RBCD) → lateral movement → tier-0 → persistence (golden ticket/AdminSDHolder/DCShadow/ACL).
4. **Measure** detection and prevention at each step (MTTD), with blue watching.
5. **Close gaps** — missing telemetry → fix collection; missing rule → write the Sigma detection; should-have-blocked → apply the control (ASR/VBS/app-control/tiering/LAPS/ADCS fix/signing+EPA); noisy → tune. Re-run until the chain lights up and MTTD is low.
6. **Reduce attack paths** — BloodHound to zero short paths to Domain Admin; audit ADCS templates and delegation.

## Part 2 — domain-recovery drill

Assume the emulation "succeeded" to tier-0 and rehearse recovery: clean foundation from tested backups, reset krbtgt (twice) and other signing/trust secrets, purge control-plane persistence (AdminSDHolder/ACL/sidHistory/delegation/GPO/ADCS), rotate federation/Entra Connect keys, and harden before reconnecting. **Measure MTTR** and validate the runbook actually works.

## The evidence you produce

- A **before/after ATT&CK coverage map** for that adversary, with MTTD per technique.
- **BloodHound paths-to-DA** reduced to zero; ADCS/delegation audited and fixed.
- A **validated forest-recovery runbook** with a measured recovery time and tested tier-0 backups.
- Program metrics — coverage, MTTD/MTTR, baseline compliance — trending the right way.

## The measure of a pro

You now span the full arc: from \`whoami\` on a lab VM to leading an intelligence-driven purple program and a domain-recovery capability. A pro AD defender can say, with evidence: "Against the adversaries that threaten us, we detect their chain (here is the coverage and MTTD), we have removed the escalation paths to Domain Admin, our identity fabric (AD, ADCS, federation) is hardened and monitored, and if the worst happens we have a tested recovery that rebuilds trust in measured time." That combination — validated detection, removed paths, hardened identity, and rehearsed recovery, all measured and continuously improved — is what defending Windows at the highest level actually means.

> Keep the loop turning: emulate, measure, harden, re-measure; drill recovery before you need it. The adversary keeps learning — so do you.`,
      sample: {
        lang: 'text',
        caption: 'Capstone scorecard: detect the adversary, and recover if they win',
        code: `PART 1 — purple team vs [chosen adversary]
  Technique chain            Before      After
  --------------------------------------------------
  Phishing / initial access  blind       detect 2m
  LOLBin execution           detect      detect + ASR block
  LSASS credential access    detect      block (CredGuard)
  ADCS ESC1 escalation       blind       detect + template fixed
  Coerce+relay to ADCS       blind       BLOCKED (EPA/LDAP signing)
  RBCD / lateral movement    blind       detect + fw segmentation
  Golden ticket persistence  blind       detect (anomalous TGT)
  Paths to Domain Admin (BH) 7 short     0 short

PART 2 — domain recovery drill
  krbtgt x2, trusts, DSRM reset ........ runbook validated
  AdminSDHolder/ACL/ADCS purge ......... complete
  MTTR (tier-0 -> clean, hardened) ..... 3 days (documented)`,
        output: `Evidence, before and after: we detect the adversaries that
threaten us, we removed the paths to Domain Admin, our identity
fabric is hardened, and we have a tested recovery if they win.
That — measured and continuously improved — is pro AD defence.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the essential outcome that makes a combined purple-team-plus-recovery exercise the capstone of an Active Directory defence program?',
        options: [
          'Proving the red team is highly skilled',
          'Concrete before/after evidence that you can detect a realistic adversary’s full chain (improved ATT&CK coverage and MTTD), that you have removed the escalation paths to Domain Admin and hardened the identity fabric, and that you can recover trust if compromised (a validated forest-recovery runbook with a measured MTTR) — all repeatable and improving',
          'A list of tools the SOC purchased',
          'Confirmation that the domain can never be compromised',
        ],
        answer: 1,
        explain:
          'The capstone integrates the whole track: intelligence-driven full-chain emulation (validated detection and prevention with measured MTTD), attack-path reduction and identity-fabric hardening (BloodHound to zero, ADCS/delegation fixed), and a rehearsed domain-recovery drill (a tested runbook with a real MTTR). Its value is the evidence — you can detect the adversaries that matter, you have closed the road to Domain Admin, and you can rebuild trust if they win — produced by a repeatable emulate-measure-harden-recover loop that keeps improving. Not "no one can ever get in," but measured, resilient, continuously-improving defence.',
        hint: 'What can you prove, with numbers, about both detecting the attack and surviving it if it succeeds?',
      },
    },
  ],
}

export default level
