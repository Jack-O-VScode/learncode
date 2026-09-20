import type { Level } from '../types'

const level: Level = {
  id: 'skilled',
  title: 'Advanced AD, hybrid identity and evasion',
  summary:
    'The advanced Windows frontier: ADCS attack chains and shadow credentials, advanced Kerberos and delegation, hybrid and cloud identity attacks (Entra ID, PRT, Golden SAML), EDR and telemetry evasion understood for testing detection, DPAPI and advanced credential access, stealthy AD persistence, and operating professionally. Authorized targets and your lab only.',
  outcomes: [
    'Chain ADCS attacks and abuse shadow credentials',
    'Use advanced Kerberos and delegation techniques',
    'Attack hybrid and cloud identity (Entra ID, PRT, Golden SAML)',
    'Understand EDR/telemetry evasion for realistic detection testing',
    'Perform DPAPI and advanced credential access',
    'Operate with AD OPSEC and report to drive remediation',
  ],
  steps: [
    {
      id: 'rwin-s-01',
      title: 'ADCS attack chains and shadow credentials',
      read: `The intermediate level introduced ADCS (ESC1); the skilled level goes deeper into the **ESC chains** and the related **shadow credentials** technique, because ADCS is frequently the fastest path to Domain Admin in a modern domain and appears in most real AD engagements.

## The wider ESC landscape

Beyond ESC1 (arbitrary SAN), the ESC classes cover many misconfigurations, and several **chain** with other techniques:

- **ESC1** — enrol + arbitrary SAN → cert as any user.
- **ESC2/ESC3** — permissive "any purpose"/enrolment-agent templates.
- **ESC4** — you have **write access to a template** (an ACL edge) → reconfigure it into an ESC1, then exploit → an ADCS attack reached via ACL abuse.
- **ESC6** — the CA globally honours attacker SANs (EDITF flag).
- **ESC7** — you have **rights over the CA** (ManageCA/ManageCertificates) → approve your own requests, or enable ESC6.
- **ESC8** — the HTTP enrolment endpoint is **NTLM-relayable** → coerce a DC, relay to the CA, get a DC certificate (the coercion/relay chain from the intermediate level) → DCSync → domain compromise.
- **ESC9–ESC16** — further schema/mapping/configuration issues discovered since.

## Certipy chains them

**Certipy** enumerates all of these (\`find -vulnerable\`) and abuses most (\`req\`, \`auth\`, and CA/template manipulation for ESC4/ESC7). The skilled workflow is to enumerate ADCS thoroughly, identify which ESC(s) apply, and chain them — often with ACL abuse (ESC4/ESC7) or coercion/relay (ESC8) — into a certificate that authenticates as a privileged user.

## Shadow credentials

A powerful related technique: if you have **write access to an account's \`msDS-KeyCredentialLink\` attribute** (a common ACL edge — GenericWrite/GenericAll over a user or computer), you can add your own **key credential** to it. This lets you authenticate as that account via PKINIT (Kerberos with certificates) using a key *you* control — effectively taking over the account without resetting its password (which is noisier and disruptive):

- Tools: **Whisker** / **pyWhisker** (add the shadow credential), then Certipy/Rubeus to authenticate and get the account's hash/TGT.
- It's stealthier than a password reset (the legitimate password still works, so the user isn't disrupted) and is a favourite way to abuse a GenericWrite ACL edge over a target account or computer.

## Why ADCS matters so much

- **Fast escalation** — ADCS is common and templates are often misconfigured, so it's frequently the quickest route to Domain Admin.
- **Persistence** — certificates are long-lived and survive password changes (the intermediate lesson).
- **Chains everywhere** — ADCS connects to ACL abuse (ESC4/ESC7), coercion/relay (ESC8), and shadow credentials, making it a hub of AD attack paths.

## The defensive mirror

These map to the defensive ADCS/AD hardening: audit templates and the CA (Certipy/Locksmith/PSPKIAudit — the same tools defenders use), remove dangerous template settings and CA flags, tighten enrolment and CA-management rights, enable EPA/disable NTLM on web enrolment (ESC8), control who can write \`msDS-KeyCredentialLink\` (shadow credentials) and template ACLs (ESC4), and — remediation-wise — **revoke issued certificates** (they survive password resets). When you chain ESC4 via an ACL edge, or add a shadow credential to a GenericWrite target, on an authorized test, you demonstrate exactly those gaps. Offence chains ADCS and shadow credentials; defence audits the PKI and locks down the enabling ACLs.`,
      sample: {
        lang: 'bash',
        caption: 'Shadow credentials (abuse a GenericWrite edge) and an ESC8 chain',
        code: `# SHADOW CREDENTIALS: GenericWrite over a target -> add a key you control
pywhisker -d corp.local -u jdoe -p 'Spring2024' --target svc-admin --action add
certipy auth -pfx svc-admin.pfx -dc-ip 10.10.10.10   # -> svc-admin's hash/TGT
#   (no password reset - stealthier; the user's password still works)

# ESC8 chain: coerce a DC, relay to ADCS web enrolment -> DC certificate
ntlmrelayx -t http://ca/certsrv/certfnsh.asp -smb2support --adcs --template DomainController
PetitPotam.py attacker-ip dc-ip        # coerce DC01$ to authenticate -> relayed`,
        output: `[pywhisker] added key credential to svc-admin (msDS-KeyCredentialLink)
[certipy]  got TGT + NT hash for svc-admin   <- account takeover, no pw reset
[esc8]     relayed DC01$ -> CA issued a DomainController cert -> DCSync -> domain
# ADCS chains with ACL abuse (ESC4/shadow creds) and coercion/relay
# (ESC8). Defences: audit templates/CA, EPA on web enrolment, control
# who can write KeyCredentialLink/template ACLs, REVOKE certs.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the "shadow credentials" technique (writing to an account’s `msDS-KeyCredentialLink`) often preferred over simply resetting that account’s password when you have GenericWrite over it?',
        options: [
          'Because password resets require Domain Admin',
          'Because adding a key credential lets you authenticate as the account (via PKINIT) using a key you control without changing its password — so it is stealthier and non-disruptive (the legitimate password still works and the user isn’t locked out or alerted), whereas a password reset disrupts the account and is noisier',
          'Because shadow credentials grant Domain Admin directly',
          'Because msDS-KeyCredentialLink cannot be audited',
        ],
        answer: 1,
        explain:
          'Both a password reset and shadow credentials abuse the same GenericWrite/GenericAll ACL edge over an account, but they differ in stealth and disruption. Resetting the password takes over the account but changes its password — locking out or alerting the legitimate user/service and often breaking things — which is noisy. Shadow credentials instead add an attacker-controlled key to the account’s `msDS-KeyCredentialLink` attribute, allowing authentication as that account via PKINIT (certificate-based Kerberos) while the original password keeps working, so the takeover is quiet and non-disruptive. That makes it a favourite way to abuse a write-access edge over a user or computer. Defensively, it is countered by controlling who can write `msDS-KeyCredentialLink` and monitoring for changes to it — and it can be audited, contrary to the distractor.',
        hint: 'What does resetting a password do to the real user, and what does adding a key credential avoid while still taking over the account?',
      },
    },

    {
      id: 'rwin-s-02',
      title: 'Advanced Kerberos and delegation',
      read: `The intermediate level covered the main Kerberos and delegation attacks; the skilled level adds the deeper techniques and ticket variants that appear in advanced AD engagements.

## Ticket variants beyond golden/silver

- **Diamond ticket** — instead of forging a TGT from scratch (golden, which can have tell-tale anomalies), you request a *legitimate* TGT and then *modify* it (using the krbtgt key) — so it blends better with real tickets and evades some golden-ticket detections.
- **Sapphire ticket** — a further refinement using S4U to obtain a legitimate PAC for a privileged user, embedded into a ticket — even stealthier.
- **Bronze bit (CVE-2020-17049)** — a delegation-related flaw allowing bypass of certain delegation protections.

The point: golden tickets are increasingly detectable (anomalous lifetimes, non-existent accounts), so advanced operators use variants that blend with legitimate tickets — which is why defenders moved to behavioural/PAC-validation detection.

## Advanced delegation

Deeper delegation abuse:

- **Constrained delegation with protocol transition** (TrustedToAuthForDelegation) — impersonate arbitrary users to the allowed service, even without them authenticating.
- **RBCD chains** — combining the MachineAccountQuota (create a computer), an ACL edge (write the RBCD attribute), and S4U, as the intermediate level showed — and reaching the write via coercion/relay to LDAP.
- **Cross-service S4U abuse** — using the returned ticket for services beyond the one nominally allowed (S4U ticket "alternate service" tricks).
- **Kerberos relay** — relaying Kerberos (not just NTLM) authentication in specific scenarios.

## S4U in depth

The **S4U2Self**/**S4U2Proxy** extensions (behind constrained delegation and RBCD) are worth understanding deeply because they're the mechanism of impersonation: S4U2Self gets a ticket *to yourself* as any user; S4U2Proxy forwards it to another service as that user. Controlling an account configured for delegation, plus these extensions, is what turns "I control this service account" into "I can impersonate any user to these services" — the core of delegation escalation.

## Why this depth matters

Advanced AD engagements — and modern well-monitored environments — require these refinements: diamond/sapphire tickets to evade golden-ticket detection, RBCD chains to escalate via ACL edges, and deep S4U understanding to abuse delegation reliably. They're the difference between the textbook attack (often detected) and the technique that works against a defended domain.

## The defensive mirror

These map to advanced defensive Kerberos hardening: the ticket variants exist because golden-ticket detection improved, so defenders use **PAC validation**, behavioural detection, and monitoring for delegation-attribute changes and S4U anomalies; delegation abuse is countered by eliminating unconstrained delegation, minimising and auditing constrained/RBCD, setting **MachineAccountQuota=0**, controlling who can write delegation attributes, and putting tier-0 accounts in **Protected Users** / "sensitive and cannot be delegated". When you use a diamond ticket or an RBCD chain on an authorized test, you demonstrate the limits of the domain's detection and its delegation hygiene — and the report's guidance is those advanced controls. Offence refines the tickets and chains the delegation; defence validates PACs and constrains the attributes.`,
      sample: {
        lang: 'text',
        caption: 'Why golden-ticket variants exist: evading detection',
        code: `GOLDEN ticket    forge a TGT from scratch (krbtgt key)
                 -> tell-tale: odd lifetime, non-existent account, PAC anomalies
                 -> increasingly DETECTED

DIAMOND ticket   request a LEGITIMATE TGT, then modify it (krbtgt key)
                 -> blends with real tickets -> evades some detection

SAPPHIRE ticket  use S4U to get a legitimate privileged PAC, embed it
                 -> even stealthier

Delegation: S4U2Self (ticket to self as any user) + S4U2Proxy (forward
to a service as that user) = impersonate arbitrary users. RBCD chains:
MachineAccountQuota + ACL write + S4U.

Defence: PAC validation, behavioural detection, no unconstrained
delegation, MachineAccountQuota=0, Protected Users, control attribute writes.`,
        output: `Advanced Kerberos: diamond/sapphire tickets modify LEGITIMATE
tickets to evade golden-ticket detection; deep S4U (S4U2Self/Proxy)
is the impersonation mechanism behind constrained delegation/RBCD.
These exist because textbook attacks got detected. Defences:
PAC validation, delegation hygiene, MachineAccountQuota=0,
Protected Users - the advanced Kerberos mirror.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do advanced operators use "diamond" or "sapphire" tickets instead of classic golden tickets in well-monitored domains?',
        options: [
          'Because golden tickets require Domain Admin and diamond tickets do not',
          'Because golden tickets (forged from scratch) can have tell-tale anomalies — unusual lifetimes, non-existent accounts, PAC inconsistencies — that detection now catches, whereas diamond/sapphire tickets are built by modifying or using legitimate tickets/PACs so they blend with real Kerberos traffic and evade some of that detection',
          'Because diamond tickets do not need the krbtgt key',
          'Because golden tickets no longer work at all',
        ],
        answer: 1,
        explain:
          'A classic golden ticket is fabricated entirely from the krbtgt key, and defenders learned to flag its artefacts — abnormal ticket lifetimes, tickets for accounts that don’t exist, and PAC inconsistencies. As that detection matured, advanced operators shifted to variants that start from *legitimate* material: a diamond ticket requests a real TGT and then modifies it with the krbtgt key, and a sapphire ticket uses S4U to obtain a legitimate privileged PAC to embed — both blending far better with genuine tickets and evading some golden-ticket detections. This arms race is exactly why defenders moved to PAC validation and behavioural detection. (All still ultimately rely on the krbtgt key or equivalent privileged access; they are stealth refinements, not lower-privilege attacks.)',
        hint: 'What makes a from-scratch golden ticket detectable, and how do diamond/sapphire tickets avoid those tells?',
      },
    },

    {
      id: 'rwin-s-03',
      title: 'Hybrid and cloud identity attacks',
      read: `Most enterprises are now **hybrid** — on-premises Active Directory synced with **Microsoft Entra ID** (Azure AD) for cloud services (Microsoft 365, Azure). This creates a whole additional attack surface, and pivots between on-prem and cloud in both directions. Understanding hybrid identity attacks is essential for modern AD engagements.

## The hybrid architecture

- **Entra ID (Azure AD)** — Microsoft's cloud identity provider for M365/Azure. Not a domain/AD, but the cloud identity fabric.
- **Entra Connect (Azure AD Connect)** — syncs on-prem AD to Entra ID. The **sync account** is highly privileged (it can write to both directories), making Entra Connect a prime target and a bridge between on-prem and cloud.
- **Authentication models** — password hash sync, pass-through authentication, or **federation (ADFS)** — each with its own attack surface.

## The key attacks

- **On-prem → cloud pivot** — compromise on-prem AD, then reach Entra ID: via the Entra Connect sync account (it has privileged access to Entra ID), or by compromising ADFS (below). On-prem Domain Admin often becomes cloud Global Admin through these bridges.
- **Golden SAML** — if you steal the **ADFS token-signing key** (from the ADFS server, which on-prem compromise can reach), you can **forge SAML assertions** to authenticate to federated cloud services as *anyone* — the cloud equivalent of a golden ticket (the defensive Windows pro lesson). It bypasses passwords and MFA and survives password resets until the key is rotated.
- **Primary Refresh Token (PRT) theft** — the PRT is the token granting SSO to cloud resources from a device; stealing it (from a compromised endpoint) grants the user's cloud access.
- **Illicit OAuth consent / malicious app registrations** — trick a user (or plant an app) into granting a malicious application persistent access to cloud data (a cloud-native persistence/access technique).
- **Cloud → on-prem** — in some configurations, cloud compromise can reach on-prem (e.g. via Intune management, or a hybrid-joined device), so the pivot runs both ways.

## Tools

**ROADtools**, **AADInternals**, **TokenTactics**, and BloodHound's Azure/Entra support (**AzureHound**) enumerate and attack the cloud identity graph — the same graph-path thinking, applied to Entra ID roles and relationships.

## Why it matters

The perimeter is now **identity**, spanning on-prem and cloud. An engagement that stops at on-prem Domain Admin may miss that the same compromise reaches the entire M365/Azure environment (and vice versa). Modern AD attack *is* hybrid-identity attack — the two directories are bridged, and the objective often lives in the cloud (email, data in M365, Azure resources) as much as on-prem.

## The defensive mirror

Hybrid attacks map to the defensive ITDR/hybrid controls you learned: protect the **Entra Connect sync account and server** as tier-0, protect and rotate the **ADFS token-signing key** (Golden SAML remediation is key rotation, like krbtgt), monitor and restrict **OAuth consent** (admin consent workflow), protect **PRTs** (device compliance, token protection), and monitor both directories with unified identity threat detection (the ITDR lesson). When you Golden SAML or pivot via Entra Connect on an authorized test, you demonstrate exactly those gaps — and the report's fixes are protecting the identity bridges and signing keys. Offence pivots across the hybrid identity fabric; defence protects the bridges, the keys, and monitors both sides.`,
      sample: {
        lang: 'text',
        caption: 'Golden SAML: the cloud equivalent of a golden ticket',
        code: `Hybrid: on-prem AD <--Entra Connect--> Entra ID (M365/Azure)

ON-PREM -> CLOUD pivots:
  Entra Connect sync account (privileged in Entra ID) -> cloud access
  ADFS token-signing key stolen -> GOLDEN SAML:
    forge SAML assertions -> authenticate to federated cloud as ANYONE
    (bypasses password + MFA; survives password resets)  <- like a golden ticket
  PRT theft from an endpoint -> the user's cloud SSO
  illicit OAuth consent -> a malicious app with persistent cloud access

Defence: protect Entra Connect (tier-0) + the ADFS signing key (rotate to
remediate), restrict OAuth consent, protect PRTs, monitor BOTH directories (ITDR).`,
        output: `Hybrid = on-prem AD synced to Entra ID; the perimeter is IDENTITY,
spanning both. Pivots: Entra Connect sync account, Golden SAML
(steal the ADFS signing key -> forge any cloud identity, bypassing
MFA - the cloud golden ticket), PRT theft, illicit OAuth consent.
On-prem Domain Admin often -> cloud Global Admin. Defences: protect
the bridges + signing keys, restrict consent, monitor both (ITDR).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is "Golden SAML" described as the cloud/federation equivalent of a golden ticket, and what does that imply for remediation?',
        options: [
          'Both require physical access to the domain controller',
          'Both forge identities by abusing a stolen signing key — krbtgt for Kerberos TGTs on-prem, the ADFS token-signing key for SAML assertions in the cloud — so the attacker can authenticate as anyone (bypassing passwords and MFA) and persist until the key is rotated; remediation is rotating that signing key, exactly as recovery from a golden ticket requires resetting krbtgt',
          'Both only affect a single user account',
          'Neither can be detected or remediated',
        ],
        answer: 1,
        explain:
          'A golden ticket forges Kerberos TGTs using the stolen krbtgt key; Golden SAML forges SAML assertions using the stolen ADFS token-signing key. In both, possession of the signing key lets the attacker mint valid identities for anyone — bypassing passwords and even MFA — and the forged credentials remain valid until the key is rotated, so the attack is durable, stealthy persistence. Because the on-prem compromise can reach the ADFS server that holds the key, it is a key hybrid pivot. Remediation mirrors the krbtgt case: rotate the token-signing key/certificate (and prevent the compromise that reached it), which is why defensive guidance treats the ADFS signing key, the Entra Connect sync account, and PRTs as tier-0 secrets to protect, rotate and monitor across both directories.',
        hint: 'Golden ticket abuses the krbtgt key. What key does Golden SAML abuse, and how do you remediate a stolen signing key?',
      },
    },

    {
      id: 'rwin-s-04',
      title: 'Understanding EDR and telemetry evasion',
      read: `Modern Windows environments run **EDR** (Endpoint Detection and Response) and rich telemetry that detect the AD attacks you've learned. Advanced operators — and the real adversaries they emulate — operate against these defences, so understanding evasion (conceptually) is essential for realistic testing and for advising defenders. This is knowledge for testing and improving detection, not for defeating protections maliciously.

## What EDR/telemetry sees (recall the defensive tracks)

EDR and Windows logging observe process execution and ancestry, command lines, script content (AMSI), API/syscall behaviour, file/registry/network activity, LSASS access, and behavioural patterns — the signals the defensive Windows track built detection on. Every offensive action generates some of these.

## The evasion categories (understood for detection testing)

- **AMSI bypass** — the Antimalware Scan Interface lets Defender inspect scripts (including de-obfuscated PowerShell/.NET) at runtime; attackers patch AMSI in their process so it returns "clean". Defenders detect the tampering and the absence of expected AMSI events.
- **ETW patching** — Event Tracing for Windows underlies much telemetry; attackers patch \`EtwEventWrite\` in their process to suppress events. Defenders treat telemetry going dark as a signal.
- **Userland unhooking** — EDRs hook API functions in \`ntdll\`/\`kernel32\` to observe behaviour; attackers overwrite the hooks with a clean copy or use direct/indirect syscalls to bypass them. EDRs increasingly detect hook tampering.
- **BYOVD (Bring Your Own Vulnerable Driver)** — load a signed-but-vulnerable driver, exploit it to run in the kernel, and kill or blind the EDR from below. Defenders use HVCI + the vulnerable-driver blocklist to prevent it, and alert on the driver load and the EDR service stopping.
- **Living off the land (LOLBAS)** — use trusted built-in binaries (the LOLBAS project catalogues them) so there's no malicious file; detected by behaviour and anomalous parent-child relationships.
- **Obfuscation and in-memory execution** — obfuscating scripts/payloads and running code in memory (never touching disk); detected behaviourally and via memory scanning.

## The arms race, understood

Evasion and detection co-evolve (the defensive lesson): a technique works, defenders build detection, attackers adapt. The durable insights:

- **No evasion is permanent** — detection catches up, so real adversaries continually adapt and defenders must keep improving.
- **Behaviour is harder to evade than signatures** — you can change a hash trivially, but to act you must still spawn processes, access LSASS, make connections; behavioural detection (the Pyramid of Pain's top) is durable.
- **Blinding is noisy** — patching AMSI/ETW, unhooking, and BYOVD are themselves detectable actions (the sensor stopping, telemetry going dark), so evasion trades one signal for another.

## The purple-team payoff (the point)

Understanding EDR evasion in depth exists to **improve detection**. On an authorized engagement, a tester who emulates an evasive adversary tests whether the blue team's detection holds against realistic tradecraft — and the report says exactly which techniques were caught, which slipped past, and how to detect the ones that slipped (harden the sensors, alert on the blinding, add behavioural detection). This is the offensive half of the purple-team loop, applied to endpoint/EDR detection.

## The honest frame and defensive mirror

This knowledge is dual-use — real adversaries evade too, which is precisely why defenders must understand it. The purpose here is realistic emulation to measure and improve detection, not to defeat protections for harm. It maps to the defensive Windows controls: **Tamper Protection** and **PPL for AV**, **HVCI + the vulnerable-driver blocklist** (BYOVD), enabling and protecting AMSI/ETW/command-line/PowerShell logging, treating telemetry gaps and EDR-service stops as high-severity signals, and out-of-band telemetry (network, off-host logging) so blinding one layer doesn't blind everything. Offence tests the evasion; defence hardens the sensors and detects the blinding.`,
      sample: {
        lang: 'text',
        caption: 'The evasion/detection arms race, and its purple-team output',
        code: `Evasion technique             Why detection still wins / the signal it leaves
-----------------------------------------------------------------------
AMSI/ETW patching          -> memory tampering; expected events go DARK
userland unhooking         -> hook tampering / direct-syscall patterns
BYOVD (kill/blind EDR)     -> vulnerable driver load + EDR service STOP
living off the land        -> behaviour + anomalous parent-child
in-memory / obfuscation    -> behavioural + memory scanning

Insight: you can change a hash trivially, but you can't avoid
spawning processes, reading LSASS, connecting -> behaviour is durable.
Blinding is itself a detectable action.

Purple output: "here's how an evasive adversary operates vs your EDR;
here's what you caught, MISSED, and how to close it."`,
        output: `EDR/telemetry sees execution, AMSI, LSASS access and behaviour.
Evasion (AMSI/ETW patch, unhook, BYOVD, LOLBAS, in-memory) exists,
but co-evolves with detection: behaviour is harder to evade than
signatures, and blinding is itself a signal. Understand it to TEST
and IMPROVE detection (the purple loop) - harden sensors (Tamper
Protection, HVCI+driver blocklist), treat telemetry gaps as alerts.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A capable attacker patches AMSI and ETW and kills the EDR via a vulnerable driver. How can a defender still detect this, and what is the correct purpose of a tester understanding these techniques?',
        options: [
          'They cannot detect it; and the tester’s purpose is to stay hidden',
          'The act of blinding is itself detectable — a known-vulnerable driver loading, the EDR service stopping unexpectedly, and expected telemetry (AMSI/ETW events) suddenly going dark are all high-signal indicators — and the tester’s purpose in understanding evasion is to emulate a realistic adversary to test and improve the blue team’s detection (the purple-team loop), not to defeat protections for harm',
          'Only a reboot reveals the attack; the tester’s purpose is to sell exploits',
          'Antivirus signatures always catch it; evasion is irrelevant',
        ],
        answer: 1,
        explain:
          'Evasion trades stealth-of-payload for noise-of-tampering: loading a vulnerable driver (BYOVD), stopping the EDR/AV service, and the resulting silence from a process that should emit AMSI/ETW events are all observable, and defenders alert on them, treat unexpected telemetry gaps as signals, keep out-of-band sensors, and harden the sensors (Tamper Protection, HVCI with the vulnerable-driver blocklist) to prevent or make the blinding loud. Crucially, a tester’s purpose in understanding these techniques is to emulate a realistic evasive adversary on an authorized engagement so as to measure whether detection holds and produce the detection-and-response assessment that improves it — the offensive half of the purple-team loop — not to defeat defences for harm. The knowledge is dual-use, which is exactly why both sides must understand it.',
        hint: 'Turning off the sensors is an action too — what does it look like in the telemetry you still have, and why would a tester want to know?',
      },
    },

    {
      id: 'rwin-s-05',
      title: 'DPAPI and advanced credential access',
      read: `Beyond LSASS and the SAM, Windows protects many secrets with **DPAPI** (Data Protection API), and there are further credential stores an advanced operator harvests. Understanding these extends credential access — the currency of AD — well beyond the basics.

## DPAPI

DPAPI encrypts secrets tied to a user or the machine, and is used pervasively:

- **What it protects** — saved browser passwords and cookies, Windows Credential Manager entries, saved RDP credentials, Wi-Fi keys, and many application secrets.
- **How it's abused** — with a user's context (or their password/hash), or with SYSTEM/the machine's DPAPI **master key**, you can decrypt DPAPI-protected secrets. On a DC, the **DPAPI domain backup key** can decrypt *any* domain user's DPAPI secrets — a powerful, less-noticed capability.
- Tools: Mimikatz (\`dpapi::\` modules), **SharpDPAPI**, **Impacket dpapi**.

DPAPI is valuable because it protects the "everyday" secrets users accumulate — browser-saved passwords (often reused, including for privileged systems), saved RDP creds (direct lateral movement), and Credential Manager entries — that LSASS dumping alone might miss.

## Other advanced stores

- **Cloud credentials** — Azure/AWS/GCP tokens and CLI credential caches on developer/admin machines (\`~/.azure\`, saved tokens), and PRTs (the hybrid lesson) — bridging to cloud.
- **Browser data** — saved passwords, cookies (session hijacking), and tokens (via DPAPI).
- **Application secrets** — password managers' data, saved credentials in dev tools, CI/CD tokens, database client saved connections.
- **Keytabs and Kerberos caches** — on hosts integrating with Kerberos.
- **LSA secrets** — service account passwords and cached secrets in the registry (secretsdump).
- **NTDS.dit** — the domain database (every hash) on a DC, via DCSync or extraction (the intermediate level).

## The advanced harvesting mindset

An advanced operator harvests *comprehensively*: not just LSASS and the SAM, but DPAPI-protected secrets (browser passwords, saved RDP, Credential Manager), cloud credentials, and application secrets — because any of them may hold a reusable credential (often for a privileged system) that LSASS didn't. The reuse principle amplifies this: a browser-saved password decrypted via DPAPI may be an admin's, reused for a domain account. Comprehensive credential access across all these stores is what maximises the chance of finding the credential that reaches the objective.

## The defensive mirror

These map to defensive credential protection: DPAPI abuse is limited by protecting the DPAPI domain backup key (tier-0), Credential Guard (LSASS), not saving credentials in browsers/RDP where avoidable, using a proper secrets manager, MFA (so a harvested password alone is insufficient), and monitoring for credential-store access. When you decrypt a saved RDP credential via DPAPI and reuse it on an authorized test, you demonstrate exactly those gaps. Offence harvests comprehensively across every store; defence protects the stores and the DPAPI keys, and limits credential reuse and exposure.`,
      sample: {
        lang: 'text',
        caption: 'Harvesting beyond LSASS: DPAPI-protected everyday secrets',
        code: `With a user's context / SYSTEM / the DPAPI master key, decrypt:
  browser saved passwords + cookies   -> reused passwords, session hijack
  Windows Credential Manager          -> saved credentials
  saved RDP credentials               -> direct lateral movement
  Wi-Fi keys, app secrets

SharpDPAPI / Mimikatz dpapi::
On a DC: the DPAPI DOMAIN BACKUP KEY decrypts ANY user's DPAPI secrets.

Plus: cloud tokens (~/.azure, PRTs), keytabs, LSA secrets, NTDS.dit.
Harvest COMPREHENSIVELY - a browser-saved admin password (reused for
a domain account) is a credential LSASS dumping alone would miss.`,
        output: `DPAPI protects everyday secrets (browser passwords/cookies, saved
RDP, Credential Manager) that LSASS dumping misses. Decrypt with a
user's context, SYSTEM, or the DPAPI master key; on a DC the DOMAIN
BACKUP KEY decrypts any user's DPAPI secrets. Harvest comprehensively
(DPAPI + cloud + app secrets); reuse amplifies the value. Defences:
protect the DPAPI backup key, Credential Guard, MFA, no saved creds.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does an advanced operator harvest DPAPI-protected secrets (browser passwords, saved RDP credentials, Credential Manager) in addition to dumping LSASS?',
        options: [
          'Because DPAPI secrets are the domain controller’s passwords',
          'Because DPAPI protects the everyday secrets users accumulate — saved browser passwords (often reused, including for privileged systems), saved RDP credentials (direct lateral movement), Credential Manager entries — which LSASS dumping alone may miss, so comprehensive harvesting across these stores maximises the chance of finding a reusable credential that reaches the objective',
          'Because DPAPI secrets cannot be encrypted',
          'Because LSASS never contains any credentials',
        ],
        answer: 1,
        explain:
          'LSASS holds the credential material of currently logged-on users, but a great deal of reusable secret material lives elsewhere under DPAPI protection: browser-saved passwords (frequently reused, sometimes for privileged systems), saved RDP credentials (which enable direct lateral movement), Windows Credential Manager entries, Wi-Fi keys and app secrets. An advanced operator decrypts these using a user’s context, SYSTEM, or the DPAPI master key (and, on a DC, the DPAPI domain backup key decrypts any user’s DPAPI secrets), because the reuse principle means any of them may be the credential that reaches the objective — one LSASS dumping would have missed. Comprehensive harvesting across all credential stores is what maximises reach, and the defences are protecting the DPAPI backup key, Credential Guard, MFA, and avoiding saved credentials.',
        hint: 'What kind of reusable secrets do users accumulate outside LSASS, and where does DPAPI protect them?',
      },
    },

    {
      id: 'rwin-s-06',
      title: 'Operating cleanly in AD',
      read: `Advanced AD engagements — especially red teams against monitored environments (which now run EDR and often Microsoft Defender for Identity) — require **operating cleanly**: minimal, deliberate, low-footprint action to realistically test detection, avoid disruption, and stay within the rules. This is AD-specific OPSEC, and understanding it also teaches defenders what a careful adversary looks like.

## Why AD OPSEC matters

- **To test detection realistically** — modern domains run **Microsoft Defender for Identity (MDI)** and EDR that detect the AD attacks (Kerberoasting's 4769 patterns, DCSync's 4662, lateral movement, ticket anomalies). A red team's job is to see whether the blue team catches a *careful* adversary; being needlessly loud tests nothing.
- **To avoid disruption** — you have enormous power once near Domain Admin; controlled operation avoids breaking production (a locked-out account, a crashed DC, disrupted authentication).
- **To stay in scope and safe**, with deconfliction so the client can distinguish your activity from a real attack.

## AD-specific clean operation

- **Prefer valid credentials over exploits** — pass-the-hash/ticket and reused credentials look like normal authentication, far quieter than exploits.
- **Choose techniques by noise** — WMI/WinRM over PsExec (service creation is loud); RC4-vs-AES-aware Kerberoasting; targeted rather than mass enumeration.
- **Blend with normal AD traffic** — authentication and LDAP queries happen constantly; small, well-timed actions blend, while mass ticket requests or fleet-wide enumeration spike.
- **Mind the AD-specific detections** — DCSync's 4662, anomalous ticket lifetimes (use diamond/sapphire over golden), delegation-attribute changes, and MDI's behavioural detections. Understanding what MDI/EDR flags shapes technique choice.
- **Careful tool use** — understand each tool's footprint on the target (files, processes, events); prefer built-in/LOTL; clean up.
- **Meticulous logging of your own actions** — for the report, cleanup, and deconfliction (the tester documents more than a real attacker).

## Deconfliction in AD

Because AD attacks can look like real intrusions (and a real intrusion could occur during your test), deconfliction is essential: an agreed contact, a timestamped log of your actions, and often identifiers so the blue team can confirm "red team or real?" — and so a genuine attacker mid-engagement is distinguishable. This is a safety and professionalism mechanism.

## The honest frame

AD OPSEC is realistic, controlled, documented operation on an authorized engagement — to test detection and avoid harm — not evasion for its own sake. It's dual-use (a real adversary practises AD OPSEC too), which is exactly why understanding it helps defenders: knowing that a careful attacker uses valid credentials, prefers quiet lateral-movement methods, and blends with normal AD traffic tells the blue team what subtle behaviours to hunt for beyond the loud attacks.

## The defensive mirror and purple payoff

Clean AD operation directly tests the AD detections you learned defensively (MDI, the 4769/4662/ticket-anomaly detections, behavioural AD analytics), and the report's value is the detection-and-response assessment: "here's how quietly we moved to Domain Admin; here's what MDI/your SOC caught and missed; here's how to detect the quiet path." That's the offensive half of purple teaming in AD — and it's why understanding both the attacks and their detection is what makes an advanced AD tester valuable to defence.`,
      sample: {
        lang: 'text',
        caption: 'Loud vs clean AD operation, against a monitored domain',
        code: `Loud (normal pentest)            Clean (stealth red team vs MDI/EDR)
-----------------------------------------------------------------
mass BloodHound + enum spikes    targeted, paced enumeration
throw exploits                   prefer valid creds (PtH/PtT = normal-looking)
PsExec (service created, 7045)   WMI/WinRM (quieter)
golden ticket (odd lifetime)     diamond/sapphire (blend with real tickets)
RC4 Kerberoast everything        targeted, AES-aware
constant activity                blend with normal AD auth/LDAP traffic

Deconfliction: agreed contact + timestamped action log + identifiers
  -> blue team tells "red team or real?"; a real intruder is distinguishable.
Purple output: "here's the quiet path to DA; what you caught + missed."`,
        output: `AD OPSEC = realistic, controlled, documented operation to test
detection (MDI/EDR) and avoid harm. Prefer valid creds, quieter
lateral-movement methods, diamond over golden, targeted enum,
blending with normal AD traffic - plus deconfliction. Understanding
it teaches defenders the subtle behaviours to hunt. The value is
the detection assessment - the offensive half of AD purple teaming.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When conducting a stealthy red-team engagement against an AD environment running Microsoft Defender for Identity and EDR, why does operating cleanly (minimal, quiet, valid-credential-based) matter?',
        options: [
          'Because it lets the team break the law without consequences',
          'Because realistic quiet operation is what genuinely tests whether the blue team can detect a careful adversary (being needlessly loud only tests whether they catch noise), reduces the risk of disrupting production, and — with deconfliction — lets the client distinguish the team’s activity from a real attacker; the resulting detection assessment is the engagement’s core value',
          'Because clean operation makes the attacks work faster',
          'Because MDI cannot detect anything regardless',
        ],
        answer: 1,
        explain:
          'A red team’s purpose against a monitored domain is to measure detection and response, so it must operate the way a careful real adversary would — preferring valid credentials (pass-the-hash/ticket look like normal authentication), choosing quieter lateral-movement methods, using ticket variants that blend with legitimate ones, and pacing enumeration to blend with normal AD traffic — because flooding the domain with loud activity only tests whether the blue team catches noise, not skill. Clean operation also reduces the chance of disrupting production (locked-out accounts, a crashed DC), and deconfliction (an agreed contact, a timestamped action log, identifiers) lets the client tell the team’s activity from a real intrusion and distinguish a genuine attacker mid-engagement. The engagement’s core value is the resulting detection-and-response assessment — the offensive half of AD purple teaming — not law-breaking or speed.',
        hint: 'What does being loud actually test against a monitored domain, and how does the client tell your activity from a real attacker?',
      },
    },

    {
      id: 'rwin-s-07',
      title: 'Stealthy AD persistence in depth',
      read: `The intermediate level surveyed AD persistence; the skilled level examines the **stealthier** techniques in depth — the ones that survive partial cleanups and evade casual hunting — because a red team demonstrating durable, hard-to-detect persistence is a critical finding about the blue team's detection and recovery. (Used sparingly on authorized tests, documented and removed.)

## The stealthy techniques, deeper

- **Golden ticket, refined** — diamond/sapphire variants (the earlier step) for persistence that blends with legitimate tickets and evades golden-ticket detection.
- **ADCS certificate persistence** — a certificate for a privileged user (the ESC attacks) is durable (long-lived) and stealthy (survives password resets, doesn't touch the usual persistence spots). A favourite because certificate-based persistence is often missed by teams focused on accounts and tickets — and remediation requires certificate *revocation*, not password resets.
- **DCSync ACL backdoor** — grant an innocuous, low-profile account the replication rights (via a subtle ACL change) so it can DCSync any hash at will. Quiet, and easily missed without ACL auditing.
- **AdminSDHolder** — the self-healing ACL persistence (SDProp re-stamps it hourly); must be cleaned at the source (the intermediate lesson).
- **DCShadow** — register a rogue DC and push changes via replication, bypassing normal change logging — a stealthy way to plant persistence (add SID history, modify ACLs) that evades object-change auditing.
- **SID history injection** — carry a privileged group's SID on a controlled account invisibly.
- **Shadow credentials on privileged accounts** — a durable, quiet way to retain access to an account (the earlier step).
- **DSRM and Skeleton Key** — DC-level backdoors (the intermediate survey).
- **Computer account / machine key persistence** — abusing machine accounts and their keys for durable access.

## Why stealth matters for persistence

The value of a red team demonstrating stealthy persistence is testing **detection and recovery**: can the blue team detect these techniques, and — critically — would their incident recovery actually evict them? Because these techniques survive partial cleanups (an ADCS cert survives a password reset; AdminSDHolder re-stamps; a DCSync ACL backdoor persists), demonstrating them tests whether the organisation's tier-0 recovery is a proper *rebuild of trust* or a superficial cleanup that leaves the attacker inside.

## The professional discipline (emphasised)

Stealthy AD persistence is *powerful and durable*, so the discipline is strict: use it sparingly and within the rules of engagement, **document every mechanism precisely** (what, where, exactly how), and **remove all of it** at the end, providing the client a verifiable list. Leaving a golden-ticket capability, an ADCS backdoor, a DCSync ACL grant, or a shadow credential on a client's domain would be a real, powerful backdoor — a grave professional and security failure. The value is demonstrating and documenting the *capability* and testing detection/recovery, never maintaining covert access.

## The defensive mirror

Stealthy persistence maps directly to the defensive AD hunting and recovery you learned: hunt the control plane (AdminSDHolder ACL, replication rights, sidHistory, delegation attributes, ADCS certificates, DSRM), detect the techniques (DCShadow's replication anomalies, anomalous tickets, KeyCredentialLink changes), and recover from tier-0 compromise deliberately — reset krbtgt twice, clean AdminSDHolder at the source, revoke certificates, audit and remove rogue replication rights, and assume multiple mechanisms exist. When you demonstrate stealthy persistence on a test, the report's guidance is exactly that systematic detection and rebuild-of-trust recovery. Offence hides durably in AD's control plane; defence hunts the same control plane and knows recovery is a rebuild of trust, not a cleanup.`,
      sample: {
        lang: 'text',
        caption: 'Stealthy AD persistence, and why it tests recovery',
        code: `Technique                    Why stealthy / survives partial cleanup
-----------------------------------------------------------------------
ADCS cert for a priv user   long-lived, survives PASSWORD RESETS (needs revoke)
DCSync ACL backdoor         quiet replication grant on a low-profile account
AdminSDHolder ACE           SDProp re-stamps hourly (self-healing)
DCShadow                    rogue-DC replication bypasses change logging
diamond/sapphire ticket     blends with legitimate tickets
shadow credential           quiet account retention (no password change)

Demonstrating these tests DETECTION and RECOVERY: would the blue
team's cleanup actually EVICT them? (reset krbtgt x2, clean
AdminSDHolder at source, REVOKE certs, remove rogue replication rights)

On authorized tests: use sparingly, DOCUMENT precisely, REMOVE all.`,
        output: `Stealthy AD persistence (ADCS certs, DCSync ACL backdoors,
AdminSDHolder, DCShadow, diamond tickets, shadow credentials)
survives partial cleanups, so demonstrating it tests whether the
blue team can DETECT it and whether recovery is a real rebuild of
trust. Used sparingly, documented, REMOVED. Defence: hunt the
control plane; recovery = rebuild trust, not cleanup.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is demonstrating stealthy AD persistence (like an ADCS certificate or a DCSync ACL backdoor) valuable on a red-team engagement, and what strict rule governs it?',
        options: [
          'It lets the team keep permanent access; there are no rules',
          'It tests whether the blue team can detect the technique and whether their incident recovery would actually evict it (these survive partial cleanups like password resets), which reveals if tier-0 recovery is a real rebuild of trust; and it is strictly governed — used sparingly within the rules of engagement, every mechanism documented precisely, and all of it removed at the end',
          'It proves the domain controller is fast; no cleanup needed',
          'It only matters for compliance paperwork',
        ],
        answer: 1,
        explain:
          'Stealthy persistence techniques are durable precisely because they survive the obvious remediation — an ADCS certificate keeps authenticating after a password reset (needing revocation), a DCSync ACL backdoor persists as a quiet replication grant, AdminSDHolder re-stamps itself. Demonstrating them therefore tests two things: whether the blue team can detect the technique, and — critically — whether their incident recovery is a proper rebuild of trust (reset krbtgt twice, clean AdminSDHolder at source, revoke certificates, remove rogue replication rights, assume multiple mechanisms) rather than a superficial cleanup that leaves the attacker inside. Because these are real, powerful backdoors, the governing rule is strict: use sparingly within the rules of engagement, document every mechanism precisely, and remove all of it at the end — leaving any behind would be a grave professional and security failure.',
        hint: 'These survive password resets and partial cleanups — so what do they test about recovery, and what must the tester never leave behind?',
      },
    },

    {
      id: 'rwin-s-08',
      title: 'Attacking AD-integrated services',
      read: `AD environments contain many **integrated services** — Exchange, SCCM/MECM, SQL, backup systems, monitoring, and more — that are often highly privileged and represent rich, sometimes overlooked attack paths to Domain Admin. Advanced engagements target these because they frequently hold the keys to the domain.

## The pattern: over-privileged integrated services

Many enterprise services integrate deeply with AD and run with high privilege — historically far more than they need — so compromising the service compromises the domain:

- **Exchange** — historically had extensive AD permissions (the Exchange Windows Permissions group could be abused to grant DCSync rights — the "PrivExchange"/Exchange-ACL attacks). Exchange servers are prime targets, and Exchange's AD footprint has been a repeated source of domain-compromise paths.
- **SCCM / MECM (Configuration Manager)** — manages and deploys software to endpoints across the domain, so compromising SCCM can push code to *many* machines (mass lateral movement / deployment) and its accounts are often highly privileged. SCCM attack paths (network access accounts, credential harvesting, deployment abuse) are a significant modern area.
- **SQL Server** — the MSSQL attacks (the intermediate level): xp_cmdshell, over-privileged service accounts, linked-server crawling.
- **Backup systems** — backup software often has broad read access (to back everything up) and privileged accounts, so compromising it can yield credentials and data across the domain, and access to backups (which may contain NTDS.dit or credentials).
- **Monitoring / management tools** — often have agents on many hosts and privileged accounts, making them a route to fleet-wide access (like the Linux orchestration-server lesson).
- **PKI / ADCS** — the certificate service (the ADCS attacks).

## Why these matter

These services are attractive because:

- They're often **over-privileged** (excessive AD permissions granted at install or over time).
- They **reach many hosts** (deployment, backup, monitoring agents), enabling mass lateral movement.
- They **hold credentials** (service accounts, stored credentials for the systems they manage).
- They're **sometimes less monitored** than DCs, yet effectively tier-0 in impact.

An advanced tester enumerates the AD-integrated services present and assesses each as a potential path — Exchange's ACLs, SCCM's deployment capability and accounts, backup software's access, SQL servers — because these frequently provide a faster or stealthier route to domain compromise than the "pure AD" attacks alone.

## The defensive mirror

These map to defensive controls: apply **least privilege** to integrated services (Exchange split-permissions model, scoped SCCM accounts, backup accounts with minimal rights), treat servers running privileged integrated services as **tier-0** (they're as sensitive as DCs), harden and patch them, monitor them closely, and protect the credentials and backups they hold. When you reach Domain Admin via an over-privileged Exchange or SCCM on an authorized test, you demonstrate exactly that over-privilege — and the report's fix is least privilege and tier-0 treatment for these services. Offence rides the over-privileged integrated service; defence scopes its rights and treats it as the tier-0 asset it effectively is.`,
      sample: {
        lang: 'text',
        caption: 'Over-privileged integrated services as paths to Domain Admin',
        code: `Service        Why it's a path to the domain
-----------------------------------------------------------------------
Exchange       historically broad AD permissions -> grant DCSync (PrivExchange
               / Exchange-ACL abuse); Exchange servers = prime targets
SCCM/MECM      deploys software to MANY endpoints -> mass lateral movement;
               network access accounts + credential harvesting
SQL Server     xp_cmdshell, over-priv service accounts, linked-server crawl
Backup systems broad read access + privileged accounts; backups may hold
               NTDS.dit / credentials
Monitoring     agents on many hosts + privileged accounts -> fleet access

Often over-privileged, reach many hosts, hold credentials, and are
LESS monitored than DCs - yet tier-0 in impact.
Defence: least privilege, treat as TIER-0, harden, monitor, protect backups.`,
        output: `AD-integrated services (Exchange, SCCM, SQL, backup, monitoring)
are rich paths to Domain Admin: often over-privileged, reaching
many hosts, holding credentials, and less monitored than DCs -
yet tier-0 in impact. Enumerate and assess each. Defences: least
privilege on integrated services, treat them as TIER-0, harden and
monitor - the mirror of riding their over-privilege.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are AD-integrated services like Exchange, SCCM, and backup systems such valuable (and sometimes overlooked) paths to Domain Admin?',
        options: [
          'Because they have no accounts in Active Directory',
          'Because they are frequently over-privileged (excessive AD permissions), reach many hosts (deployment, backup, monitoring agents enabling mass lateral movement), hold credentials, and are often less monitored than domain controllers — yet are tier-0 in impact, so compromising them can be a faster or stealthier route to domain compromise than pure-AD attacks',
          'Because they run outside Active Directory entirely',
          'Because they cannot be compromised, only DCs can',
        ],
        answer: 1,
        explain:
          'Enterprise services that integrate with AD tend to accumulate broad privileges (Exchange historically had AD permissions that could be abused to grant DCSync; SCCM and backup/monitoring accounts are commonly over-privileged), and by design they reach across the estate — deploying software, backing up everything, or running agents on many hosts — which enables mass lateral movement and access to widely-held credentials. Critically, teams often monitor DCs closely while treating these servers as ordinary, even though a compromise of them is tier-0 in impact. That combination — over-privilege, broad reach, held credentials, and weaker monitoring — makes them a rich and sometimes faster or stealthier route to Domain Admin, which is why the defence is least privilege on integrated services and treating them as the tier-0 assets they effectively are.',
        hint: 'Think about how much privilege these services hold, how many hosts they reach, and whether they’re watched as closely as DCs.',
      },
    },

    {
      id: 'rwin-s-09',
      title: 'Reporting advanced AD engagements',
      read: `Advanced AD engagements produce complex, multi-technique compromises across on-prem and cloud, and communicating them so they drive remediation is a defining skilled capability. The reporting principles from the Linux track apply, with AD-specific depth.

## The attack path is the core narrative

An AD compromise is a chain (the intermediate lesson), so the report's heart is the **attack path** from foothold to Domain Admin (and cloud, in hybrid environments), told step by step with a diagram. This conveys the true business risk — "a single sprayed credential led to full domain and Microsoft 365 compromise" — that a list of separate findings would understate.

## Choke points: the most valuable guidance

Because the path is a chain, the report highlights **choke points** — the edges whose remediation breaks the whole chain (BloodHound-style thinking). For AD specifically, common high-impact fixes that break many paths:

- **Tiered administration** — removes the harvestable Domain Admin sessions that so many paths rely on.
- **LAPS** — breaks pass-the-hash lateral movement via local admin.
- **gMSA** — defeats Kerberoasting of service accounts.
- **ADCS template/CA hardening** — closes the ESC paths.
- **Least-privilege ACLs** — cuts the ACL-abuse edges.
- **Least privilege on integrated services** (Exchange/SCCM) — removes those paths.

Presenting "fix these few things first and most of the paths to Domain Admin disappear" is far more actionable than an undifferentiated finding list — it's prioritised, high-impact remediation.

## Mapping findings to defensive controls

The most valuable AD report maps each finding directly to the defensive control that fixes it (the offence-defence mirror made explicit in the deliverable): "Kerberoastable weak service account → gMSA; reused local admin → LAPS; ADCS ESC1 → fix the template and revoke certs; over-privileged Exchange → apply split permissions; harvestable DA session → tiered administration." This gives the blue team a concrete, prioritised plan in their own terms.

## The detection-and-response assessment (for red teams)

For red-team engagements, the detection assessment is as important as the vulnerabilities: which AD attacks did MDI/the SOC detect, which slipped past, and how to detect the misses (the purple-team output). This directly improves the blue team's detection.

## Multiple audiences and the hybrid dimension

- **Executive summary** — the business risk in plain language ("full domain and cloud compromise from one weak password"), for leadership.
- **Technical findings** — each with evidence, reproduction, and specific remediation.
- **The hybrid picture** — if the compromise spanned on-prem and cloud (Golden SAML, Entra Connect), the report covers both, because the risk isn't fully conveyed by on-prem alone.

## Notes and the whole point

As always, the meticulous notes kept throughout are what the complex AD attack path is reconstructed from and what lets it be reproduced and verified. And the deliverable's purpose is remediation: the report turns a complex domain compromise into a prioritised, choke-point-aware, control-mapped plan that makes the organisation more secure. An advanced AD tester is judged not on reaching Domain Admin (given time, usually achievable) but on communicating the path, the choke points, the control mappings, and the detection gaps so clearly that the domain — and its cloud — end up measurably harder to compromise. That is the point of the engagement.`,
      sample: {
        lang: 'text',
        caption: 'An AD report: path, choke points, and control mappings',
        code: `EXECUTIVE: one sprayed password -> full domain AND M365 compromise. Priority.

ATTACK PATH (with diagram):
  spray -> jdoe -> Kerberoast svc-sql -> ACL abuse -> RBCD -> DCSync ->
  golden ticket -> Domain Admin -> Entra Connect -> Global Admin (cloud)

FINDINGS -> DEFENSIVE CONTROL (mapped, prioritised):
  weak Kerberoastable svc-sql   -> gMSA
  reused local admin password   -> LAPS
  harvestable DA session        -> TIERED ADMINISTRATION   <- choke point
  ADCS ESC1 template            -> fix template + revoke certs
  Entra Connect exposure        -> protect sync account (tier-0)

CHOKE POINT: tiered administration breaks the final on-prem step - fix first.
DETECTION: DCSync (4662) MISSED by SOC -> add the detection.`,
        output: `Advanced AD reports center the ATTACK PATH (on-prem + cloud), map
each finding to its defensive CONTROL (gMSA/LAPS/tiering/ADCS
fixes/Entra Connect protection), highlight CHOKE POINTS that break
many paths, and (for red teams) include the DETECTION assessment.
Prioritised, control-mapped, choke-point-aware remediation is the
value - reaching DA is expected; making the domain+cloud harder is the point.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What makes an advanced AD engagement report most valuable to the defending organisation?',
        options: [
          'A long list of every individual finding with equal priority',
          'The attack path (on-prem and cloud) with choke points highlighted, each finding mapped to the specific defensive control that fixes it and prioritised by impact, plus (for red teams) a detection-and-response assessment — so the organisation gets a concrete, prioritised, control-mapped plan where fixing a few choke points breaks most paths to Domain Admin',
          'Proof that the tester reached Domain Admin quickly',
          'A count of the tools that were run',
        ],
        answer: 1,
        explain:
          'An AD compromise is a chain, so the report’s value lies in conveying the path (including the hybrid on-prem/cloud dimension) and, crucially, identifying the choke points — the edges whose remediation breaks many paths (tiered administration removing harvestable DA sessions, LAPS breaking pass-the-hash, gMSA defeating Kerberoasting, ADCS hardening closing ESC paths). Mapping each finding to the specific defensive control that fixes it and prioritising by impact gives the blue team a concrete plan in their own terms, and for red teams the detection-and-response assessment (what MDI/the SOC caught and missed) improves detection. Reaching Domain Admin is expected given time; the engagement’s worth is measured by how much the report makes the domain and its cloud harder to compromise — prioritised, control-mapped, choke-point-aware remediation, reconstructed from meticulous notes.',
        hint: 'Is the value the fact of reaching DA, or a prioritised plan that maps findings to controls and shows which few fixes break most paths?',
      },
    },

    {
      id: 'rwin-s-10',
      title: 'Assume breach and internal red teaming',
      read: `Many advanced AD engagements start not from the internet but from an **assumed breach** — the team is given a foothold (a standard workstation, a low-privileged domain account) and asked "from here, how far can an attacker get, and would you detect them?" This reflects the assume-breach reality and tests the *internal* security posture, which is where AD attacks live.

## Why assume-breach engagements

- **Reflects reality** — initial access happens (phishing, a vulnerable service, a stolen credential), so the more important question is often "what happens *after* the foothold?" rather than "can we get in at all?"
- **Tests the internal posture** — the AD attacks (escalation, lateral movement, credential theft, the path to Domain Admin) all happen post-foothold, so starting from a foothold focuses the engagement on exactly the internal weaknesses AD security is about.
- **Efficient** — it skips the initial-access phase (which a separate test or the org's controls may cover) to spend the engagement's time on the internal path and detection.

## The assume-breach starting point

The team is typically given something like:

- A **standard corporate workstation** (or an equivalent build), as if an employee's machine was compromised — modeling the phishing/endpoint-compromise scenario.
- A **low-privileged domain account** (an ordinary user's credentials), as if a credential was phished or sprayed.
- Sometimes just network access as an "insider" or a connected device.

From there, the engagement runs the AD methodology: enumerate (BloodHound from the foothold), escalate, harvest credentials, move laterally, and pursue Domain Admin — testing both the exploitability (the path) and the detection (what the blue team catches).

## What it tests that external testing doesn't

- **The soft interior** — external testing probes the perimeter; assume-breach tests what happens once inside, which is where flat networks, credential reuse, over-privileged accounts, and weak AD hygiene bite (the segmentation/tiering failures).
- **Internal detection** — whether the blue team detects lateral movement, credential theft, and AD attacks *inside* the network (MDI, EDR, the AD detections), which is exactly the assume-breach detection focus.
- **Blast radius** — how far a single foothold reaches, which measures the effectiveness of segmentation, tiering, LAPS, and least privilege at containing a breach.

## The purple-team fit

Assume-breach engagements pair naturally with purple teaming: since initial access is granted, the focus is the internal path and its detection, so the output is directly "here's how far the foothold reached, here's the path, here's what you detected and missed, here's how to contain and detect it better." This tests exactly the defensive assume-breach posture — the recognition that prevention fails, so detection, response, and blast-radius containment are what matter.

## The defensive mirror

Assume-breach red teaming is the offensive expression of the defensive **assume-breach** principle (which ran through the defensive tracks): both sides accept that a foothold will happen and focus on containment, detection, and response. The engagement tests whether the defensive controls that assume breach — segmentation, tiering, LAPS, Credential Guard, least privilege, and internal detection (MDI/EDR) — actually contain and catch a real internal adversary. When an assume-breach team reaches Domain Admin from a standard workstation on an authorized test, they demonstrate that the internal posture didn't contain the breach — and the report's guidance is exactly those assume-breach controls. Offence tests from the assumed foothold; defence proves its assume-breach controls contain and detect it.`,
      sample: {
        lang: 'text',
        caption: 'Assume-breach: given a foothold, test the internal posture',
        code: `START: a standard corporate workstation + a low-priv domain user
       (as if an employee was phished) - NO external initial-access phase

TESTS (the internal / post-foothold reality where AD attacks live):
  the soft interior   -> flat network? credential reuse? over-priv accounts?
  blast radius        -> how far does ONE foothold reach? (segmentation/tiering)
  internal detection  -> does MDI/EDR catch lateral movement, cred theft, AD attacks?

OUTPUT (purple): "from a standard workstation we reached Domain Admin in
  N hops; here's the path, what you DETECTED, what you MISSED, and how to
  contain + detect it" -> tests the DEFENSIVE assume-breach controls.`,
        output: `Assume-breach engagements grant a foothold (a workstation / a
low-priv account) and ask "from here, how far, and would you
detect it?" - reflecting that initial access happens and focusing
on the INTERNAL posture where AD attacks live. Tests the soft
interior, blast radius, and internal detection. It's the offensive
expression of the defensive assume-breach principle: prevention
fails, so containment + detection + response are what matter.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do many advanced AD engagements start from an "assumed breach" (a given foothold) rather than testing external initial access?',
        options: [
          'Because external access is impossible to test',
          'Because initial access happens in reality, so the more important question is what an attacker can do *after* a foothold — and the AD attacks (escalation, lateral movement, credential theft, the path to Domain Admin) and internal detection all live post-foothold — so starting from a foothold focuses the engagement on the internal posture, blast radius, and detection, testing the defensive assume-breach controls',
          'Because it avoids needing any authorization',
          'Because external testing always fails',
        ],
        answer: 1,
        explain:
          'Assume-breach engagements accept the assume-breach reality — footholds happen via phishing, a vulnerable service, or a stolen credential — and therefore concentrate on the question that usually matters more: what can an attacker achieve once inside? That is precisely where AD security lives, because escalation, lateral movement, credential theft, and the path to Domain Admin are all post-foothold, as is internal detection (MDI/EDR). Granting a starting point (a standard workstation or a low-privileged account) skips the initial-access phase to spend the engagement testing the soft interior, the blast radius of a single foothold (which measures segmentation/tiering/LAPS/least-privilege effectiveness), and whether the blue team detects an internal adversary. It is the offensive expression of the defensive assume-breach principle: prevention will fail, so containment, detection, and response are what get tested — and it still requires full authorization.',
        hint: 'Where do the AD attacks and internal detection actually happen — before or after the foothold — and what does that focus test?',
      },
    },

    {
      id: 'rwin-s-11',
      title: 'The offensive-defensive unity in AD',
      read: `Before the pro level, step back to the theme that has run through every step of this track: in Active Directory more than anywhere, **offence and defence are the same knowledge**, and the same tools, applied toward the same goal. Internalising this is what makes an advanced AD practitioner valuable to both sides — because they are, properly understood, the same discipline.

## Every AD attack is a defensive control in reverse

Look back across the track — each attack maps precisely to a defensive control from the Defensive Windows track:

- **Kerberoasting** ↔ gMSA, strong service passwords, no RC4.
- **AS-REP roasting** ↔ clear the pre-auth-disabled flag.
- **Pass-the-hash** ↔ LAPS, Credential Guard.
- **DCSync** ↔ restrict replication rights, alert on 4662 from non-DCs.
- **Golden/silver tickets** ↔ protect krbtgt, double reset, PAC validation.
- **ADCS (ESC) attacks** ↔ template/CA hardening, EPA, certificate revocation.
- **Delegation/RBCD** ↔ delegation hygiene, MachineAccountQuota=0, Protected Users.
- **Coercion/relay** ↔ SMB/LDAP signing, EPA, disable NTLM.
- **ACL abuse** ↔ least-privilege ACLs.
- **Golden SAML/hybrid** ↔ protect signing keys, Entra Connect, PRTs.
- **Persistence** ↔ AD control-plane hunting and rebuild-of-trust recovery.

There is no AD attack in this track that isn't a defensive finding in reverse.

## BloodHound: the tool both sides run identically

The clearest embodiment: **BloodHound** is run by attackers to find the path to Domain Admin and by defenders to find and cut the same paths — the *identical tool and data*, aimed in opposite directions. The defensive metric "paths to Domain Admin trending to zero" is measured with the attacker's tool. AD attack and AD defence are, at BloodHound, literally the same activity.

## Why the unity matters

- **Offence makes you a better AD defender** — you can only defend AD against what you understand, and nothing teaches you the danger of an over-broad ACL, a Kerberoastable account, or a harvestable DA session like exploiting it. The best AD defenders think in attack paths because they've walked them (in authorized contexts).
- **Defence makes you a better AD attacker** — understanding MDI, tiering, and how defenders think makes you a more effective, realistic tester.
- **Purple teaming is the unity made explicit** — the tester's AD attacks directly test and improve the blue team's detections and controls, in a loop.

## The shared purpose

Authorized AD offence and AD defence **share a goal**: a domain that's hard to compromise. The tester attacks toward Domain Admin *so that* the defender can remove the road to it — every path found is a path to be cut, every attack a control to apply. The report is where AD offence becomes AD defence: the compromise is converted into prioritised, choke-point-aware hardening.

## The frame that makes it legitimate

This unity is also what keeps AD offence ethical and legal: it exists to make AD more secure, on authorized targets, with the goal of fixing what's found. Detached from that — AD attack for its own sake, on unauthorized domains, without remediation — it's just crime against an organisation's most critical asset. The unity with defence isn't just an insight; it's the justification for the discipline. You learn to attack AD so that you, and the defenders you work with, can better defend the domain — which is what offensive AD security *is*.`,
      sample: {
        lang: 'text',
        caption: 'Every AD attack ↔ a defensive control; BloodHound run by both',
        code: `AD ATTACK (this track)        DEFENSIVE CONTROL (the blue track)
-----------------------------------------------------------------------
Kerberoasting             <-> gMSA, strong service pw, no RC4
pass-the-hash             <-> LAPS, Credential Guard
DCSync                    <-> restrict replication, alert 4662 (non-DC)
golden ticket             <-> protect krbtgt, double reset, PAC validation
ADCS ESC                  <-> template/CA hardening, EPA, revoke certs
delegation / RBCD         <-> delegation hygiene, MachineAccountQuota=0
ACL abuse                 <-> least-privilege ACLs
Golden SAML / hybrid      <-> protect signing keys, Entra Connect, PRTs

BLOODHOUND: attacker finds the path to DA; defender cuts the same
edges. IDENTICAL tool + data, opposite goals. Same activity.`,
        output: `In AD especially, offence and defence are the SAME knowledge,
tools, and goal: every AD attack maps to a defensive control, and
BloodHound is run identically by both sides (find the path / cut
the path). Offence makes you a better AD defender and vice versa;
purple teaming is the unity explicit; the report converts
compromise into hardening. Authorized AD offence exists to make
the domain harder to own - the discipline's justification.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the clearest embodiment of offence and defence being the same discipline in Active Directory?',
        options: [
          'Attackers and defenders use entirely different tools',
          'BloodHound is run identically by both sides on the same data — attackers query it to find the shortest path to Domain Admin and walk it, while defenders query it to find and cut those same edges (tracking "paths to Domain Admin" toward zero) — so AD attack and AD hardening are literally the same activity aimed in opposite directions',
          'Defenders are not permitted to understand AD attacks',
          'AD offence has no defensive value',
        ],
        answer: 1,
        explain:
          'Across the track, every AD attack maps to a specific defensive control (Kerberoasting↔gMSA, pass-the-hash↔LAPS, DCSync↔restricted replication and 4662 alerting, golden ticket↔protecting krbtgt, ADCS↔template hardening, and so on), so the two sides share the same knowledge and goal. BloodHound makes this unity concrete: it is the *identical* tool and dataset, run by attackers to compute and walk the shortest path to Domain Admin and by defenders to find and cut those same edges, with the defensive metric "paths to Domain Admin" measured directly by the attacker’s tool. AD attack and AD hardening are therefore the same activity aimed in opposite directions — which is why exploiting AD makes you a better defender and vice versa, why purple teaming is the unity made explicit, and why authorized AD offence (which exists to make the domain harder to own) is legitimate while the same acts detached from authorization and remediation are simply crime.',
        hint: 'Which single tool do attackers and defenders run on the same data, one to find the path and one to cut it?',
      },
    },

    {
      id: 'rwin-s-12',
      title: 'Project: an advanced AD engagement',
      read: `Bring the level together by running an **advanced, professional AD engagement** — an assume-breach red-team-style operation against a well-configured AD lab (or authorized environment), using the advanced techniques, operating cleanly, testing detection, and reporting to drive remediation.

## The exercise

Use a well-configured, monitored AD lab (a hardened GOAD variant, a lab you build with some defences, or an authorized pro-lab), starting assume-breach (a standard workstation / a low-priv account):

1. **Scope and plan** — write scope, rules of engagement, deconfliction, and the objective (reach Domain Admin and cloud, test detection). Choose to operate cleanly (stealth) to test detection.
2. **Enumerate cleanly** — BloodHound and targeted enumeration, paced to blend in; enumerate ADCS (Certipy), delegation, and integrated services.
3. **Walk the path with advanced techniques** — apply the right technique at each edge: ACL abuse, shadow credentials, ADCS ESC chains, advanced delegation/RBCD, coercion/relay, DCSync, diamond tickets — preferring quiet techniques (valid credentials, WMI/WinRM over PsExec) and understanding each.
4. **Pivot to cloud** — if hybrid, reach Entra ID (Entra Connect, Golden SAML, PRT) to demonstrate the full identity compromise.
5. **Harvest comprehensively** — LSASS, SAM, DPAPI, cloud credentials.
6. **Demonstrate persistence** — sparingly, documented, removed (an ADCS cert or golden ticket to show capability and test recovery).
7. **Track detection** — note what MDI/EDR/the SOC would detect at each step (the detection assessment).
8. **Report** — the attack path (on-prem + cloud), findings mapped to defensive controls, choke points, and the detection-and-response assessment. Clean up everything.

## Do it professionally

- **Operate cleanly** — this is a detection test; prefer quiet techniques, pace activity, blend with normal AD traffic, and deconflict.
- **BloodHound is the map; the advanced attacks are the moves** — find the path, walk it with the right technique.
- **Notes throughout** — the complex, multi-technique, hybrid chain is impossible to report accurately without them.
- **Understand every step** — each advanced technique, and its detection. The understanding is the transferable skill and the basis of the report and the detection assessment.
- **Persistence: demonstrate, document, remove** — never leave a backdoor on the domain.
- **Stay authorized** — your lab or an authorized environment, always.

## The measure of success

You can run an advanced, clean, assume-breach AD engagement — reaching Domain Admin (and cloud) via advanced techniques while testing detection — and produce a report with the attack path, control-mapped choke-point remediation, and a detection-and-response assessment that measurably improves the domain's security.

> The level distilled: advanced AD attack combines the deep techniques (ADCS chains, shadow credentials, advanced Kerberos/delegation, hybrid identity, comprehensive credential access, stealthy persistence) with professional operation (clean OPSEC, assume-breach, detection testing, and control-mapped reporting). Every technique maps to a defensive control — BloodHound is run identically by both sides — so offence and defence are one discipline. The pro level covers full red-team AD operations and adversary emulation; but this advanced, clean, well-reported AD engagement is the skilled offensive-Windows core, and its entire purpose is to make the domain — and its cloud — measurably harder to compromise.`,
      sample: {
        lang: 'text',
        caption: 'An advanced, clean, assume-breach AD engagement',
        code: `SCOPE: assume-breach (a workstation + low-priv user); objective: Domain
  Admin + cloud, test detection; operate CLEANLY; deconflict.
EXECUTE (quiet, paced, understood):
  BloodHound (paced) -> path; shadow credential (abuse GenericWrite) ->
  ADCS ESC1 -> DCSync (note: 4662 detected?) -> diamond ticket (blend) ->
  Domain Admin -> Entra Connect -> Global Admin (cloud)
HARVEST: LSASS + SAM + DPAPI + cloud tokens
PERSIST: ADCS cert (DEMONSTRATE, document, REMOVE) - tests recovery
DELIVER: attack path (on-prem+cloud) + findings->controls + choke points
  + DETECTION assessment (what MDI/SOC caught + missed). Cleaned up.`,
        output: `Advanced AD engagement: assume-breach start, clean operation to
test detection, advanced techniques (shadow creds, ADCS, diamond
tickets, hybrid pivot) walked along the BloodHound path,
comprehensive harvesting, persistence demonstrated+removed. Report:
path (on-prem+cloud), findings mapped to controls, choke points,
and the detection assessment. Purpose: make the domain+cloud
measurably harder to compromise - the skilled offensive-Windows core.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In an advanced clean assume-breach AD engagement, why operate quietly (valid credentials, paced enumeration, quiet techniques) and track detection at each step?',
        options: [
          'To reach Domain Admin as fast as possible',
          'Because the engagement is a detection test as much as an exploitation test — operating as a careful adversary and recording what MDI/EDR/the SOC detects at each step produces the detection-and-response assessment (what was caught, missed, and how to detect it) that, alongside the control-mapped attack path, is the engagement’s core value in making the domain harder to compromise',
          'Because loud operation is illegal',
          'Because quiet techniques are the only ones that work in AD',
        ],
        answer: 1,
        explain:
          'An advanced assume-breach engagement against a monitored domain tests two things at once: whether the path to Domain Admin (and cloud) exists, and whether the blue team detects an attacker walking it. Operating cleanly — preferring valid credentials (which look like normal authentication), pacing enumeration to blend in, choosing quieter lateral-movement methods, and using ticket variants that avoid golden-ticket detection — is what genuinely tests detection, because a loud operation only tests whether the SOC catches noise. Recording what MDI/EDR/the SOC detects at each step yields the detection-and-response assessment, which together with the attack path mapped to defensive controls and its choke points is the engagement’s core value: a prioritised plan plus the detection gaps to close, making the domain and its cloud measurably harder to compromise. Reaching DA quickly is not the point, and neither loud nor quiet operation is a legality question here.',
        hint: 'Is the engagement only testing whether you can reach DA, or also whether the blue team notices — and what output does tracking detection produce?',
      },
    },
  ],
}

export default level
