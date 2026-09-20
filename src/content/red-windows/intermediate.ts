import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Advanced Active Directory attacks',
  summary:
    'The AD attacks that reach domain dominance: ACL and DACL abuse, Kerberos delegation attacks, AD Certificate Services (ESC) abuse, DCSync, golden and silver tickets, domain trust attacks, and the persistence that follows — each paired with the exact defensive control it defeats, and practised only in your lab or on authorized targets.',
  outcomes: [
    'Abuse dangerous AD ACLs and DACL rights',
    'Exploit unconstrained, constrained and resource-based delegation',
    'Abuse AD Certificate Services (ESC) for escalation and persistence',
    'Perform DCSync and forge golden and silver tickets',
    'Attack domain and forest trusts',
    'Understand AD persistence and its detection',
  ],
  steps: [
    {
      id: 'rwin-i-01',
      title: 'Abusing AD ACLs',
      read: `Beyond group membership, Active Directory objects have **Access Control Lists (DACLs)** granting principals specific rights over other objects. Misconfigured ACLs are a rich, often-overlooked escalation surface — BloodHound surfaces them as edges, and abusing them is core intermediate AD work.

## The dangerous rights

Certain ACL rights over a user, group, computer, or the domain are effectively escalation primitives:

- **GenericAll / GenericWrite** — full control (or broad write) over an object. Over a *user*: reset their password, or set an SPN to Kerberoast them, or set pre-auth-disabled to AS-REP roast them. Over a *group*: add yourself. Over a *computer*: configure RBCD (delegation abuse — later step).
- **WriteDacl / WriteOwner** — modify the object's ACL / take ownership → grant yourself GenericAll → then abuse it.
- **ForceChangePassword** — reset a user's password without knowing the old one → become that user.
- **AddMember** — add a principal to a group → add yourself to a privileged group.
- **AddSelf** — add yourself to a group.
- **AllExtendedRights** over the domain object → includes DCSync rights (later step).

## How they arise and how BloodHound shows them

These rights are often granted for legitimate delegation (a helpdesk group that can reset user passwords) but end up over-broad or chained into escalation. BloodHound represents each as an edge (ForceChangePassword, GenericAll, WriteDacl, AddMember...), so its "shortest path" query strings them into a route: "you're in Helpdesk → Helpdesk can ForceChangePassword on svc-app → svc-app is admin on APP-07 → ...". Each ACL edge is a step you execute.

## Abusing them

Tools make abuse straightforward once found:

- **PowerView** — \`Set-DomainUserPassword\` (ForceChangePassword), \`Add-DomainGroupMember\` (AddMember), \`Add-DomainObjectAcl\` (grant yourself rights via WriteDacl), \`Set-DomainObject\` (set an SPN → Kerberoast, or set pre-auth flag → AS-REP roast).
- **Impacket / bloodyAD / other tools** from Linux for the same operations.
- The pattern: use the right you have to obtain a credential or membership, then continue the path.

## The chained nature

ACL abuse is rarely a single win; it's a **chain** of rights. WriteDacl on a group → grant yourself GenericAll → add yourself → the group is admin somewhere → move on. This is exactly the graph-path thinking: individual rights are edges, and the escalation is the path through them. It's also why ACL misconfigurations are dangerous — each looks minor, but chained they reach Domain Admin.

## The defensive mirror

ACL abuse maps to the defensive AD hardening you learned: audit and tighten object ACLs (BloodHound run defensively flags the dangerous edges — the same tool, opposite goal), apply least privilege to delegated rights (helpdesk can reset *ordinary* users' passwords, not privileged ones), protect privileged objects (AdminSDHolder re-stamps their ACLs — the defensive persistence lesson), and monitor for ACL changes and password-reset/group-add events. When you abuse a WriteDacl edge on an authorized test, that's exactly the over-broad ACL a defender should find (with BloodHound) and remove. Offence walks the ACL edges; defence cuts them.`,
      sample: {
        lang: 'powershell',
        caption: 'Abusing ACL rights BloodHound flagged (PowerView)',
        code: `# BloodHound edge: Helpdesk --ForceChangePassword--> svc-app
Set-DomainUserPassword -Identity svc-app -AccountPassword (ConvertTo-SecureString 'New!' -AsPlainText -Force)
# BloodHound edge: you --GenericWrite--> a user -> set an SPN -> Kerberoast them
Set-DomainObject -Identity target -Set @{serviceprincipalname='fake/svc'}
# BloodHound edge: you --WriteDacl--> a group -> grant yourself GenericAll, then join
Add-DomainObjectAcl -TargetIdentity 'Server Admins' -PrincipalIdentity you -Rights All
Add-DomainGroupMember -Identity 'Server Admins' -Members you`,
        output: `[+] password reset for svc-app -> now log in as svc-app
[+] SPN set on target -> Kerberoast it -> crack its password
[+] granted self GenericAll on 'Server Admins' -> added self -> now admin
    on the machines that group administers -> continue the BloodHound path
# ACL rights (GenericAll/WriteDacl/ForceChangePassword/AddMember) are
# escalation EDGES, chained into a path. Defenders find + cut them with
# the SAME BloodHound - least privilege on delegated rights.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'How does a low-privileged user with `WriteDacl` over a privileged group escalate, and how does BloodHound relate to this?',
        options: [
          'WriteDacl grants Domain Admin instantly',
          'WriteDacl lets them modify the group’s ACL to grant themselves full control (GenericAll), then add themselves to the group — inheriting its privileges; BloodHound represents such rights as edges and chains them into a shortest path to Domain Admin, and defenders run the same BloodHound to find and cut those over-broad ACL edges',
          'WriteDacl only lets them read the group',
          'WriteDacl requires the domain controller’s password',
        ],
        answer: 1,
        explain:
          'WriteDacl is the right to modify an object’s access control list, so a principal holding it over a group can rewrite that ACL to grant themselves GenericAll (full control) and then add themselves as a member, inheriting whatever privileges the group confers (e.g. admin rights on a set of machines). This is a two-step ACL-abuse chain, and it is exactly the kind of edge BloodHound catalogues — its shortest-path query links such rights (WriteDacl, GenericAll, AddMember, ForceChangePassword) into a concrete route to Domain Admin. Defenders run the identical BloodHound against their own AD to surface these over-broad ACLs and cut the edges (least privilege on delegated rights, protected ACLs on privileged objects), which is why ACL abuse is the clearest example of the graph being walked offensively and pruned defensively.',
        hint: 'WriteDacl lets you change who has rights — including granting yourself full control. What do you do next, and how does BloodHound show this?',
      },
    },

    {
      id: 'rwin-i-02',
      title: 'Kerberos delegation attacks',
      read: `**Kerberos delegation** lets a service act on a user's behalf (a web app accessing a database *as you*). Misconfigured, it becomes a powerful impersonation and escalation primitive. The three delegation types each have a distinct attack (and each a defensive fix you learned).

## Unconstrained delegation

A host configured for **unconstrained delegation** caches the **TGT** of *every* user who authenticates to it. The attack: compromise such a host, then coerce a high-value account — ideally a **Domain Controller's machine account** — to authenticate to it (via the Printer Bug / coercion — the skilled level), capture its TGT from memory, and impersonate it. A DC's TGT means you can act as the DC → DCSync → domain compromise. Any non-DC with unconstrained delegation is effectively tier-0.

- **Find it** — PowerView \`Get-DomainComputer -Unconstrained\`; BloodHound flags it.
- **Abuse** — compromise the host, monitor for/coerce privileged logons, extract TGTs (Rubeus \`monitor\`/\`dump\`), pass-the-ticket.

## Constrained delegation

A service configured to delegate to *specific* services can request tickets to those services **as any user** (via **S4U2Self** + **S4U2Proxy**). If you control such an account:

- **S4U2Self** obtains a ticket to the account itself as *any* user (e.g. a Domain Admin).
- **S4U2Proxy** then gets a ticket to the *allowed service* as that user.
- With "protocol transition" (TrustedToAuthForDelegation), it's worse — you can impersonate arbitrary users to the target service.

Find it (\`Get-DomainUser/Computer -TrustedToAuth\`), abuse with Rubeus/Impacket \`getST\`.

## Resource-Based Constrained Delegation (RBCD)

Delegation configured on the *target* resource (\`msDS-AllowedToActOnBehalfOfOtherIdentity\`). The attack, very common:

- If you can **write that attribute** on a computer object (e.g. you have GenericWrite/GenericAll over it — an ACL edge from the last step, or via a relayed authentication), configure a computer *you control* to be trusted to act on behalf of any user *to that target*.
- Then S4U to obtain a service ticket to the target as, say, a Domain Admin → compromise the target.
- Even a low-priv user can often create a computer account (the default **MachineAccountQuota** of 10) to use as the "controlled computer" — a classic chain: create a computer, set RBCD via an ACL right, impersonate an admin onto the target.

## Why delegation is powerful

Each type converts a configuration into "impersonate arbitrary users", often reaching Domain Admin or DC compromise. RBCD especially chains with ACL abuse (write the attribute) and coercion/relay (obtain the write), making it a frequent modern escalation.

## The defensive mirror

Delegation attacks map to the defensive controls: eliminate **unconstrained delegation** (use constrained/RBCD; mark tier-0 accounts "sensitive and cannot be delegated" or add them to **Protected Users** so their TGTs aren't cached), tightly control **who can write delegation attributes** (the RBCD entry point) and **MachineAccountQuota** (set to 0 so users can't create computers), and monitor for S4U ticket patterns and delegation-attribute changes. When you abuse RBCD via a writable computer object on an authorized test, you demonstrate exactly those gaps — and the report's fixes are those controls. Offence abuses the delegation; defence removes the misconfiguration and constrains the attributes.`,
      sample: {
        lang: 'text',
        caption: 'RBCD abuse: write one attribute, impersonate an admin',
        code: `Precondition: GenericWrite/GenericALL over target computer SRV-07
              (an ACL edge) + ability to create a computer (MachineAccountQuota)

1. create a computer you control:  addcomputer FAKE01$  (quota default 10)
2. set SRV-07's RBCD to trust FAKE01$:
     set msDS-AllowedToActOnBehalfOfOtherIdentity -> FAKE01$
3. S4U as a Domain Admin to SRV-07:
     getST -spn cifs/SRV-07 -impersonate Administrator FAKE01$ ...
4. use the ticket -> access SRV-07 as Administrator -> compromise it

Defences: set MachineAccountQuota=0, control who can WRITE delegation
attributes, Protected Users / "sensitive & cannot be delegated" for tier-0.`,
        output: `[+] created FAKE01$ (MachineAccountQuota allowed it)
[+] set RBCD on SRV-07 -> FAKE01$   (via GenericWrite ACL edge)
[+] S4U -> service ticket to SRV-07 AS Administrator
[+] psexec SRV-07 with the ticket -> SYSTEM
# One writable attribute + a created computer = impersonate any user
# to that host. Chains ACL abuse + delegation. Defences above.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is a host configured for *unconstrained* delegation such a high-value target, especially if you can coerce a Domain Controller to authenticate to it?',
        options: [
          'Because unconstrained delegation stores all user passwords in plaintext',
          'Because a host with unconstrained delegation caches the Kerberos TGT of every account that authenticates to it — so an attacker who compromises it can capture those TGTs and impersonate the users, and coercing a Domain Controller’s machine account to authenticate yields the DC’s TGT, enabling actions as the DC (e.g. DCSync) and full domain compromise',
          'Because it disables Kerberos entirely',
          'Because it grants Domain Admin to anyone who connects',
        ],
        answer: 1,
        explain:
          'Unconstrained delegation means the host caches the full TGT of everyone who authenticates to it (so it can act as them to any service). An attacker who compromises such a host can extract those cached TGTs and pass-the-ticket to impersonate the users. The devastating case is coercing a privileged account — ideally a Domain Controller’s machine account, via the Printer Bug/coercion — to authenticate to the host, capturing the DC’s TGT; acting as the DC enables DCSync and thus full domain compromise. That is why any non-DC with unconstrained delegation is effectively tier-0, and the defences are to eliminate unconstrained delegation, protect tier-0 accounts (Protected Users / "sensitive and cannot be delegated" so their TGTs aren’t cached), and limit coercion.',
        hint: 'What does an unconstrained-delegation host cache for everyone who authenticates, and what if that "everyone" includes a coerced Domain Controller?',
      },
    },

    {
      id: 'rwin-i-03',
      title: 'AD Certificate Services attacks',
      read: `**Active Directory Certificate Services (ADCS)** — the enterprise PKI many domains run — became one of the most impactful AD attack surfaces after the 2021 "Certified Pre-Owned" research. Misconfigured certificate templates let a low-privileged user obtain a certificate that **authenticates as anyone, including Domain Admin** — and certificates are long-lived, making it both escalation and persistence.

## The core idea

Certificates can authenticate to AD (via PKINIT/Kerberos). If an attacker can get a certificate whose subject is a **privileged user**, they can authenticate as that user without a password — until the certificate expires. The **ESC1–ESC8+** classes each describe a misconfiguration enabling this:

- **ESC1** — a template that lets low-priv users enrol *and* supply an arbitrary **Subject Alternative Name (SAN)**. Request a certificate "for" Administrator → authenticate as Administrator.
- **ESC2/ESC3** — overly permissive templates / enrolment-agent abuse.
- **ESC4** — you have write access to a template's settings → turn a safe template into a vulnerable one (an ACL edge over the template), then ESC1 it.
- **ESC6** — the CA honours attacker-supplied SANs globally (a CA flag).
- **ESC7** — control over the CA itself (approve requests, etc.).
- **ESC8** — the HTTP enrolment endpoint is vulnerable to **NTLM relay** — relay a coerced DC's authentication to the CA and get a **DC certificate** (chains with coercion — the skilled level).

## Finding and abusing it

- **Certipy** (from Linux) and **Certify** (Windows) enumerate ADCS and find vulnerable templates (\`certipy find -vulnerable\`), and abuse them (\`certipy req\` to request a cert with a chosen SAN, then \`certipy auth\` to authenticate as that user and obtain their hash/TGT).
- The typical ESC1 flow: find a vulnerable template → request a certificate specifying \`Administrator\` as the SAN → use it to get Administrator's TGT/hash → Domain Admin.

## Why ADCS is so impactful

- It's frequently the **fastest path** from a low-priv foothold to Domain Admin in a modern domain, because ADCS is common and templates are often misconfigured.
- Certificates are **long-lived** and **not invalidated by password changes** — so a stolen/forged certificate is durable **persistence**: even after the compromised account's password is reset, the certificate keeps authenticating until it expires or is revoked. This makes ADCS abuse both escalation *and* stealthy persistence.

## The defensive mirror

ADCS attacks map to the defensive ADCS hardening you learned: audit templates (Certipy/PSPKIAudit/Locksmith — the same tools defenders use), remove "supply subject in request" from templates low-priv users can enrol, tighten enrolment permissions, require manager approval for sensitive templates, disable the dangerous CA flags, and — for ESC8 — enable EPA/disable NTLM on the CA web enrolment. And crucially, remediation may require **revoking issued certificates**, not just resetting passwords (because certs survive password changes). When you abuse ESC1 on an authorized test, you demonstrate exactly those template misconfigurations — and the report's fixes are the ADCS controls plus certificate revocation. Auditing PKI templates is now a mandatory part of both AD attack and AD defence.`,
      sample: {
        lang: 'bash',
        caption: 'ESC1: request a cert as Administrator, then authenticate (Certipy)',
        code: `# find vulnerable ADCS templates
certipy find -u jdoe@corp.local -p 'Spring2024' -dc-ip 10.10.10.10 -vulnerable
# ESC1: template allows low-priv enrol + arbitrary SAN -> request AS Administrator
certipy req -u jdoe@corp.local -p 'Spring2024' -ca CORP-CA -template UserAuth \\
  -upn administrator@corp.local
# authenticate with the certificate -> get Administrator's hash/TGT
certipy auth -pfx administrator.pfx -dc-ip 10.10.10.10`,
        output: `[find] Template 'UserAuth' : ENROLLEE_SUPPLIES_SUBJECT + Domain Users enrol
       -> ESC1 (Vulnerable)
[req]  got certificate for UPN administrator@corp.local
[auth] got TGT + NT hash for administrator  -> Domain Admin
# A cert that authenticates as Domain Admin, valid for its lifetime,
# surviving password resets = escalation AND persistence. Fix the
# template AND revoke issued certs. Auditing PKI is mandatory now.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is an ADCS ESC1 misconfiguration both a privilege-escalation *and* a persistence problem, and why can it be hard to remediate?',
        options: [
          'Because certificates are only used for encryption',
          'A vulnerable template lets a low-privileged user obtain a certificate that authenticates as a privileged user (escalation); because certificates are long-lived and are not invalidated by password changes, that certificate keeps authenticating (persistence) until it expires or is revoked — so remediation requires fixing the template *and* revoking issued certificates, not just resetting passwords',
          'Because it only affects the certificate server itself',
          'Because it requires Domain Admin to exploit in the first place',
        ],
        answer: 1,
        explain:
          'ESC1 gives a low-privileged user, via an over-permissive template that allows supplying an arbitrary subject, a certificate whose identity is a privileged account (e.g. Administrator) — immediate escalation to Domain Admin. Unlike a stolen password, a certificate remains valid for its (often long) lifetime and is unaffected by password resets, so it is durable, stealthy persistence: the attacker keeps authenticating even after the account’s password is changed. Remediation therefore cannot be just a password reset; it must fix the template (remove ENROLLEE_SUPPLIES_SUBJECT, tighten enrolment, require approval) *and* revoke the issued certificates (sometimes reissue the CA). This dual nature, plus ADCS’s prevalence, is why it is often the fastest path to Domain Admin and why auditing PKI templates is now essential to both attack and defence.',
        hint: 'A certificate authenticates you and survives password resets. What does that make it, beyond an escalation, and what must remediation therefore include?',
      },
    },

    {
      id: 'rwin-i-04',
      title: 'DCSync: stealing every credential',
      read: `**DCSync** is how an attacker obtains the password hash of *any* account in the domain — including **krbtgt** (which enables golden tickets) — often without ever logging onto a Domain Controller. It's a pivotal AD attack and a common step just before total domain compromise.

## How it works

Domain Controllers replicate directory data — including password hashes — between each other using the **Directory Replication Service (DRSUAPI)** protocol. An account with the **replication rights** can *ask a DC for the password hashes of any account*, and the DC will provide them, because that is what replication is for. DCSync (built into Mimikatz, Impacket's secretsdump) abuses this: with an account holding the rights, request the hash of Administrator, krbtgt, or every account.

## The rights required

DCSync needs the **"Replicating Directory Changes"** and **"Replicating Directory Changes All"** rights on the domain object — normally held only by DCs and top-tier admins (Domain Admins, etc.). So DCSync requires an already-privileged account or, importantly, an account that has been **granted those rights via an ACL** (the ACL-abuse edge — a common way to reach DCSync without being a full admin, and a stealthy backdoor).

## Doing it

- **Impacket** — \`secretsdump.py corp.local/da-user:pass@dc -just-dc\` (or \`-just-dc-user krbtgt\`).
- **Mimikatz** — \`lsadump::dcsync /user:krbtgt\`.
- From a foothold with the right credential, you dump krbtgt (for golden tickets), Administrator, and any target — the domain's crown jewels, remotely, impersonating a DC.

## Why it matters

DCSync is often the step **just before golden tickets**: dump the krbtgt hash via DCSync, then forge TGTs forever (the next step). It also yields every account's hash for pass-the-hash and offline cracking. Obtaining krbtgt via DCSync is effectively total, persistent domain compromise. And because it can be done from a normal workstation (no DC logon needed), it's stealthy — which is why detecting it is a defensive priority.

## The defensive mirror

DCSync maps directly to the defensive controls you learned:

- **Detect it** — Event **4662** showing a request for the replication rights ("Replicating Directory Changes") by an account or host that is **not a Domain Controller** — the DCSync signature the defensive Windows track taught you to alert on.
- **Restrict replication rights** — audit the ACL on the domain object; remove any principal that isn't a DC or a genuinely required, tightly-protected admin (the ACL-backdoor concern).
- **Protect tier-0** — DCSync requires a privileged account or a granted right, so preventing the escalation/ACL abuse that grants it is the real defence.

When you DCSync krbtgt on an authorized test (via a Domain Admin credential or a granted replication right), you demonstrate exactly those gaps — and the report's fixes are alerting on 4662 replication by non-DCs, locking down who can replicate, and the tiering that prevents reaching a DCSync-capable position. Offence replicates the secrets; defence detects the request and restricts the right.`,
      sample: {
        lang: 'bash',
        caption: 'DCSync: dump krbtgt and any account, impersonating a DC',
        code: `# with a Domain Admin credential OR an account granted replication rights:
impacket-secretsdump corp.local/da-alice:'Pass'@10.10.10.10 -just-dc-user krbtgt
impacket-secretsdump corp.local/da-alice:'Pass'@10.10.10.10 -just-dc-user Administrator
# (or dump everything with -just-dc)`,
        output: `krbtgt:502:aad3b...:1a59bd...    <- the krbtgt HASH -> GOLDEN TICKETS
Administrator:500:aad3b...:5f4dcc...   <- Domain Admin hash -> pass-the-hash
# Obtained by REQUESTING replication from the DC (DRSUAPI) - no DC logon.
# DCSync = every credential in the domain. Detection: Event 4662
# "Replicating Directory Changes" from a NON-DC. Restrict who holds the right.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the tell-tale detection for a DCSync attack, and why does that signature work?',
        options: [
          'A failed logon (4625) on a workstation',
          'Event 4662 showing a request for the directory-replication rights ("Replicating Directory Changes / All") by an account or host that is not a Domain Controller — because only DCs should ever replicate directory data, so a user or workstation requesting it is DCSync',
          'A new service installed (7045) on the domain controller',
          'A spike in Kerberos ticket requests (4769)',
        ],
        answer: 1,
        explain:
          'DCSync abuses the Directory Replication Service to request password hashes, which requires the "Replicating Directory Changes" and "…All" rights. Legitimately, only Domain Controllers replicate directory data between themselves, so the high-fidelity signature is Event 4662 recording a request for those replication rights from a principal or host that is not a DC (a user account, a workstation). Alerting on that combination catches DCSync — including the stealthy case where an attacker was granted the rights via an ACL backdoor rather than being a full admin. The complementary defences are auditing and restricting who holds replication rights on the domain object and preventing the escalation/ACL abuse that grants a DCSync-capable position, exactly as the defensive Windows track described.',
        hint: 'Who is supposed to replicate directory data, and what does it mean if a non-DC requests those rights?',
      },
    },

    {
      id: 'rwin-i-05',
      title: 'Golden and silver tickets',
      read: `Where roasting *cracks* a ticket, **forged-ticket** attacks build tickets from a stolen key so the KDC (or a service) accepts them as genuine. Golden and silver tickets are among the most serious AD attacks — deep, persistent, hard-to-detect access.

## Golden ticket

If you've stolen the **krbtgt** hash (via DCSync, or from a DC), you can **forge TGTs for anyone**, with any group membership, valid for as long as you choose. Because the TGT is signed with the real krbtgt key, the KDC trusts it completely:

- Forge a TGT as "Administrator" (or any account, even non-existent) with Domain Admin group membership → authenticate as Domain Admin anywhere.
- Tools: Mimikatz \`kerberos::golden\`, Impacket \`ticketer.py\`.
- A golden ticket is **persistent** — it survives password changes of *other* accounts and grants arbitrary identity for years, until krbtgt is reset (twice).

Golden tickets require prior domain compromise (you need krbtgt first), so they're typically a *persistence* and *dominance* tool after DCSync, not an initial escalation.

## Silver ticket

If you've stolen a **service account's key** (or a computer account's — its machine-account hash), you can **forge service tickets** for *that* service directly — bypassing the DC entirely (no TGS request, so no 4769 at the DC):

- Forge a service ticket as any user for the target service (e.g. \`cifs/\` for file access, \`http/\`, \`mssql/\`) → access that service as, say, Administrator.
- Narrower than golden (one service) but **stealthier**, because the DC never sees it.
- Tools: Mimikatz \`kerberos::silver\`, Impacket \`ticketer.py\` with the service key.

## Why they're serious

Both forge *valid* tickets from a stolen key, so they look genuine and are hard to detect. Golden = arbitrary identity domain-wide, persistent. Silver = stealthy access to a specific service. Together they represent deep, durable compromise.

## Recovery: the krbtgt double-reset

The defensive reality you learned: because golden tickets are signed with krbtgt, **resetting Domain Admin passwords does not invalidate them**. Recovery requires resetting the **krbtgt password twice** (two resets spaced by the replication interval, to invalidate current and cached tickets). This is why krbtgt theft is a domain-wide trust-recovery event — and why demonstrating golden-ticket capability on an authorized test is a critical finding (it means the domain's master key was reachable).

## The defensive mirror

Golden/silver tickets map to the defensive controls: **protect krbtgt and the DCs** (prevent the DCSync/DC compromise that yields the key), **detect anomalous tickets** (unusual lifetimes — golden tickets are often set very long; tickets for non-existent accounts; TGS with no preceding AS; silver tickets need service-side/endpoint logging since the DC is bypassed), **Protected Users and disabling RC4** (harden ticket handling), and know the **double krbtgt-reset** recovery. When you forge a golden ticket on an authorized test (after obtaining krbtgt), you demonstrate that the domain's master key was compromised — the report's remediation is the double reset plus preventing the compromise that reached krbtgt. Offence forges the tickets; defence protects the keys, detects the anomalies, and knows the recovery.`,
      sample: {
        lang: 'text',
        caption: 'Golden vs silver tickets, and the krbtgt-reset recovery',
        code: `GOLDEN TICKET                     SILVER TICKET
  needs: krbtgt hash (via DCSync)   needs: a service/computer acct key
  forges: any TGT, any identity     forges: tickets for ONE service
  the KDC trusts it                 skips the KDC (no 4769 at the DC)
  scope: whole domain, persistent   scope: that service, stealthier

Mimikatz kerberos::golden /krbtgt:<hash> /user:Administrator /domain:corp.local
  -> a TGT as Domain Admin, valid for years

RECOVERY from golden ticket: resetting DA passwords does NOTHING.
  reset the KRBTGT password TWICE (spaced by replication) to invalidate.`,
        output: `Golden = forge any TGT from the stolen KRBTGT key (domain-wide,
persistent). Silver = forge a service ticket from a stolen service
key (one service, stealthy, bypasses the DC). Both look genuine.
Recovery: double krbtgt reset (DA password resets don't work).
Defences: protect krbtgt/DCs, detect anomalous tickets, Protected
Users, disable RC4.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'After discovering that an attacker forged golden tickets, why is resetting Domain Admin account passwords insufficient, and what is actually required?',
        options: [
          'Nothing more is needed once admin passwords change',
          'Golden tickets (TGTs) are signed with the krbtgt key, not tied to any user’s password, so they remain valid until krbtgt changes; recovery requires resetting the krbtgt account password twice (spaced by the replication interval) to invalidate current and cached forged tickets',
          'You must reinstall every workstation in the domain',
          'You must disable Kerberos across the domain permanently',
        ],
        answer: 1,
        explain:
          'A golden ticket’s validity comes from being signed with the krbtgt key, independent of any user account’s password — so changing Domain Admin passwords does not touch krbtgt, and the forged TGTs keep working (arbitrary identity, for their chosen long lifetime). The specific remediation is a double krbtgt password reset: two changes separated by the replication interval, which invalidates outstanding and cached tickets. This is why krbtgt theft (typically via DCSync) is treated as a domain-wide trust-recovery event, and why demonstrating golden-ticket capability on an authorized test is a critical finding — it means the domain’s master key was reachable. The defensive controls also include protecting the DCs/krbtgt to prevent the compromise, detecting anomalous tickets, and hardening ticket handling (Protected Users, no RC4).',
        hint: 'What key are golden TGTs signed with, and does resetting an admin’s password change that key?',
      },
    },

    {
      id: 'rwin-i-06',
      title: 'Attacking domain and forest trusts',
      read: `Large organisations have multiple domains and **forests** connected by **trusts**. Trusts let users in one domain access resources in another — and attackers abuse them to move between domains, sometimes reaching a whole forest from one compromised domain. Understanding trust attacks extends the campaign beyond a single domain.

## Trusts, briefly

- A **domain trust** lets one domain's users authenticate to another. Trusts can be one-way or two-way, and **transitive** (A trusts B, B trusts C → A trusts C).
- A **forest** is a collection of domains sharing a schema and configuration, with automatic two-way transitive trusts between its domains. The forest is the **real security boundary** (not the domain) — compromising one domain in a forest often leads to the whole forest.
- **External/forest trusts** connect separate forests (e.g. after a merger).

## The attacks

- **Enumerate trusts** — from a foothold, map the trust relationships (PowerView \`Get-DomainTrust\`, BloodHound shows trust edges) to see what other domains you can reach.
- **Intra-forest (child → parent / across the forest)** — because the forest shares the krbtgt-signed trust, an attacker with domain admin in a *child* domain can often escalate to the *forest root* (enterprise admin). Techniques include **SID history injection** — forging a ticket (a golden ticket variant, or via an inter-realm trust key) that includes the SID of a privileged group in another domain, so it's honoured there. This is why the *forest* is the security boundary: child-domain compromise can become forest compromise.
- **Cross-trust movement** — using credentials/tickets valid across a trust, or **trust keys** (the shared secret between trusting domains) to forge inter-realm tickets, to move from one domain/forest to another where the trust allows.
- **Foreign group memberships and ACLs** — a principal in one domain with rights in another (BloodHound shows these cross-domain edges).

## Why it matters

Trust attacks turn a single-domain compromise into a multi-domain or forest-wide one. If you compromise one domain, enumerating and abusing its trusts may let you reach connected domains — critical when the objective spans a complex environment, and a reminder that the **forest**, not the domain, is the boundary to reason about.

## The defensive mirror

Trust attacks map to defensive trust and forest hardening: understand that the **forest is the security boundary** (so all domains in a forest must be treated as one trust zone — you can't fully isolate a compromised child domain from the root), use **SID filtering** on trusts (to block SID-history injection across trust boundaries where appropriate), minimise and audit trusts (especially external ones), apply least privilege to cross-domain access, and protect every domain's tier-0 (since one domain's compromise threatens the forest). When you escalate from a child domain to the forest root via SID history on an authorized test, you demonstrate that the forest boundary wasn't accounted for — and the report's guidance is to treat the forest as the boundary, apply SID filtering, and secure all domains to the same tier-0 standard. Offence crosses the trust; defence hardens and reasons about the correct boundary.`,
      sample: {
        lang: 'text',
        caption: 'Trusts as attack paths; the forest is the real boundary',
        code: `Enumerate: Get-DomainTrust  /  BloodHound trust edges
  child.corp.local  --(parent trust)-->  corp.local  (forest root)
  corp.local        --(external trust)-> partner.com

Child -> forest root (the forest is the boundary, not the domain):
  Domain Admin in child.corp.local
    + SID history injection (forge a ticket incl. a forest-root
      privileged group SID, using the inter-realm trust key)
    -> Enterprise Admin in the forest root -> whole forest

Defence: the FOREST is the security boundary (treat all domains as one
trust zone); SID filtering; minimise/audit trusts; protect every domain's tier-0.`,
        output: `Trusts let users cross domains - and let attackers cross too.
Intra-forest, a child-domain Domain Admin can often reach the
forest root (Enterprise Admin) via SID history, because the FOREST
(not the domain) is the security boundary. Enumerate trusts
(PowerView/BloodHound), abuse SID history/trust keys/cross-domain
ACLs. Defence: treat the forest as the boundary, SID filtering,
minimise trusts, secure all domains to tier-0.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why is the *forest* — not the individual domain — considered the real security boundary in Active Directory?',
        options: [
          'Because domains have no security controls',
          'Because domains within a forest share automatic transitive trusts and configuration, so compromising one domain (e.g. gaining Domain Admin in a child domain) can often be escalated to the forest root — via techniques like SID history injection using the inter-realm trust — meaning you cannot fully isolate a compromised domain from the rest of the forest',
          'Because forests cannot be attacked at all',
          'Because each domain is completely independent and isolated',
        ],
        answer: 1,
        explain:
          'A forest is a set of domains bound by automatic two-way transitive trusts and shared schema/configuration, and those trust relationships mean privilege can flow across domain boundaries within the forest. An attacker with Domain Admin in a child domain can frequently escalate to the forest root (Enterprise Admin) — for example by injecting the SID of a forest-root privileged group into a forged ticket honoured across the intra-forest trust. Because a compromise of any one domain can therefore threaten the whole forest, defenders must treat the forest as the trust/security boundary: all its domains form one zone, every domain’s tier-0 must be secured to the same standard, SID filtering is applied on trusts where appropriate, and external trusts are minimised and audited. Domains do have controls, but they are not a containment boundary against a forest-wide adversary.',
        hint: 'What happens to privilege across the automatic trusts inside a forest when one child domain is compromised?',
      },
    },

    {
      id: 'rwin-i-07',
      title: 'AD persistence',
      read: `Once you reach Domain Admin or DC compromise, **persistence** maintains that access durably and stealthily. On authorized engagements it's used sparingly (documented and removed); understanding it deeply matters most because it's the mirror of the defensive AD persistence-hunting you learned — the attacker's hiding spots are the defender's checklist.

## The AD persistence techniques

These are exactly the stealthy persistence mechanisms the defensive Windows track taught you to hunt:

- **Golden ticket** — forge TGTs from the stolen krbtgt key (the last step): arbitrary identity, persistent until krbtgt is reset twice. The classic domain persistence.
- **Silver ticket** — forged service tickets from a stolen service/computer key: stealthy per-service persistence.
- **ADCS certificates** — a certificate for a privileged user (the ESC attacks): long-lived, survives password resets — durable, stealthy persistence that a password reset doesn't remove.
- **DCSync rights (ACL backdoor)** — grant an innocuous account the replication rights, so it can DCSync any hash at will — quiet, and easy to miss without ACL auditing.
- **DCShadow** — register a rogue DC and push malicious changes via replication (add SID history, modify ACLs), bypassing normal change logging.
- **AdminSDHolder** — edit this object's ACL; SDProp re-stamps it onto all privileged accounts every hour, so your access is *self-healing* (the defensive lesson: removing it from a group doesn't work; you must clean AdminSDHolder itself).
- **SID history injection** — add a privileged group's SID to a controlled account, carrying that privilege invisibly.
- **DSRM** — the Directory Services Restore Mode local admin on a DC, configurable for network logon — a DC backdoor.
- **Skeleton Key** — patch LSASS on a DC to accept a master password for any account (memory-resident).
- **Backdoor accounts / group membership**, and modified GPOs.

## The offensive-defensive symmetry (the point)

This is the clearest offence-defence mirror: the AD persistence menu *is* the defensive AD persistence-hunting checklist, read the other way. When you (on an authorized test) plant a golden ticket, an ACL DCSync backdoor, or an AdminSDHolder ACE, you're placing exactly what the blue team hunts — and documenting it tells the defender precisely where to look and what to remove. And the defensive recovery lessons apply directly: golden tickets need the double krbtgt reset; AdminSDHolder must be cleaned at the source; ADCS persistence needs certificate revocation; DCSync backdoors need ACL cleanup.

## Professional discipline

On authorized engagements: use persistence sparingly and within the rules of engagement, **document every mechanism** placed (what and where), and **remove it all** at the end, giving the client a verifiable list. Unremoved AD persistence would be leaving a real, powerful backdoor on the domain — a serious professional and security failure. The value is demonstrating and documenting the *capability* (and testing detection), not maintaining covert access.

## The defensive mirror

Understanding AD persistence is how a defender knows where to hunt and why recovery from tier-0 compromise is a deliberate rebuild of trust (the defensive Windows pro lesson): assume, after DA compromise, that multiple persistence mechanisms exist, and systematically check every control point — krbtgt (reset twice), AdminSDHolder and privileged-group ACLs, DCSync/replication rights, sidHistory, DSRM, GPOs, ADCS certificates. When you demonstrate AD persistence on a test, the report's guidance is exactly that systematic eviction. Offence hides in AD's control plane; defence audits the same control plane to find and evict them.`,
      sample: {
        lang: 'text',
        caption: 'The AD persistence menu IS the defensive hunt checklist, reversed',
        code: `OFFENCE "where can I persist in AD?"   DEFENCE "where would they hide?"
------------------------------------------------------------------------
golden ticket (krbtgt key)         <-> anomalous TGTs; reset krbtgt x2
silver ticket (service key)         <-> service-side ticket anomalies
ADCS cert for a privileged user    <-> audit templates; REVOKE certs
DCSync rights on an odd account    <-> audit replication ACLs (4662)
AdminSDHolder ACE (self-healing)   <-> audit AdminSDHolder ACL directly
DCShadow (rogue DC replication)    <-> unexpected DC registration/repl
SID history injection              <-> audit sidHistory
DSRM network logon / Skeleton Key  <-> DC hardening + monitoring
backdoor account / GPO change      <-> privileged-group + GPO auditing

SAME LIST, opposite goals. On tests: document + REMOVE all of it.`,
        output: `AD persistence (golden/silver tickets, ADCS certs, DCSync ACL
backdoors, AdminSDHolder, DCShadow, SID history, DSRM, Skeleton
Key) is the exact mirror of defensive AD persistence-hunting.
Used sparingly on tests, documented and REMOVED. Understanding it
is how defenders know where to hunt and why tier-0 recovery is a
deliberate rebuild of trust (reset krbtgt x2, clean AdminSDHolder,
revoke certs, audit replication rights).`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why does the AdminSDHolder persistence technique make an attacker’s access "self-healing", and what does that imply for eviction?',
        options: [
          'Because it encrypts the attacker’s account',
          'Because AD’s SDProp process periodically re-applies the AdminSDHolder object’s ACL to all protected privileged accounts, so an ACE the attacker plants on AdminSDHolder is automatically re-stamped onto the groups within the hour — meaning you must remediate the AdminSDHolder object itself, and more broadly that tier-0 eviction requires a systematic audit of every AD control point',
          'Because it hides the account from all queries',
          'Because it resets the krbtgt key automatically',
        ],
        answer: 1,
        explain:
          'AdminSDHolder is a template object whose ACL SDProp copies onto protected privileged accounts on a schedule (roughly hourly). An attacker who adds an ACE to AdminSDHolder makes their access self-healing: fixes applied to an individual privileged group are reverted at the next SDProp run. Eviction therefore requires cleaning the AdminSDHolder object itself, not the downstream groups. More broadly, because attackers plant multiple tier-0 persistence mechanisms (golden tickets, ADCS certificates, DCSync ACL backdoors, DCShadow, SID history, DSRM), recovery from Domain Admin compromise is a deliberate, systematic rebuild of trust across every control point — resetting krbtgt twice, cleaning AdminSDHolder and privileged-group ACLs, revoking certificates, auditing replication rights and sidHistory — which is exactly the defensive Windows pro lesson mirrored from the offensive side.',
        hint: 'What does SDProp do to protected groups on a schedule, and where did the attacker actually plant the ACE?',
      },
    },

    {
      id: 'rwin-i-08',
      title: 'Chaining the AD attack',
      read: `The individual AD attacks (ACLs, delegation, ADCS, DCSync, tickets, trusts) are rarely used alone — real domain compromise **chains** them, and the intermediate skill is combining them into a path to Domain Admin, guided by BloodHound. This step steps back to see how the pieces fit.

## The chained nature of AD compromise

As on Linux, domain compromise is a *chain* of individually-minor findings, not a single magic bug. A typical chain:

- Foothold (spray/roast) → low-priv domain user.
- **BloodHound** reveals the path.
- **ACL abuse** — you're in a group with ForceChangePassword over a service account → reset it.
- That service account is **Kerberoastable** or has **delegation** configured → exploit it.
- **RBCD** or **ADCS ESC1** → impersonate a privileged user.
- Reach an account with **DCSync** rights (or Domain Admin) → dump krbtgt.
- **Golden ticket** / DC compromise → domain dominance and persistence.

Each link is an edge; the compromise is the path. BloodHound is what turns the individual techniques into a coherent route — it shows *which* attacks to use *where*.

## Thinking in AD primitives

Like the Linux "think in primitives" lesson, AD attacks are primitives you combine:

- "I can reset this user's password" (ACL) → become them.
- "I can Kerberoast this account" → crack its password.
- "I can write this computer's RBCD attribute" (ACL) → impersonate any user to it.
- "I can request a certificate as anyone" (ADCS) → authenticate as them.
- "I can replicate" (DCSync rights) → dump any hash.
- "I have krbtgt" → forge any TGT.

You look at what each finding grants and chain the primitives toward Domain Admin. This abstraction lets you find paths on unusual domains where no single canned attack applies.

## BloodHound as the map, the attacks as the moves

The intermediate synthesis: **BloodHound is the map** (the graph of edges/primitives and the shortest path to DA), and **the AD attacks are the moves** (each edge executed via ACL abuse, roasting, delegation, ADCS, DCSync, tickets). You collect the graph, find the path, and walk it edge by edge, applying the right attack at each step. Where BloodHound doesn't show an edge (e.g. an ADCS misconfiguration it doesn't collect), you enumerate separately (Certipy) and add it to your mental map.

## The defensive mirror

The chained view is exactly how defenders reason too: BloodHound (run defensively) shows the paths to Domain Admin, and cutting **one edge** (a choke point — remove the over-broad ACL, fix the delegation, use gMSA, deploy tiering) often breaks many paths. So the offensive chain and the defensive prioritisation are the same graph analysis: the attacker walks the path; the defender cuts the highest-impact edge. When you report an AD compromise, you present the chain and highlight the choke point — the single fix that breaks it — which is the most actionable defensive guidance. Offence chains the primitives to Domain Admin; defence cuts the edge that breaks the chain.`,
      sample: {
        lang: 'text',
        caption: 'A chained AD compromise, guided by BloodHound',
        code: `foothold (AS-REP roast) -> jdoe (low priv)
  BloodHound: shortest path jdoe -> Domain Admin:
   jdoe --MemberOf--> Helpdesk
        --ForceChangePassword--> svc-app     [ACL abuse: reset pw]
   svc-app --GenericWrite--> SRV-07          [ACL -> set RBCD]
        + create FAKE01$ (MachineAccountQuota) -> RBCD -> S4U as Administrator
   Administrator on SRV-07 -> dump a cached DA credential
   DA -> DCSync krbtgt -> GOLDEN TICKET -> domain dominance + persistence

Each edge = a primitive (ACL / RBCD / DCSync / ticket). BloodHound
is the MAP; the attacks are the MOVES. Cut one edge = break the path.`,
        output: `AD compromise CHAINS primitives (ACL abuse, roasting, delegation,
ADCS, DCSync, tickets) into a path to Domain Admin - BloodHound is
the MAP, the attacks are the MOVES. Think in primitives ("I can
reset this pw", "I can write this RBCD attribute"). Defenders
analyse the SAME graph and cut a CHOKE-POINT edge to break many
paths - the offensive chain and defensive prioritisation are one.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'What is the best way to understand the relationship between BloodHound and the individual AD attacks (ACL abuse, roasting, delegation, DCSync, tickets)?',
        options: [
          'BloodHound replaces the need for the individual attacks',
          'BloodHound is the map — the graph of edges/primitives and the shortest path to Domain Admin — while the individual attacks are the moves that execute each edge; you find the path with BloodHound and walk it edge by edge with the right attack, and defenders analyse the same graph to cut a choke-point edge that breaks the path',
          'The individual attacks make BloodHound unnecessary',
          'They are unrelated and used in separate engagements',
        ],
        answer: 1,
        explain:
          'Real domain compromise is a chain of individually-minor findings, and the two pieces fit together as map and moves: BloodHound collects AD’s relationships into a graph, represents each dangerous right or misconfiguration as an edge (a primitive like "can reset this password", "can write this RBCD attribute", "can replicate"), and computes the shortest path from your foothold to Domain Admin. The individual attacks — ACL abuse, Kerberoasting, delegation abuse, ADCS, DCSync, forged tickets — are how you execute each edge as you walk that path. Thinking in primitives lets you chain them even on unusual domains. Crucially, defenders analyse the identical graph and cut a single high-impact (choke-point) edge to break many attacker paths at once, so the offensive chain and the defensive prioritisation are the same graph analysis aimed in opposite directions.',
        hint: 'One shows you the route; the others are how you take each step. And what does cutting one edge do to the route?',
      },
    },

    {
      id: 'rwin-i-09',
      title: 'MSSQL and service-account attacks',
      read: `Beyond the domain-wide attacks, specific services in AD environments — especially **MSSQL servers** and **service accounts** — offer rich, common attack paths worth knowing at the intermediate level.

## MSSQL in AD

Microsoft SQL Server is ubiquitous in Windows environments and frequently attackable:

- **Access** — weak \`sa\` credentials, or **Windows authentication** (a domain user with access to the database, or the service running as a privileged account). Enumerate with \`mssqlclient.py\`, PowerUpSQL, or nxc's mssql module.
- **Command execution** — \`xp_cmdshell\` (if enabled, or enable it as \`sa\`) runs OS commands as the SQL Server service account. So database access → OS command execution on the SQL host.
- **The service account** — MSSQL often runs as a domain service account that may hold **SeImpersonate** (→ Potato → SYSTEM) or be privileged elsewhere. Command execution as it, then local escalation, is a common chain.
- **SQL links** — linked servers let one MSSQL instance execute queries on another; a chain of links can let you pivot across database servers and execute commands on each (PowerUpSQL \`Get-SQLServerLinkCrawl\`), sometimes reaching a more privileged context.
- **Coerce/relay** — MSSQL can be coerced to authenticate (\`xp_dirtree\` to a UNC path), capturing/relaying its service account's authentication.

## Service accounts generally

Service accounts are a recurring theme across AD attacks because they're often **over-privileged** and **weakly-passworded**:

- **Kerberoastable** (they have SPNs) — crack them (the amateur level); a cracked service account may be a local admin on many hosts or in a privileged group.
- **Privileged** — a service account that's a Domain Admin, or local admin fleet-wide, is a huge win; compromising it (via cracking, its host, or delegation) jumps you far.
- **Delegation** — service accounts are often the ones configured for delegation (the delegation attacks).
- **Reused passwords** — a service account password found in a config/share, reused across hosts.

## The pattern

MSSQL and service-account attacks illustrate the recurring AD themes concretely: a service (MSSQL) gives command execution as a service account; the service account is over-privileged (SeImpersonate → SYSTEM, or admin elsewhere, or Kerberoastable); and it chains into local escalation and lateral movement toward Domain Admin. They're common because databases are everywhere and service accounts are frequently misconfigured.

## The defensive mirror

These map to defensive controls you learned: disable \`xp_cmdshell\` and harden MSSQL (strong \`sa\`, least-privilege service account, disable unneeded features, audit linked servers), and — for service accounts — **gMSA** (uncrackable, auto-rotated passwords → defeats Kerberoasting), **least privilege** (a compromised service account shouldn't be a fleet-wide admin), removing SeImpersonate where not needed, and no password reuse. When you go MSSQL → xp_cmdshell → SeImpersonate → SYSTEM → harvest credentials on an authorized test, you demonstrate exactly those gaps. Offence rides the over-privileged, weakly-secured service; defence hardens the service and constrains the account.`,
      sample: {
        lang: 'bash',
        caption: 'MSSQL to SYSTEM via xp_cmdshell + an over-privileged service account',
        code: `# access MSSQL (weak sa or a domain user with access)
impacket-mssqlclient sa:'Passw0rd'@10.10.10.30
# enable + use xp_cmdshell -> OS command as the SQL service account
SQL> enable_xp_cmdshell
SQL> xp_cmdshell whoami
# the service account has SeImpersonate -> Potato -> SYSTEM:
SQL> xp_cmdshell "PrintSpoofer.exe -i -c cmd"`,
        output: `whoami -> nt service\\mssqlserver  (the service account)
         SeImpersonatePrivilege Enabled          <- Potato -> SYSTEM
[PrintSpoofer] nt authority\\system               <- SYSTEM on the SQL host
-> now dump credentials -> continue toward Domain Admin
# MSSQL access -> command exec as an over-privileged service account
# -> SYSTEM. Defences: disable xp_cmdshell, least-priv service acct
# (gMSA), remove SeImpersonate where unneeded, audit linked servers.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why are database services like MSSQL and their service accounts such common and productive attack paths in AD environments?',
        options: [
          'Because databases store no security controls',
          'Because MSSQL access can yield OS command execution (e.g. via xp_cmdshell) as its service account, and service accounts are frequently over-privileged (holding SeImpersonate, being local admin on many hosts, or Kerberoastable with weak passwords) — so a database foothold chains into local escalation to SYSTEM and lateral movement toward Domain Admin',
          'Because MSSQL always runs as Domain Admin',
          'Because databases cannot be hardened',
        ],
        answer: 1,
        explain:
          'Databases are ubiquitous in Windows environments and often reachable with weak `sa` or Windows-auth credentials, and MSSQL can be made to execute OS commands (xp_cmdshell) as its service account. That service account is frequently misconfigured: it may hold SeImpersonate (enabling a Potato attack to SYSTEM), be local admin across many hosts, run with delegation, or be Kerberoastable with a weak, non-rotated password. So a database foothold chains cleanly into local escalation and lateral movement toward Domain Admin — concretely illustrating the recurring AD themes of over-privileged, weakly-secured service accounts. The defences are exactly to disable xp_cmdshell and harden MSSQL, apply least privilege and gMSA to service accounts, remove unnecessary SeImpersonate, and prevent password reuse.',
        hint: 'What can MSSQL access give you (command execution as whom), and how are service accounts usually misconfigured?',
      },
    },

    {
      id: 'rwin-i-10',
      title: 'Coerced authentication and relay',
      read: `Some of the most powerful AD attacks never crack a password: they **coerce** a privileged machine into authenticating to the attacker, then **relay** that authentication to a service that grants control. This chains with ADCS, RBCD, and delegation, and is a defining modern AD technique. (Introduced here; the skilled level goes deeper.)

## Coercion

Windows has features that make a machine authenticate to a path you specify. Attackers abuse them to force a target — often a **Domain Controller** — to authenticate to the attacker's host:

- **PetitPotam** (MS-EFSRPC), **PrinterBug/SpoolSample** (MS-RPRN, the print spooler), **DFSCoerce**, **ShadowCoerce**, and others — each an RPC call that says "authenticate to \\\\attacker\\...". The target's **machine account** authenticates to the attacker.

Coercion is powerful because machine accounts (especially DCs) are privileged, and you can trigger their authentication on demand.

## Relay

NTLM authentication can be **relayed**: the attacker forwards the coerced authentication to another service that accepts NTLM, authenticating *as the coerced machine* to that service (\`ntlmrelayx\`). The devastating combinations:

- **Coerce a DC → relay to ADCS (ESC8)** — get a **certificate for the DC's account** → authenticate as the DC → DCSync → **domain compromise**, often from an unauthenticated start.
- **Coerce → relay to LDAP** — configure **RBCD** on the target (write the delegation attribute via the relayed authentication) → impersonate an admin onto it (chaining coercion + relay + RBCD).
- **Relay to SMB** — access/execute on a target as the relayed identity.

## Why this is so powerful

Coercion + relay turns "I have a foothold" (or even "I'm on the network") into privileged access **without cracking any password** — by abusing authentication itself. The PetitPotam→ADCS chain in particular can take a domain from an unauthenticated position to Domain Controller compromise, which is why it's a flagship modern AD attack.

## Unconstrained delegation, revisited

Coercion also feeds the unconstrained-delegation attack: coerce a DC to authenticate to a host you control that has unconstrained delegation → capture the DC's TGT (the delegation step). Coercion is the trigger that makes several of these attacks reliable.

## The defensive mirror

Coercion/relay maps to the defensive controls you learned: **disable NTLM where possible**, **require SMB signing** and **LDAP signing + channel binding** (signing breaks relay — the relayed session can't be validly re-signed), **enable EPA / disable NTLM on ADCS web enrolment** (breaks the ESC8 relay), **patch/limit the coercion vectors** (Microsoft has hardened several), and **detect** machine accounts (especially DCs) authenticating to unexpected hosts and NTLM auth to ADCS/LDAP from odd sources. When you run PetitPotam→ADCS on an authorized test, you demonstrate exactly those gaps — and the report's fixes are signing/EPA, disabling NTLM, and limiting coercion. Offence coerces and relays authentication; defence removes the relay targets and limits the coercion.`,
      sample: {
        lang: 'text',
        caption: 'PetitPotam -> relay -> ADCS: unauth to domain compromise',
        code: `1. attacker --MS-EFSRPC "authenticate to \\\\attacker"--> DC01   (coercion)
2. DC01$ (machine acct) --NTLM auth--> attacker relay (ntlmrelayx)
3. relay DC01$'s auth --> ADCS web enrolment (ESC8, NTLM)
4. CA issues a certificate FOR DC01$  (a Domain Controller!)
5. use DC01$ cert -> authenticate as the DC -> DCSync -> DOMAIN OWNED

No password cracked. Coerced auth + NTLM relay = privileged access.
Break it: EPA/disable NTLM on ADCS web enrolment; LDAP/SMB signing;
patch/limit coercion (MS-EFSRPC, spooler).`,
        output: `Coercion (PetitPotam/PrinterBug) forces a machine (a DC) to
authenticate to you; RELAY forwards that to a service (ADCS -> DC
cert -> DCSync; LDAP -> RBCD; SMB). PetitPotam->ADCS can go from
UNAUTH to domain compromise. Defences: signing (SMB/LDAP) + EPA,
disable NTLM, patch/limit coercion, detect machine-acct auth anomalies.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In the PetitPotam → ADCS relay attack, no password is ever cracked. How does it achieve domain compromise, and what breaks it?',
        options: [
          'It brute-forces the domain controller’s password',
          'It coerces a Domain Controller’s machine account to authenticate to the attacker, then relays that NTLM authentication to the ADCS web enrolment (ESC8) to obtain a certificate for the DC — which authenticates as the DC and enables DCSync; it is broken by enabling EPA/disabling NTLM on the CA web enrolment, requiring LDAP/SMB signing, and patching/limiting the coercion',
          'It exploits a buffer overflow in Kerberos',
          'It requires stealing the krbtgt hash first',
        ],
        answer: 1,
        explain:
          'The attack abuses authentication itself rather than any password. Coercion (MS-EFSRPC/PetitPotam) forces the DC’s machine account to authenticate to the attacker, who relays that NTLM authentication (ntlmrelayx) to the ADCS HTTP enrolment endpoint (ESC8). The CA issues a certificate for the DC’s account, which the attacker uses to authenticate as the DC and perform DCSync — full domain compromise, potentially from an unauthenticated start. It is broken by removing the relay target and limiting the trigger: enable Extended Protection for Authentication (or disable NTLM) on the CA web enrolment so the relayed authentication is rejected, require LDAP and SMB signing/channel binding so relays elsewhere fail, and patch or restrict the coercion methods. This is exactly the defensive guidance from the Windows blue track, mirrored.',
        hint: 'Which two steps make it work (coerce, then relay to where?), and which of those does EPA/disabling NTLM on ADCS stop?',
      },
    },

    {
      id: 'rwin-i-11',
      title: 'Detection and the defender’s view',
      read: `Every AD attack in this level generates signals — the ones you learned to hunt on the defensive side. Understanding detection (and, for stealthy engagements, evasion at a conceptual level) is essential for realistic testing and for advising defenders on what they can and should catch. This is knowledge for improving detection, not for defeating it maliciously.

## What each AD attack looks like to a defender

Recall the defensive Windows track — everything there is what your AD activity trips:

- **Kerberoasting** — Event **4769** with RC4 / a burst of service-ticket requests for many SPNs from one account.
- **AS-REP roasting** — Event **4768** without pre-auth for flagged accounts.
- **DCSync** — Event **4662** requesting replication rights from a non-DC (the signature you learned).
- **Golden/silver tickets** — anomalous ticket lifetimes, tickets for non-existent accounts, TGS with no preceding AS; silver tickets need service-side logging (they bypass the DC).
- **Pass-the-hash/ticket** — NTLM where Kerberos is expected, an account authenticating to many hosts, tickets used from unexpected machines.
- **Lateral movement** — the remote-exec signatures (7045 for PsExec, WmiPrvSE/wsmprovhost parents, Type-3/Type-10 logon fan-out).
- **ADCS abuse** — certificate issuance (4886/4887) and PKINIT logons (4768 via cert) for privileged accounts.
- **Coercion/relay** — machine-account auth to unexpected hosts, NTLM to ADCS/LDAP from odd sources.
- **Persistence** — the AD persistence-hunting checklist.

## The two postures (as on Linux)

- **Loud (normal pentest)** — thoroughness over stealth; you run these attacks openly.
- **Quiet (red team)** — you emulate a careful adversary to test whether the blue team detects the AD attacks. Here, understanding what generates signal (and, conceptually, what a real attacker does to reduce it) is central.

## Evasion, conceptually

Careful adversaries reduce their AD footprint (and defenders learned to detect the evasion): prefer **valid credentials** over exploits (pass-the-hash/ticket look like normal auth), request **RC4 vs AES thoughtfully** (RC4 Kerberoast is a tell), avoid noisy techniques (PsExec's service creation), use **built-in tools** (LOTL), spread activity, and — where facing EDR — the evasion depth of the skilled/pro levels. But note: many AD attacks are *inherently* detectable (DCSync's 4662, the ticket anomalies), and blinding/evasion is itself often noisy.

## The purple-team payoff (the point)

Understanding AD detection is what makes a red team's report actionable: "we Kerberoasted svc-sql — did you detect the 4769 pattern? we DCSynced — did the 4662 alert fire? we forged a golden ticket — did the anomalous TGT surface?" That maps directly to the purple-teaming loop: the tester's AD attacks test the blue team's detections, and the gaps become the detection backlog. The most valuable output of an AD red team is often the detection assessment — which attacks were caught, which slipped past, and how to detect them.

## The defensive mirror

This step *is* the mirror, made explicit: every offensive AD technique has a defensive detection (which you learned), and the offensive purpose of understanding detection is to *test and improve* those detections. When you run the AD attacks on an authorized engagement and note what would/wouldn't be detected, you produce exactly the detection-and-response assessment the blue team needs — the offensive half of purple teaming. Offence generates the signals; defence detects them; understanding both is how detection improves.`,
      sample: {
        lang: 'text',
        caption: 'Every AD attack maps to a defensive detection',
        code: `AD attack                 Detection it generates (the defensive track)
-----------------------------------------------------------------------
Kerberoasting          -> 4769 RC4 / many SPN requests from one account
AS-REP roasting        -> 4768 without pre-auth
DCSync                 -> 4662 replication rights from a NON-DC
golden/silver ticket   -> anomalous ticket lifetime / non-existent account
pass-the-hash/ticket   -> NTLM where Kerberos expected; auth to many hosts
lateral movement       -> 7045 (PsExec), WmiPrvSE/wsmprovhost parents, logon fan-out
ADCS abuse             -> 4886/4887 cert issuance; PKINIT for privileged accts
coercion/relay         -> machine-acct auth to odd hosts; NTLM to ADCS/LDAP

Red-team value: "we did X - did you DETECT it? here's what you
missed and how to catch it" -> the purple-teaming loop.`,
        output: `Every AD attack here generates the signals defenders hunt.
Normal pentests are loud (thoroughness); red teams operate quietly
to TEST detection. Understanding AD detection makes the report
actionable - the detection-and-response assessment (what was
caught/missed and how to catch it) is the offensive half of
purple teaming. Understand detection to IMPROVE it, not defeat it.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In an authorized AD engagement, what is the primary value of understanding what each attack looks like to a defender?',
        options: [
          'To permanently evade the organisation’s detection',
          'To produce an actionable detection-and-response assessment — testing which AD attacks the blue team detects (via signals like 4769, 4662, anomalous tickets) and which slip past, so the report tells the organisation exactly what they missed and how to detect it, feeding the purple-teaming improvement loop',
          'To destroy the domain controller’s logs',
          'To avoid ever being detected as an end in itself',
        ],
        answer: 1,
        explain:
          'Every AD attack in this level generates characteristic signals (Kerberoasting → 4769, DCSync → 4662 from a non-DC, forged tickets → anomalous lifetimes, lateral movement → remote-exec signatures, and so on), and a mature engagement uses that knowledge to test the blue team: operate as a careful adversary and record which attacks were detected and which were not. The resulting detection-and-response assessment — what was caught, what was missed, and how to detect the misses — is the most valuable output of an AD red team and feeds directly into the purple-teaming loop where the gaps become the detection backlog. The purpose is to measure and improve detection, not to defeat it for harm or to destroy the client’s logs, which testers never do.',
        hint: 'A red team’s real product is not "we did the attack" but "did you catch it, and how do you catch it next time". What does understanding detection serve?',
      },
    },

    {
      id: 'rwin-i-12',
      title: 'Project: total domain compromise',
      read: `Bring the level together into the exercise that consolidates advanced AD attacks: take a vulnerable AD lab and achieve **total domain compromise** — reaching Domain Admin (or DC compromise) via a chain of the level's techniques, guided by BloodHound, and produce an attack-path report a defender could act on. In your lab or an authorized platform only.

## The exercise

Use a vulnerable AD lab (GOAD, a lab you build, or an authorized AD lab / pro-lab), from a low-privileged start:

1. **Enumerate and get a foothold** — the amateur skills (spray/roast, BloodHound collection).
2. **Map the path** — BloodHound: the shortest path from your foothold to Domain Admin, and enumerate what BloodHound doesn't (ADCS with Certipy, delegation, MSSQL).
3. **Walk the path with the level's techniques** — apply the right attack at each edge:
   - **ACL abuse** — reset a password, add yourself to a group, grant yourself rights.
   - **Delegation** — abuse unconstrained/constrained/RBCD to impersonate.
   - **ADCS** — exploit an ESC misconfiguration to authenticate as a privileged user.
   - **Coercion/relay** — coerce and relay to reach ADCS/LDAP/RBCD.
   - **DCSync** — once you hold the rights, dump krbtgt and admin hashes.
   - **Golden/silver tickets** — forge for dominance/persistence (demonstrate, document, remove).
4. **Reach Domain Admin / DC compromise** — demonstrate total domain compromise (within the lab).
5. **Cross trusts** — if the lab has multiple domains/a forest, extend to the forest root.
6. **Write it up** — the full attack path, each finding with remediation, and the **choke points** (the edges whose fix breaks the chain).

## Do it professionally

- **BloodHound is the map; the attacks are the moves** — find the path, walk it edge by edge.
- **Think in primitives** — chain "I can reset this / write this / replicate / forge this" toward DA.
- **Notes throughout** — the multi-technique AD chain is impossible to report accurately without them.
- **Understand every step** — each ACL abuse, delegation, ADCS, DCSync, and ticket. The understanding is the transferable skill and the basis of the report.
- **Persistence: demonstrate, document, remove** — never leave a golden ticket, ADCS backdoor, or ACL DCSync grant on the domain.
- **Stay authorized** — your lab or an authorized platform, always.

## The measure of success

You can take an authorized AD environment to total domain compromise via a chain of advanced techniques (ACLs, delegation, ADCS, coercion/relay, DCSync, tickets), guided by BloodHound, and produce a report — the attack path, findings, remediation, and choke points — that a defender could act on.

> The level distilled: advanced AD attack is **chaining primitives** (ACL abuse, delegation, ADCS, coercion/relay, DCSync, golden/silver tickets, trusts) along the **BloodHound path** to Domain Admin, where credentials and forged tickets provide dominance and persistence. Each technique maps precisely to a defensive control (least-privilege ACLs, gMSA, delegation hardening, ADCS template fixes, signing/EPA, replication-right restrictions, the double krbtgt reset), and fixing one choke-point edge often breaks the whole chain. The skilled level goes deeper (advanced ADCS, cross-forest, evasion); the pro level covers full red-team AD operations; but this BloodHound-guided chain to total domain compromise is the advanced AD core — and every link is a defensive fix waiting to be written.`,
      sample: {
        lang: 'text',
        caption: 'Total domain compromise via chained AD primitives',
        code: `[foothold]   AS-REP roast -> jdoe (low priv); BloodHound collected
[path]       BloodHound: jdoe -> Helpdesk -> (ForceChangePassword) svc-app
             -> (GenericWrite) SRV-07 -> ... -> Domain Admin
[ACL abuse]  reset svc-app's password -> become svc-app
[RBCD]       svc-app GenericWrite on SRV-07 + create FAKE01$ -> S4U as admin
[ADCS]       (parallel) Certipy find -> ESC1 -> cert as Administrator
[DCSync]     Domain Admin -> secretsdump krbtgt + all hashes
[persist]    golden ticket (DEMONSTRATE, document, REMOVE)
[objective]  total domain compromise
[report]     attack path + findings + remediation + choke point
             (fixing the Helpdesk ACL breaks the first hop)`,
        output: `Chained primitives (ACL abuse -> RBCD -> [ADCS ESC1] -> DCSync ->
golden ticket) along the BloodHound path = total domain compromise.
BloodHound the map, the attacks the moves, thinking in primitives.
Notes throughout; persistence demonstrated, documented, REMOVED;
in the lab. Each link a defensive fix; a choke-point edge breaks
the chain. That's the advanced AD core.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'When reporting a total domain compromise achieved by chaining several AD techniques, why is identifying the "choke point" edges especially valuable to the defender?',
        options: [
          'Because it makes the report longer',
          'Because the compromise is a chain of linked edges, so identifying the edges whose remediation breaks the whole chain (e.g. fixing an over-broad Helpdesk ACL, deploying gMSA, or applying tiering) gives the defender prioritised, high-impact guidance — fix these first to cut the path to Domain Admin with the least effort',
          'Because choke points are the only real findings',
          'Because it lets the tester regain access later',
        ],
        answer: 1,
        explain:
          'A total domain compromise is a chain of connected edges (an ACL edge enabling RBCD, a delegation abuse, a DCSync right, a forged ticket), and because the steps are linked, fixing certain edges breaks multiple downstream steps at once — remediating the over-broad Helpdesk ACL removes the first hop, gMSA defeats the Kerberoast, tiering removes the harvestable Domain Admin session. Highlighting these choke points, which BloodHound analysis reveals from both sides, tells the defender where a single high-impact fix cuts the path to Domain Admin with the least effort, giving prioritised remediation that maximises security improvement — the report’s core value, mapping the attack chain directly onto the defensive AD controls.',
        hint: 'If the compromise is a chain, what does fixing one well-chosen link do to the rest of it?',
      },
    },
  ],
}

export default level
