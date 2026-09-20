import type { Level } from '../types'

const level: Level = {
  id: 'pro',
  title: 'Windows internals, tradecraft and research',
  summary:
    'The deep end of offensive Windows: how the protocols you have been abusing actually work on the wire, why the forgeries and relays succeed, how modern defences (Credential Guard, VBS, LSA protection, EDR) work and where their edges are, and how professional red teams build tooling, run long-haul operations and research their own bugs. Everything here is for authorized engagements, your own lab and CTF only — the depth is what turns a tool user into an operator who understands, and defends, the system.',
  outcomes: [
    'Read Kerberos and NTLM at the protocol level and explain why forgeries and relays work',
    'Explain the PAC, its signatures, and the attacks and patches around it',
    'Understand modern Windows credential defences and their real limits',
    'Understand how EDR and telemetry work, and evasion at a principled level',
    'Attack Entra ID / hybrid identity at depth, on tenants you control',
    'Understand how professional red teams build tooling and run operations',
    'Approach Windows vulnerability research and turn depth into better defence',
  ],
  steps: [
    {
      id: 'rwin-p-01',
      title: 'The deep end — and the same rule',
      read: `You have reached the deepest offensive Windows level. Skilled took you through ADCS chains, delegation, hybrid identity, evasion and clean operating. **Pro is about *why* all of it works** — the protocol internals, the cryptography, the defence internals — and about the craft of running real operations and doing your own research. The rule that opened this whole track has not changed and never will: **everything here is for systems you own, lab domains you build, or engagements you are contracted, in writing, to perform.** The depth makes that more important, not less — you are learning the machinery attackers reverse-engineer, and the only ethical place to point it is a target that has asked you to.

## What "pro" means here

- **Read the protocols, don't just run the tools.** Rubeus, mimikatz, Certipy and BloodHound are front-ends for protocol behaviour. When you understand the AS-REP, the PAC, the NTLM MIC or the PRT, you can reason about a target no tool has a button for, and explain a finding precisely to the people who must fix it.
- **Understand the defences from the inside.** Credential Guard, VBS, LSA protection, WDAC and EDR are not magic walls. Each has a design, a threat model, and a boundary. Knowing the boundary is what makes a finding real and a recommendation credible.
- **Operate, don't just exploit.** A long engagement is infrastructure, OPSEC, patience and reporting as much as it is technique.
- **Research.** The best operators find their own bugs. The final steps look at how.

## Why the depth is defensive

This is the culmination of the offensive-defensive unity theme. A tester who can explain *why* the golden ticket forged, *which* PAC signature the DC failed to validate, and *what* KB fixes it, hands the defender something they can act on. Depth turns "I got Domain Admin" into "here is the exact mechanism, the exact detection, and the exact fix." Keep that as the purpose of everything below.`,
      sample: {
        lang: 'text',
        caption: 'How the levels of this track build',
        code: `beginner      : ethics, lab, AD model, the shape of an attack
amateur       : enumeration, access, roasting, BloodHound, lateral
intermediate  : ACLs, delegation, ADCS, DCSync, tickets, trusts
skilled       : ADCS chains, hybrid identity, evasion, clean ops
pro (here)    : protocol internals, defence internals, tradecraft,
                and vulnerability research

At every level the boundary is identical:
  own lab / owned tenant / written authorization. Nothing else.`,
        output: `Pro is not "more tools". It is understanding the machinery
well enough to reason without a tool, to defeat a defence only
because you understand its design, and to hand defenders a
mechanism-level finding they can fix.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What distinguishes "pro"-level offensive Windows work from the levels before it?',
        options: [
          'Access to more powerful automated exploitation tools',
          'Understanding the protocol and defence internals well enough to reason without a tool, defeat a control because you understand its design, and hand defenders a mechanism-level finding — all still confined to owned or authorized targets',
          'Permission to test systems without written authorization once you are skilled enough',
          'Focusing only on offence and leaving defence to others',
        ],
        answer: 1,
        explain:
          'Pro is depth, not more buttons. It means reading Kerberos, NTLM, the PAC and the PRT at the level where you understand why forgeries and relays succeed; understanding Credential Guard, VBS, LSA protection and EDR from the inside so you know their real boundaries; and operating and researching like a professional. That depth serves defence — it turns a compromise into a precise, fixable mechanism. And the authorization boundary is unchanged: owned lab, owned tenant, or written contract, always.',
        hint: 'Skill did not become permission, and pro is not a bigger toolbox.',
      },
    },

    {
      id: 'rwin-p-02',
      title: 'Kerberos on the wire',
      read: `You have forged tickets and roasted accounts. Now read the protocol that made those possible. **Kerberos** is a ticket-based authentication protocol; understanding its three exchanges explains every Kerberos attack you know.

## The three exchanges

1. **AS (Authentication Service) exchange.** The client sends an **AS-REQ** to the Key Distribution Center (the DC). To prove it knows the user's password, it includes **pre-authentication**: a timestamp encrypted with the user's key (derived from the password). The KDC decrypts it with its copy of the key; if it matches, the user is authenticated. The KDC returns an **AS-REP** containing a **TGT** (Ticket Granting Ticket), encrypted with the *krbtgt* account's key.
2. **TGS (Ticket Granting Service) exchange.** To reach a service, the client sends a **TGS-REQ** presenting the TGT and naming a service (by **SPN**). The KDC returns a **TGS-REP** with a **service ticket**, encrypted with the *target service account's* key.
3. **AP (Application) exchange.** The client presents the service ticket to the service, which decrypts it with its own key and reads who you are.

## Why each attack works, in one line each

- **AS-REP roasting** — accounts with pre-auth disabled return an AS-REP without proof of password, and part of it is encrypted with the user's key → crack it offline.
- **Kerberoasting** — any authenticated user can request a service ticket for any SPN; it is encrypted with the service account's key → crack it offline.
- **Golden ticket** — with the *krbtgt* key you forge your own TGT: the KDC trusts anything encrypted with krbtgt's key.
- **Silver ticket** — with a service account's key you forge a service ticket directly, skipping the KDC entirely.

Every one of these is a direct consequence of *which key encrypts what*. That is the whole game.`,
      sample: {
        lang: 'text',
        caption: 'The three Kerberos exchanges and the keys involved',
        code: `AS-REQ  (client -> KDC): "I am alice", pre-auth = {timestamp}Kalice
AS-REP  (KDC -> client): TGT = {alice's data, session key}Kkrbtgt
                         + session key, encrypted with Kalice

TGS-REQ (client -> KDC): here is my TGT, I want a ticket for MSSQL/db01
TGS-REP (KDC -> client): service ticket = {alice's data}Ksvc_mssql

AP-REQ  (client -> svc): here is the service ticket
                         (svc decrypts with its own key Ksvc_mssql)

K = key.  Kkrbtgt encrypts TGTs.  Ksvc encrypts service tickets.
Own the key that encrypts a thing, and you can forge that thing.`,
        output: `Golden ticket = forge a TGT because you hold Kkrbtgt.
Silver ticket = forge a service ticket because you hold Ksvc.
Kerberoast = crack Ksvc offline from a real service ticket.
AS-REP roast = crack Kalice offline when pre-auth is off.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In Kerberos, a golden ticket forges a TGT and a silver ticket forges a service ticket. What underlying fact makes both possible?',
        options: [
          'The DC never checks ticket contents at all',
          'A ticket is trusted by whoever can decrypt it, so holding the key that encrypts a given ticket type (krbtgt for TGTs, the service account key for service tickets) lets you forge that ticket type',
          'Kerberos tickets are transmitted in plaintext',
          'Golden and silver tickets exploit a bug that has since been patched',
        ],
        answer: 1,
        explain:
          'Kerberos trust flows from encryption keys. A TGT is encrypted with the krbtgt account key and trusted by the KDC; a service ticket is encrypted with the target service account key and trusted by that service. Whoever holds the relevant key can mint a valid-looking ticket: krbtgt → golden TGT, a service key → silver service ticket (which skips the KDC entirely). Kerberoasting and AS-REP roasting are the same logic in reverse — you obtain material encrypted with a crackable key and attack it offline. Understanding "which key encrypts what" explains every Kerberos attack at once.',
        hint: 'Ask, for each ticket type, which key encrypts it and who therefore trusts it.',
      },
    },

    {
      id: 'rwin-p-03',
      title: 'The PAC — the heart of it',
      read: `Inside a Kerberos ticket is the **PAC** (Privilege Attribute Certificate): a Microsoft extension carrying the user's SIDs — their RID, group memberships, and rights. **The PAC is how Windows knows what you can do.** It is also the object at the centre of golden tickets, several critical CVEs, and modern Kerberos hardening.

## What the PAC contains and how it is protected

The PAC lists the user's SID and group SIDs. To stop tampering, it carries **signatures**:

- a **server signature** (keyed with the service account's key), and
- a **KDC signature** (keyed with the *krbtgt* key).

A service that wants to be sure can ask the KDC to **validate the PAC**. Historically many services did not, trusting the PAC as presented — which is exactly what a golden ticket relies on: forge a TGT with the krbtgt key, stuff the PAC with "Domain Admins", and every service believes it.

## Why the PAC drives real CVEs

Because the PAC decides authorization, flaws in *how it is validated* are catastrophic:

- **PAC signature confusion / validation gaps** — if a DC can be made to accept a PAC whose signatures don't truly bind, privileges can be forged. Several patched CVEs live here.
- **Diamond and sapphire tickets** — instead of forging a whole TGT (golden), request a *legitimate* TGT and surgically edit its PAC, so the ticket looks far more normal — a direct evolution driven by detection of classic golden tickets.
- **No-PAC / PAC hardening** and the **2022-2023 Kerberos changes** (RC4 disablement, stronger PAC signatures, enforcement dates) are Microsoft closing these gaps.

Understanding the PAC is what separates "I ran a golden-ticket tool" from "I understand why the DC believed a forged authorization, which signature it failed to enforce, and which KB enforces it now." That last sentence is a finding a defender can act on.`,
      sample: {
        lang: 'text',
        caption: 'A ticket, its PAC, and its signatures',
        code: `Kerberos ticket
  +-- encrypted with a key (krbtgt for TGT, svc key for service ticket)
  +-- PAC
        +-- user SID + group SIDs  <- decides what you can do
        +-- server signature  (keyed with the service key)
        +-- KDC signature     (keyed with the krbtgt key)

Golden ticket: forge TGT with krbtgt key, put "Domain Admins" SID
               in the PAC, sign with krbtgt -> DC trusts it.

Diamond ticket: get a REAL TGT, decrypt+edit its PAC, re-sign.
                Looks far more like normal traffic than a golden.`,
        output: `The PAC is the authorization payload of Kerberos. Attacks
target either the key that lets you forge/edit it (golden,
diamond) or gaps in how the KDC validates its signatures
(the patched PAC CVEs). Modern hardening strengthens those
signatures and removes weak encryption.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the PAC in a Kerberos ticket, and why is it central to attacks like golden and diamond tickets?',
        options: [
          'A public-key certificate that encrypts the whole ticket',
          'The payload carrying the user’s SID and group SIDs — their authorization — protected by KDC and server signatures; attacks either forge/edit it using the relevant key (golden, diamond) or exploit gaps in how its signatures are validated',
          'A timestamp used only to prevent replay attacks',
          'A log entry the DC keeps for auditing ticket requests',
        ],
        answer: 1,
        explain:
          'The Privilege Attribute Certificate carries the user’s SID and group memberships — the data Windows uses to decide what the holder can do. Its integrity rests on two signatures (KDC/krbtgt and server/service key). A golden ticket forges an entire TGT and fills the PAC with privileged SIDs, signing with the krbtgt key; a diamond ticket takes a legitimate TGT and surgically edits its PAC to look more normal. Several critical CVEs stem from gaps in how DCs validate PAC signatures, and modern Kerberos hardening (2022–2023) strengthens exactly these signatures. Understanding the PAC turns "I ran a tool" into a precise, fixable finding.',
        hint: 'It is not encryption or a timestamp — it is the part that says who you are and what groups you are in.',
      },
    },

    {
      id: 'rwin-p-04',
      title: 'NTLM internals and why relay works',
      read: `NTLM predates Kerberos and still underpins many attacks. Reading its exchange explains pass-the-hash, Net-NTLM cracking, and relay — three attacks that look different but share one protocol.

## The NTLM challenge-response

1. The client sends a **NEGOTIATE** (I want to authenticate).
2. The server replies with a **CHALLENGE**: a random nonce.
3. The client sends an **AUTHENTICATE**: a response computed from the user's **NT hash** and the challenge.

The server (or a DC via Netlogon) checks the response using its copy of the NT hash. **The password itself is never sent** — only a function of its hash.

## Three attacks, one protocol

- **Pass-the-hash** — the AUTHENTICATE response needs the *NT hash*, not the plaintext. So the hash alone is enough to authenticate; cracking is optional. This is why stolen hashes are as good as passwords for NTLM.
- **Net-NTLMv2 cracking** — the response captured on the wire (Net-NTLMv2) is a *different* thing from the NT hash: you cannot pass it, but you *can* crack it offline to recover the password (this is what Responder captures).
- **NTLM relay** — the client's AUTHENTICATE is not bound to the server that issued the challenge (unless signing/EPA is enforced). So an attacker in the middle can take a victim's authentication and **relay** it to a *different* server, authenticating as the victim there — no cracking, no hash needed.

## Why relay is stopped by signing and EPA

Relay works precisely because the authentication is not cryptographically bound to the session or the target. **SMB/LDAP signing** binds it to the session; **channel binding / EPA** binds it to the TLS channel; **requiring Kerberos** removes the relayable exchange. Every relay defence is "bind the authentication to something the attacker cannot reuse." That is the finding you write.`,
      sample: {
        lang: 'text',
        caption: 'NTLM: what is passable, crackable, and relayable',
        code: `NEGOTIATE    client -> server
CHALLENGE    server -> client   (random nonce C)
AUTHENTICATE client -> server   (response = f(NT hash, C))

NT hash          : passable  (pass-the-hash: no cracking needed)
Net-NTLMv2 (wire): crackable (offline -> password), NOT passable
AUTHENTICATE msg : relayable (to another server) unless bound

Relay is possible because f(NT hash, C) is not tied to WHICH
server you send it to.`,
        output: `Defences all "bind" the auth: SMB/LDAP signing (to the
session), channel binding / EPA (to the TLS channel), or
requiring Kerberos (removes the relayable NTLM exchange).
State it that way and the fix is obvious to the defender.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does NTLM relay work, and what class of defence stops it?',
        options: [
          'It works because NTLM sends the password in plaintext; encryption stops it',
          'It works because the client’s AUTHENTICATE response is not cryptographically bound to the specific server or session, so it can be forwarded to another server — and defences all bind the authentication (SMB/LDAP signing, channel binding/EPA, or requiring Kerberos)',
          'It works only against unpatched Windows XP systems',
          'It works because the NT hash is reversible to the password',
        ],
        answer: 1,
        explain:
          'NTLM never sends the password — it sends a response computed from the NT hash and the server’s challenge. That response is not tied to which server issued the challenge, so a man-in-the-middle can relay a victim’s authentication to a different server and act as them there, with no hash and no cracking. Every relay defence binds the authentication to something an attacker cannot reuse: SMB and LDAP signing bind it to the session, channel binding / Extended Protection for Authentication bind it to the TLS channel, and requiring Kerberos removes the relayable exchange altogether. (Separately: the NT hash is passable, and the wire Net-NTLMv2 is crackable — three attacks from one protocol.)',
        hint: 'The password is never sent; the problem is what the response is — and is not — bound to.',
      },
    },

    {
      id: 'rwin-p-05',
      title: 'Modern credential defences and their edges',
      read: `You have dumped LSASS, used DPAPI and pulled tickets. Modern Windows fights back with layered credential protections. A pro understands each one's design *and its boundary* — because the boundary is the finding.

## The defences

- **Credential Guard** — uses **virtualization-based security (VBS)** to move secrets (NTLM hashes, Kerberos TGTs) into an isolated **LSAIso** process that even a SYSTEM-level attacker on the normal OS cannot read. It largely kills classic LSASS credential theft *for the credentials it protects*.
- **LSA Protection (RunAsPPL)** — marks LSASS as a **protected process**, so ordinary tools cannot open its memory without first defeating the protection.
- **Remote Credential Guard / restricted admin RDP** — stop credentials from being *delegated* to the remote host during RDP, limiting harvest after lateral movement.
- **Protected Users group / no delegation / disabling RC4** — shrink what is stealable and forgeable per account.

## Where the edges are (the honest part)

None of these is total, and a pro reports the real boundary rather than "Credential Guard = safe":

- Credential Guard protects **specific** secrets. Credentials *typed after* compromise, cached in applications, or belonging to services outside its scope can still be reachable. Kerberos *tickets in use* still exist somewhere.
- **LSA Protection** raises the bar but has historically been bypassable with a driver (BYOVD) or specific techniques — i.e. it is a control with known circumvention costs.
- These defences assume **Secure Boot, UEFI, TPM and a patched hypervisor**; weaken the platform and the guarantees weaken.

So the pro finding is not "you got creds, they lose." It is: "Credential Guard is on and protecting X, but service account Y's secret is outside its scope and was recoverable; enabling Z closes it." That precision is the value.`,
      sample: {
        lang: 'powershell',
        caption: 'Checking which credential protections are actually on (authorized host)',
        code: `# Is Credential Guard / VBS running?
$dg = Get-CimInstance -ClassName Win32_DeviceGuard -Namespace root\\Microsoft\\Windows\\DeviceGuard
$dg.SecurityServicesRunning   # contains 1 if Credential Guard is running

# Is LSA running as a protected process (RunAsPPL)?
$lsa = Get-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Lsa' -Name RunAsPPL -ErrorAction SilentlyContinue
"RunAsPPL = $($lsa.RunAsPPL)"   # 1 or 2 means LSA protection is set`,
        output: `SecurityServicesRunning : {1, 2}   # Credential Guard + more
RunAsPPL = 1

Report the reality: what is protected, what is NOT in scope of
these controls, and the exact secret you could still reach.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A host has Credential Guard and LSA Protection enabled. What is the correct professional framing in your report?',
        options: [
          'Credentials are now impossible to steal, so no finding is needed',
          'These controls protect specific secrets via VBS isolation and process protection and meaningfully raise the bar, but each has a defined scope and known circumvention costs — so report exactly what is protected, what fell outside that scope and was still reachable, and the fix that closes it',
          'The controls are worthless because determined attackers can bypass anything',
          'You should disable the controls to complete the test',
        ],
        answer: 1,
        explain:
          'Credential Guard uses virtualization-based security to isolate secrets like NTLM hashes and TGTs in LSAIso, out of reach of even a SYSTEM attacker on the normal OS; LSA Protection marks LSASS as a protected process. Both genuinely raise the bar. But each has a scope: Credential Guard protects specific secrets and assumes a sound platform (Secure Boot/TPM/patched hypervisor), credentials typed or cached after compromise or outside its scope may still be reachable, and LSA Protection has historically been bypassable at a cost (e.g. BYOVD). The pro finding names precisely what was protected, what was still recoverable and why, and the control that would close it — not a binary "safe" or "worthless."',
        hint: 'Neither "impossible" nor "worthless" — report the scope and the exact residual reachable secret.',
      },
    },

    {
      id: 'rwin-p-06',
      title: 'EDR and telemetry, from the inside',
      read: `Skilled introduced evasion as *understanding*. Pro goes to the mechanism: how an EDR actually sees what a process does, so you can reason about detection precisely — for authorized red-team work only, where the goal is to test and improve the defence.

## Where an EDR gets its signal

- **Kernel callbacks** — Windows lets a driver register for notifications on process creation, thread creation and image (DLL) loads. This telemetry is hard to hide from because it comes from the kernel, below your code.
- **Userland hooks** — many EDRs place hooks in \`ntdll.dll\` so that when your process calls an API (e.g. \`NtAllocateVirtualMemory\`), the EDR sees it first. This is *in your process* and therefore, in principle, tamperable — the basis of "unhooking" and direct/indirect syscall techniques.
- **ETW (Event Tracing for Windows)** — a rich telemetry bus; the .NET and threat-intel ETW providers reveal a great deal (e.g. what assemblies load).
- **AMSI** — the Antimalware Scan Interface lets script engines (PowerShell, VBScript) submit content to the AV for scanning *after* deobfuscation, defeating naive obfuscation.
- **Minifilter / registry / network callbacks** — file, registry and network activity.

## Why "evasion" is really "understanding the signal"

Every evasion technique maps to one signal source: unhooking and syscalls target *userland hooks*; patching ETW targets *ETW*; AMSI bypass targets *AMSI*; living-off-the-land and in-memory execution reduce *process-creation and image-load* signal. **Kernel callbacks are the hardest to evade** precisely because they are below your process. A pro states detections in these terms: "your EDR relied on userland ntdll hooks, which the sample bypassed; the kernel ETW-Ti telemetry still recorded it — tune that."

## The point for the defender

Understanding the signal sources tells the blue team *what to trust*. Userland-only visibility is weaker than kernel + ETW-Ti. Your report should say which sources caught the activity and which did not, so the defence can be strengthened where it is thin. That is why this depth is defensive.`,
      sample: {
        lang: 'text',
        caption: 'EDR signal sources and what each evasion targets',
        code: `SIGNAL SOURCE              EVASION THAT TARGETS IT        STRENGTH
kernel callbacks           (very hard - below your code)  strong
ETW / ETW-Ti               patch/blind ETW (noisy)        strong
userland ntdll hooks       unhook, direct/indirect syscalls  weaker
AMSI                       AMSI bypass                     weaker
image-load / proc-create   in-memory exec, LOLBins         medium

Rule of thumb: the closer the telemetry is to the kernel, the
harder it is to evade and the more a defender should rely on it.`,
        output: `A pro finding: "detection relied on userland hooks, which the
payload bypassed; kernel + ETW-Ti still saw thread creation.
Recommend alerting on that source." That is actionable defence.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are kernel callbacks generally the hardest EDR signal for an attacker to evade, and why does that matter for a report?',
        options: [
          'Because kernel callbacks encrypt all telemetry so it cannot be read',
          'Because they run below the attacker’s process rather than inside it (unlike userland ntdll hooks, ETW or AMSI, which are in or near the process and thus more tamperable) — so a report should say which sources caught the activity, guiding defenders to rely on the strongest telemetry',
          'Because only kernel callbacks are enabled by default in Windows',
          'Because kernel callbacks cannot be bypassed by any technique ever',
        ],
        answer: 1,
        explain:
          'EDRs draw telemetry from several places: kernel callbacks (process/thread/image notifications from a driver), userland hooks in ntdll (inside your process), ETW, AMSI, and file/registry/network filters. Techniques like unhooking, direct/indirect syscalls, ETW patching and AMSI bypass each target a signal that sits in or near the attacker’s own process and is therefore tamperable. Kernel callbacks sit below the process, so they are much harder to evade — not impossible, but the strongest source. A professional report states which sources observed the activity and which were bypassed, so the blue team can lean on the resilient telemetry and shore up the weak spots. That is the defensive payoff of understanding the signal.',
        hint: 'Where does the telemetry run relative to the attacker’s code — inside it, or below it?',
      },
    },

    {
      id: 'rwin-p-07',
      title: 'Entra ID and hybrid identity at depth',
      read: `Skilled introduced hybrid identity attacks. Pro reads the tokens. Modern estates are **hybrid**: on-prem AD synced to **Entra ID** (Azure AD). The trust between them, and the tokens the cloud issues, are their own attack surface — tested only on tenants you own.

## The tokens that matter

- **Primary Refresh Token (PRT)** — a long-lived token bound to a registered device and (often) the TPM. It underpins single sign-on to cloud apps. If an attacker can obtain or abuse a PRT, they can request access tokens as the user — a cloud equivalent of pass-the-ticket. TPM binding is what makes stealing it hard; without it, a PRT is portable.
- **Access / refresh tokens (OAuth)** — bearer tokens. **A bearer token is like a ticket: whoever holds it is trusted.** Stealing tokens from a browser, a token cache or a compromised app can grant cloud access without a password, often *sidestepping MFA* because MFA was already satisfied when the token was issued.

## The bridges between on-prem and cloud

- **Password Hash Sync (PHS)** — on-prem password hashes are synced to Entra. Compromise the sync account/server and you reach cloud identities.
- **Pass-through Authentication (PTA)** — a hijacked PTA agent can validate arbitrary logins.
- **Seamless SSO / AzureADSSOACC** — has its own Kerberos-based abuse (a "silver ticket" for the cloud).
- **Federation (ADFS)** — the token-signing certificate is a crown jewel: with it, an attacker forges SAML tokens for *any* user ("Golden SAML").

## Why this is the modern frontier

Identity has moved to the cloud, and so has the highest-value attack. **Conditional access, MFA and device compliance are the new perimeter** — and token theft, consent phishing, and abuse of over-privileged app registrations and service principals are how that perimeter is tested. A pro finding here names the token or trust abused and the conditional-access/token-protection control that would stop it. Only ever on a tenant you own or are contracted to assess.`,
      sample: {
        lang: 'text',
        caption: 'Hybrid identity: the trusts and tokens an attacker eyes',
        code: `on-prem AD  <== sync ==>  Entra ID (Azure AD)
                 |
   +-------------+------------------------------+
   | PHS   : password hashes synced to cloud     |
   | PTA   : cloud auth validated by on-prem agent|
   | SSSO  : Kerberos-based seamless SSO account  |
   | ADFS  : token-signing cert -> Golden SAML    |
   +---------------------------------------------+

Cloud tokens:
  PRT           - device/TPM-bound SSO token (portable if unbound)
  access/refresh- BEARER tokens: holder is trusted, may skip MFA`,
        output: `The modern perimeter is conditional access + MFA + device
compliance. It is tested via token theft, consent phishing,
and abuse of over-privileged app registrations / service
principals. Only ever on an owned/authorized tenant.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why can a stolen OAuth access or refresh token grant cloud access even when MFA is enabled on the account?',
        options: [
          'Because MFA does not apply to cloud applications',
          'Because these are bearer tokens — whoever holds one is trusted — and they were issued after MFA was already satisfied, so replaying the token can sidestep a fresh MFA prompt unless token protection / conditional access re-evaluates it',
          'Because access tokens contain the user’s plaintext password',
          'Because MFA is only checked during the very first login of the account',
        ],
        answer: 1,
        explain:
          'OAuth access and refresh tokens are bearer tokens: possession equals authorization, much like a Kerberos ticket. They are minted after the sign-in — including any MFA — has already succeeded, so an attacker who steals a valid token from a browser, token cache or compromised app can present it and be trusted without triggering a new MFA challenge. That is why token theft and consent phishing are central to cloud attacks, and why defences shift to token protection, short token lifetimes, device-bound tokens (like a TPM-bound PRT) and conditional-access policies that re-evaluate risk. Tested only on tenants you own or are authorized to assess.',
        hint: 'When in the login flow was MFA satisfied, and what does "bearer" mean?',
      },
    },

    {
      id: 'rwin-p-08',
      title: 'Building offensive tooling',
      read: `Pros do not stop at public tools. When a target has a defence no tool has a button for, you build. Understanding *how* offensive tooling is built also tells a defender exactly what to hunt for — which is the point. (Build and run only against your own lab / authorized scope.)

## Why custom tooling exists

- **Signatures.** Public tools (mimikatz, common C2 payloads) are heavily signatured. A defender's EDR knows them. Custom code — even a re-implementation of the same technique — has no signature until someone writes one.
- **Fit.** A specific environment may need a specific capability (a particular protocol, a niche API) that no off-the-shelf tool provides.
- **Understanding.** Writing a technique from scratch forces you to understand the protocol — the whole theme of this level.

## The building blocks (concepts, not a payload)

- **Languages** — C# (rich .NET/Windows API access, but ETW/AMSI-visible), C/C++ and Rust (native, closer to syscalls), and PowerShell for quick work. The choice trades convenience against visibility.
- **In-memory execution** — running code without writing an executable to disk, to reduce file-based detection. This is *why* defenders monitor for reflective loading and unusual memory allocations.
- **Talking to Windows directly** — calling Win32/native APIs (P/Invoke, direct/indirect syscalls) rather than spawning noisy child processes.
- **Modularity and OPSEC** — small, purpose-built tools that do one thing leave less signal than a giant framework.

## The defensive mirror is the reason

Every tooling technique is a detection opportunity: reflective loading → hunt for RWX memory and module-load anomalies; direct syscalls → hunt for calls that skip ntdll hooks; custom C2 → hunt for beacon-like network patterns. A pro who *understands* tool construction writes detection guidance, not just exploits. Building the tool and building the detection are two views of one thing.`,
      sample: {
        lang: 'text',
        caption: 'Custom tooling techniques and their detection mirror',
        code: `TECHNIQUE (why attackers build it)   DETECTION MIRROR (what to hunt)
re-implement a signatured technique  behavioural, not signature, alerts
in-memory / reflective execution     RWX memory, module-load anomalies
direct/indirect syscalls             calls bypassing ntdll userland hooks
custom C2 protocol                   beaconing / anomalous egress patterns
small single-purpose tools           correlate low-signal events

Language trade-off:
  C#      : easy Windows access, but ETW/AMSI see a lot
  C/Rust  : native, closer to syscalls, quieter, harder to write`,
        output: `Understanding how a tool is built IS the detection guidance.
Build only for your own lab / authorized scope; ship the
defender the hunt for every technique you use.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A red teamer re-implements a well-known credential-dumping technique in custom C code instead of using the public tool. What is the primary offensive reason, and its defensive mirror?',
        options: [
          'The custom version is faster; there is no defensive lesson',
          'The public tool is heavily signatured so EDR recognises it, whereas fresh custom code has no signature yet — which is precisely why defenders must alert on the behaviour (the technique) rather than the specific tool',
          'Custom code is legal while public tools are illegal to use',
          'The technique only works when written from scratch',
        ],
        answer: 1,
        explain:
          'Public offensive tools are signatured — an EDR often recognises mimikatz or a common payload on sight — so a from-scratch re-implementation of the same technique evades signature-based detection until someone writes a new signature. The defensive mirror follows directly: signatures alone are brittle, so defenders must detect the underlying behaviour (the API calls, the memory access to LSASS, the reflective load), not the specific binary. This is the offensive-defensive unity of pro tooling: understanding how the tool is built is exactly what tells the blue team what behaviour to hunt. Build and run only within your own lab or authorized scope.',
        hint: 'What does an EDR "know" about a public tool that it does not know about brand-new code — and what should a defender detect instead?',
      },
    },

    {
      id: 'rwin-p-09',
      title: 'Long-haul operations and infrastructure',
      read: `A real red-team engagement is not a single exploit; it is an **operation** that may run for weeks. Pro means running it professionally — infrastructure, OPSEC, patience — always inside authorized scope and rules of engagement.

## Command and control (C2), conceptually

Once you have a foothold, you need a channel to operate through. A **C2 framework** gives you a listener (server) and an implant (on the target) that check in ("beacon") for tasks. Detection hunts the beacon: its timing regularity, its destination, its process. So operators shape traffic to blend in — realistic **jitter**, HTTPS on 443, domains that look ordinary. Understanding this is how a defender learns to hunt beaconing.

## Redirectors and infrastructure

- **Redirectors** sit between the target and your real C2 server, so that if the target's defenders find the callback address, they burn a disposable redirector, not your infrastructure.
- **Domain fronting / categorised domains / valid TLS** make egress look legitimate.
- **Separation** — recon, phishing and C2 infrastructure kept apart so that burning one does not burn the operation.

## OPSEC over the long haul

- **Move slowly.** Time is on your side; noisy speed gets caught. Space out actions, avoid touching everything at once.
- **Log your own actions** meticulously — for the report, for deconfliction with the blue team, and to prove what you did (and did not) do.
- **Deconfliction and safety** — a real incident may occur during your test; a channel to the client lets them tell your activity apart from a genuine attacker, and lets you stand down if you risk causing harm.

## The professional frame

The difference between a script kiddie and a red-team operator is not the exploit; it is the discipline: authorized scope, careful infrastructure, quiet tradecraft, honest logging, and a report that makes the client stronger. That discipline is what this whole track has been building toward.`,
      sample: {
        lang: 'text',
        caption: 'Operational infrastructure and the detection it invites',
        code: `target implant --beacon--> redirector --> team server (real C2)
                              (disposable)     (protected)

BEACON OPSEC              DETECTION MIRROR
jitter + long sleep      hunt for regular check-in timing
HTTPS/443, valid TLS      hunt anomalous destinations/JA3
categorised domain        reputation + newly-seen domains
process injection host    unusual parent/child + network from it

Always: authorized scope, rules of engagement, a deconfliction
channel, and meticulous logging of your own actions.`,
        output: `A red-team OP is infrastructure + OPSEC + patience + reporting,
not a single exploit. The discipline (scope, quiet tradecraft,
honest logs) is what separates a professional from a criminal.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why do red-team operators place redirectors between the target and their real C2 server?',
        options: [
          'To make the implant beacon faster',
          'So that if defenders discover and block the callback address, they burn a disposable redirector rather than the operator’s protected infrastructure — preserving the operation and keeping recon/phishing/C2 separated',
          'Because redirectors are required by the Computer Fraud and Abuse Act',
          'To encrypt the beacon traffic, which is otherwise plaintext',
        ],
        answer: 1,
        explain:
          'A redirector is a disposable hop between the target and the real "team server." If the target’s defenders identify and block the callback destination, they take down only the redirector; the operator’s protected C2 infrastructure survives, and a new redirector restores the channel. It is part of a broader discipline — separating recon, phishing and C2 infrastructure, shaping beacon traffic (jitter, valid TLS, categorised domains) to blend in, moving slowly, keeping a deconfliction channel, and logging everything for the report. All of it inside authorized scope and rules of engagement. The defensive mirror: hunt regular beacon timing, anomalous destinations, and injected-process network activity.',
        hint: 'What should get "burned" when defenders find the callback address — the cheap thing or the valuable thing?',
      },
    },

    {
      id: 'rwin-p-10',
      title: 'Windows vulnerability research',
      read: `The deepest offensive skill is finding your own bugs. **Vulnerability research** is how the CVEs you have been exploiting were discovered in the first place. You will not master it in one step, but you should understand the disciplines — practised on your own systems and software you are allowed to test.

## The disciplines

- **Reverse engineering** — reading a binary (in IDA, Ghidra, Binary Ninja) to understand undocumented behaviour, protocols and where input reaches sensitive code. This is how the ADCS and Kerberos edge cases were found.
- **Patch diffing** — comparing a Windows binary before and after a security update to *locate the fix*, which reveals the bug it fixed. This is why exploits often appear shortly after Patch Tuesday: the patch tells you where to look.
- **Fuzzing** — throwing malformed input at a target and watching for crashes that indicate memory-safety bugs, then triaging which are exploitable.
- **Protocol analysis** — the deep Kerberos/NTLM/LDAP reading you did in this level *is* research; edge cases in a spec become CVEs.

## Memory-safety bugs, briefly

Native Windows components in C/C++ suffer classic memory bugs: buffer overflows, use-after-free, type confusion. Turning a crash into code execution is its own craft (bypassing DEP, ASLR, CFG, and modern mitigations). You do not need to be an exploit developer to be a great operator, but knowing the *classes* helps you reason about what is possible.

## Disclosure — the ethical part

Research ends in **responsible disclosure**: you report the bug to the vendor privately, give them time to fix it, and disclose publicly in coordination — never weaponising it against systems you do not own. The same authorization principle scales to research: **you find bugs to get them fixed.** That is the entire point of offensive security, at its deepest level.`,
      sample: {
        lang: 'text',
        caption: 'The research disciplines and where each finds bugs',
        code: `patch diffing  : compare pre/post-update binary -> find the fix
                 -> infer the bug (why exploits follow Patch Tuesday)
reverse eng.   : read a binary -> undocumented behaviour, input paths
fuzzing        : malformed input -> crashes -> triage exploitability
protocol study : spec edge cases -> logic CVEs (Kerberos/NTLM/ADCS)

memory-safety bug classes: overflow, use-after-free, type confusion
mitigations to bypass    : DEP, ASLR, CFG, CET

Ends in RESPONSIBLE DISCLOSURE: report privately, coordinate a
fix, never weaponise against systems you do not own.`,
        output: `Research is how the CVEs you exploited were found. Its ethical
endpoint is disclosure: you find bugs to get them fixed. Do it
on your own systems / software you are permitted to test.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does patch diffing help a researcher find a vulnerability, and what does it explain about exploit timing?',
        options: [
          'It decrypts the vendor’s source code from the patch',
          'By comparing the binary before and after a security update, it pinpoints exactly what code the fix changed — which reveals the bug that was fixed — explaining why working exploits often appear shortly after Patch Tuesday',
          'It only works on open-source software',
          'It automatically generates a working exploit with no further effort',
        ],
        answer: 1,
        explain:
          'Patch diffing compares a component before and after a security update. The changed code is the fix, and the fix reveals the flaw — the researcher now knows precisely where the vulnerability lived and can reconstruct how to trigger it. That is why exploits frequently emerge in the days after Patch Tuesday: the patch itself points to the bug, so unpatched systems are at heightened risk during the window before they update. It is one of several research disciplines (alongside reverse engineering, fuzzing and protocol analysis), and it ends ethically in responsible disclosure — finding bugs to get them fixed, on systems you own or are permitted to test.',
        hint: 'What is the difference between the binary before and after the update, and what does that difference mark?',
      },
    },

    {
      id: 'rwin-p-11',
      title: 'The complete picture: offence in service of defence',
      read: `Step back and see the whole. Across five levels you learned to enumerate, gain access, escalate, harvest credentials, forge tickets, abuse ADCS and delegation, move laterally, attack hybrid identity, evade telemetry, build tooling, run operations and research bugs. **Every bit of it exists to make defenders stronger.** Pro is where that stops being a slogan and becomes how you work.

## What the depth gives the defender

- Because you understand **Kerberos and the PAC**, your finding is not "golden ticket possible" but "krbtgt was last rotated N days ago; rotate it twice, watch for TGTs with anomalous lifetimes, and enforce the PAC signature KBs."
- Because you understand **NTLM**, your finding is "relay is possible to LDAP because signing is off; enforce LDAP signing and channel binding."
- Because you understand **EDR internals**, your finding is "detection relied on userland hooks that were bypassed; kernel + ETW-Ti telemetry is your resilient source — alert on it."
- Because you understand **hybrid identity**, your finding is "this over-privileged app registration can be consent-phished; scope it down and enforce token protection."

## The mindset

A pro red teamer is, in effect, the **best possible teacher for the blue team**. You prove what is exploitable, exactly how, and exactly what closes it. You do it inside authorization, you handle sensitive data carefully, you log honestly, and you write a report that a defender can implement. The offence is a means; the improved defence is the end.

## Where to keep going

The field never stops: new Windows releases, new Entra features, new EDR capabilities, new research. Stay in your lab, follow disclosure and research responsibly, and keep the boundary you started with — owned systems and written authorization — as the fixed point around which all of this turns. That boundary is not a limitation on the skill; it is what makes the skill a profession.`,
      sample: {
        lang: 'text',
        caption: 'From technique to fixable finding — the pro translation',
        code: `TECHNIQUE PROVEN            FINDING THE DEFENDER CAN ACT ON
golden ticket              rotate krbtgt x2; enforce PAC KBs; alert
                           on anomalous TGT lifetimes
NTLM relay to LDAP         enforce LDAP signing + channel binding
LSASS credential theft     Credential Guard + LSA protection; note
                           the residual secret still reachable
EDR bypass (userland)      rely on kernel + ETW-Ti telemetry
hybrid token/app abuse     scope app regs; token protection; CA

Offence proves it. The improved defence is the deliverable.`,
        output: `A pro red teamer is the blue team's best teacher: proves what
is exploitable, exactly how, and exactly what closes it -
inside authorization, with honest logs and an actionable report.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the defining characteristic of a *professional* red-team deliverable, as opposed to simply achieving compromise?',
        options: [
          'The number of systems compromised and the speed of doing so',
          'That each proven technique is translated into a precise, mechanism-level, actionable finding a defender can implement — done inside authorization, with careful data handling, honest logging and a report that measurably improves the defence',
          'Keeping the methods secret from the client so they cannot replicate the test',
          'Demonstrating the flashiest possible exploit regardless of scope',
        ],
        answer: 1,
        explain:
          'Achieving compromise is the easy part; the professional value is the translation. A pro turns each proven technique into a specific, mechanism-level finding the defender can act on — rotate krbtgt twice and enforce the PAC KBs, enforce LDAP signing and channel binding, rely on kernel/ETW-Ti telemetry, scope down that app registration and enforce token protection. It is delivered inside authorization and rules of engagement, with careful handling of any sensitive data seen, honest and complete logging, and a report that leaves the organisation measurably stronger. Offence is the means; improved defence is the end — the theme this entire track was built to teach.',
        hint: 'Compromise is the start. What makes the work worth paying for is what you hand back.',
      },
    },

    {
      id: 'rwin-p-12',
      title: 'Project: a research-grade AD assessment',
      read: `Your pro capstone is a **research-grade assessment** of your own lab domain: not just compromising it, but explaining every step at the protocol level and delivering a defender-grade report. This synthesises the entire track. Do it only on a lab domain you built.

## The brief

Treat your lab AD as an assume-breach engagement with a mandate to go deep. You have a low-privileged foothold. Your job: reach the highest privilege *and fully explain the machinery*, then write the fix.

## What to produce (a written report, no live commands needed here)

1. **Scope and authorization** — one paragraph stating this is your own lab, the boundary, and the assume-breach starting point.
2. **The chain, at protocol depth** — the path you took (e.g. Kerberoast → crack → ACL abuse → DCSync). For **each** step, state the protocol mechanism (which key, which ticket, which ACE, which PAC behaviour) — not just the tool.
3. **A forged-credential analysis** — pick golden *or* diamond ticket and explain, in your own words, exactly why the DC trusts it (keys, PAC, signatures) and how the two differ in detectability.
4. **Detection map** — for each step, name the telemetry that would catch it (which log, which ETW source, which BloodHound-visible relationship) and rank kernel/ETW-Ti vs userland visibility.
5. **The remediation** — for each finding, the concrete fix (krbtgt rotation, tiering, signing, ADCS template hardening, Credential Guard, etc.), prioritised.
6. **The residual-risk honesty** — where a control is on but has a boundary, state the boundary.

## The standard

If a defender who has never met you could read your report and (a) understand *why* each attack worked at the protocol level, (b) reproduce your detections, and (c) implement your fixes in priority order — you have hit the pro standard. That is the whole point of everything you have learned: **to make the system you attacked stronger than you found it.** Keep it in your lab, keep it authorized, and keep going.`,
      sample: {
        lang: 'text',
        caption: 'The research-grade report skeleton',
        code: `1. Scope & authorization  : own lab, boundary, assume-breach start
2. Chain at protocol depth: each step -> which key/ticket/ACE/PAC
3. Forgery analysis       : golden vs diamond -> why DC trusts it
4. Detection map          : per step -> log/ETW source; rank sources
5. Remediation (ranked)   : krbtgt rotation, tiering, signing,
                            ADCS hardening, Credential Guard...
6. Residual-risk honesty  : where a control is on but bounded

Standard: a stranger on the blue team can understand WHY,
reproduce the detections, and implement the fixes in order.`,
        output: `Passing bar: your report explains the mechanism, maps the
detection, and prioritises the fix well enough that the target
ends up stronger than you found it. Lab-only, authorized, done.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the passing standard for the pro capstone research-grade assessment?',
        options: [
          'Reaching Domain Admin as fast as possible',
          'That a defender who has never met you could read the report and understand why each attack worked at the protocol level, reproduce your detections, and implement your prioritised fixes — leaving the system stronger than you found it',
          'Using the largest possible number of different tools',
          'Keeping the exploitation steps out of the report for security',
        ],
        answer: 1,
        explain:
          'The pro capstone is not about speed or tool count — it is about depth and deliverability. The bar is that an unfamiliar blue-team reader can, from your report alone, understand the protocol-level mechanism of each attack (which key, ticket, ACE, PAC behaviour), reproduce the detections you mapped (which log/ETW source, ranked by resilience), and apply your remediations in priority order, complete with honest residual-risk notes. Achieving that means the offence has served its true purpose: the target ends up stronger than you found it. Done only on a lab domain you built, within the authorization boundary that has governed the entire track.',
        hint: 'Speed and tool count are not it — think about what a stranger on the blue team can do with your report.',
      },
    },
  ],
}

export default level
