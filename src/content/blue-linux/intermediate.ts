import type { Level } from '../types'

const level: Level = {
  id: 'intermediate',
  title: 'Detection, integrity and hunting on Linux',
  summary:
    'You can read a box; now make it talk. The Linux audit framework, centralized and tamper-resistant logging, file-integrity monitoring, ACLs and capabilities, mandatory access control, and hunting for privilege escalation and persistence — the tools that turn a hardened host into a monitored one.',
  outcomes: [
    'Record security events with auditd and write useful rules',
    'Centralize logs so an attacker cannot quietly erase them',
    'Detect unauthorized change with file-integrity monitoring',
    'Use ACLs and capabilities instead of blunt permissions and SUID',
    'Reason about SELinux/AppArmor mandatory access control',
    'Hunt for privilege escalation and persistence, and triage an incident',
  ],
  steps: [
    {
      id: 'blin-i-01',
      title: 'auditd: recording what happened',
      read: `Regular logs record what programs *chose* to report. The **Linux Audit framework** (\`auditd\`) records what the *kernel* saw — file opens, permission changes, executions, syscalls — whether the program wanted it logged or not. It is the defender's flight recorder.

## The pieces

- \`auditd\` — the daemon that writes events to \`/var/log/audit/audit.log\`
- \`auditctl\` — loads rules at runtime
- \`/etc/audit/rules.d/*.rules\` — rules that persist across reboot
- \`ausearch\` and \`aureport\` — query and summarise the log

## Two kinds of rule

- **Watches** on a path: \`-w /etc/passwd -p wa -k identity\` — log **w**rite and **a**ttribute changes to \`/etc/passwd\`, tagged with the **key** \`identity\` so you can find them later.
- **Syscall rules**: \`-a always,exit -F arch=b64 -S execve -k exec\` — record every program execution.

## Why the key matters

Every rule gets a \`-k keyname\`. Later, \`ausearch -k identity\` pulls back exactly those events. Without keys you are grepping a firehose; with them you ask precise questions. Watching the files that define *who can log in and who is root* — \`/etc/passwd\`, \`/etc/shadow\`, \`/etc/sudoers\` — is the classic starting rule set.`,
      sample: {
        lang: 'bash',
        caption: 'Watch the account files, then see who touched them',
        code: `sudo auditctl -w /etc/passwd -p wa -k identity
sudo auditctl -w /etc/sudoers -p wa -k identity

# an attacker adds themselves to sudoers...
sudo ausearch -k identity --start today | tail -12`,
        output: `----
time->Mon Jun  3 14:22:01 2024
type=SYSCALL ... syscall=257 success=yes exe="/usr/bin/vim"
  auid=1000 uid=0 comm="vim" key="identity"
type=PATH name="/etc/sudoers" nametype=NORMAL
----
# auid=1000 is the *login* user behind the root action:
# student edited sudoers as root. That is the person to ask.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In an audit record you see `uid=0` but `auid=1000`. What does `auid` tell you that `uid` does not?',
        options: [
          'Nothing — they are always the same',
          'The original login user behind the action, even after they became root, so you can trace root actions back to a real person',
          'The user ID of the audit daemon',
          'That the action failed',
        ],
        answer: 1,
        explain:
          'The **audit UID** (`auid`, sometimes "loginuid") is stamped at login and follows the session through `su`/`sudo`. So a root action (`uid=0`) still carries the human who started the session (`auid=1000`). That link — root action back to a named person — is exactly what accountability needs.',
        hint: 'One of these survives becoming root. Which identity would you want when a root change appears?',
      },
    },

    {
      id: 'blin-i-02',
      title: 'Making execution and access auditable',
      read: `A useful audit policy answers the questions you will actually ask during an incident. The community baseline for this is the **Linux Audit rules** derived from standards like the CIS Benchmarks and MITRE ATT&CK mappings — but you should understand the handful that matter most rather than pasting a giant file.

## The high-value rules

- **Every execution** — \`-a always,exit -F arch=b64 -S execve -k exec\`. Answers "what ran, and when?"
- **Identity files** — watches on \`/etc/passwd\`, \`/etc/shadow\`, \`/etc/group\`, \`/etc/sudoers\` with key \`identity\`.
- **Privilege changes** — watch \`/etc/sudoers.d/\` and \`/etc/pam.d/\`.
- **Time changes** — attackers roll the clock to confuse timelines: watch \`settimeofday\`/\`clock_settime\`.
- **Module loads** — a loaded kernel module can be a rootkit: \`-w /sbin/insmod -p x -k modules\`.

## Making rules immutable

The last line of a serious rule file is \`-e 2\`. That **locks the audit configuration** until reboot — even root cannot silently disable auditing to cover their tracks. It is a small setting with a large effect: it forces an attacker's tampering to be noisy (a reboot) instead of quiet.

## Reading back

\`aureport --auth\`, \`aureport -x\` (executables), \`ausearch -k exec -ts recent\`. The reports turn thousands of raw records into "here is who authenticated, here is what ran".`,
      sample: {
        lang: 'bash',
        caption: 'A minimal but real rules file (/etc/audit/rules.d/hard.rules)',
        code: `## record all executions
-a always,exit -F arch=b64 -S execve -k exec

## protect identity and privilege
-w /etc/passwd     -p wa -k identity
-w /etc/shadow     -p wa -k identity
-w /etc/sudoers    -p wa -k priv
-w /etc/sudoers.d/ -p wa -k priv

## kernel module loads (rootkits)
-w /sbin/insmod  -p x -k modules
-w /sbin/modprobe -p x -k modules

## lock the config until reboot — MUST be last
-e 2`,
        output: `# load and confirm:
#   sudo augenrules --load
#   sudo auditctl -s   ->  enabled 2  (immutable)`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why do hardened audit rule files end with `-e 2`?',
        options: [
          'It enables verbose logging',
          'It makes the audit configuration immutable until the next reboot, so an attacker cannot silently disable auditing to hide their tracks',
          'It exports the rules to disk',
          'It sets the log rotation size',
        ],
        answer: 1,
        explain:
          '`-e 2` locks the audit subsystem. After it, even root cannot add, remove or disable rules without rebooting — and a reboot is a loud, visible event. It forces tampering to be noisy, which is the whole point of tamper-resistance.',
        hint: 'What would you want to stop an attacker with root from doing to your audit trail?',
      },
    },

    {
      id: 'blin-i-03',
      title: 'Centralized logging: logs the attacker cannot reach',
      read: `A log on the compromised host is only as trustworthy as the host. An attacker with root can edit \`/var/log/auth.log\` and erase their footprints. The fix is to **ship logs off the box in real time** to a server the attacker does not control.

## rsyslog forwarding

\`rsyslog\` (the default on most distros) can forward every message to a central collector. One line in \`/etc/rsyslog.d/50-forward.conf\`:

\`\`\`
*.* action(type="omfwd" target="10.0.0.5" port="6514"
           protocol="tcp" StreamDriverMode="1")
\`\`\`

Now every log line is also on \`10.0.0.5\`. Even if the host is wiped, the collector has the story up to the moment of compromise.

## Why this is decisive

- **Integrity** — the attacker would have to compromise the *collector too* to erase the evidence.
- **Correlation** — logs from 100 hosts in one place let you see an attack sweep across the fleet.
- **Survivability** — a ransomware'd or reimaged host still has a log history elsewhere.

## The bigger picture: SIEM

A central collector plus search and alerting is a **SIEM** (Security Information and Event Management) — the Elastic stack, Graylog, Wazuh, Splunk. The principle is the same at any scale: get the evidence somewhere the attacker isn't.`,
      sample: {
        lang: 'bash',
        caption: 'Forward logs off-host, then confirm they arrive',
        code: `echo '*.* action(type="omfwd" target="10.0.0.5"
  port="514" protocol="tcp")' | sudo tee /etc/rsyslog.d/50-forward.conf
sudo systemctl restart rsyslog
logger -t test "hello from $(hostname)"

# on the collector 10.0.0.5:
sudo tail -1 /var/log/remote/webhost.log`,
        output: `Jun  3 15:40:22 webhost test: hello from webhost
# the line left the host the instant it was written — an attacker
# who later edits the local copy cannot recall this one.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'An attacker gains root and deletes lines from `/var/log/auth.log`. Why does centralized logging still defeat them?',
        options: [
          'It encrypts the local log',
          'The log lines were forwarded to a separate server in real time, so erasing the local copy does not erase the off-host copy the attacker does not control',
          'It makes /var/log/auth.log read-only',
          'It stops the attacker from getting root',
        ],
        answer: 1,
        explain:
          'Forwarding copies each line to a collector as it is written. To destroy the evidence the attacker would have to also compromise the collector — a second, separately defended system. Getting logs off the host is one of the highest-value detection investments there is.',
        hint: 'Where is the copy the attacker cannot reach?',
      },
    },

    {
      id: 'blin-i-04',
      title: 'File-integrity monitoring with AIDE',
      read: `How do you know a system binary hasn't been swapped for a trojaned one? You can't eyeball \`/usr/bin\`. **File-Integrity Monitoring (FIM)** answers it: record a cryptographic fingerprint of every important file while the system is known-good, then periodically re-check and report anything that changed.

## AIDE

\`AIDE\` (Advanced Intrusion Detection Environment) is the classic Linux FIM:

1. \`aide --init\` builds a database of hashes, sizes, permissions and timestamps.
2. You store that database **somewhere read-only or off-host** (an attacker who can edit it can hide their changes).
3. \`aide --check\` compares the live filesystem to the database and reports adds, deletes and modifications.

## What it catches

- A replaced \`/bin/ls\` or \`/usr/sbin/sshd\` (a backdoored SSH daemon)
- A new SUID binary that appeared overnight
- A changed \`/etc/passwd\` or a new authorized_keys file
- Web shells dropped into a web root

## The catch, and the fix

FIM is noisy if you monitor files that legitimately change (logs, caches). A good config watches the *stable* parts — \`/bin\`, \`/sbin\`, \`/usr/bin\`, \`/etc\` — and excludes the churny ones. And the baseline database must be protected, because a fingerprint you can forge proves nothing.`,
      sample: {
        lang: 'bash',
        caption: 'AIDE catching a backdoored binary',
        code: `sudo aide --init
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# ...days later, after an intrusion...
sudo aide --check`,
        output: `AIDE found differences between database and filesystem!

Changed entries:
f   ...   : /usr/sbin/sshd
  Size     : 891232      | 913664
  SHA256   : a1b2c3...   | 9f8e7d...
  Mtime    : 2024-01-10  | 2024-06-03

Added entries:
f  : /tmp/.hidden/backdoor`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why must the AIDE baseline database be stored read-only or off the host it monitors?',
        options: [
          'To save disk space',
          'Because an attacker who can modify the baseline can update it to match their trojaned files, so the check would report no change — a forged baseline proves nothing',
          'Because AIDE runs faster from read-only storage',
          'It does not matter where it is stored',
        ],
        answer: 1,
        explain:
          'FIM only works if the reference is trustworthy. If the attacker can rewrite the database to include their modified `sshd`, the next `--check` sees a perfect match and stays silent. Protecting the baseline (read-only media, off-host copy, signed) is what makes integrity monitoring meaningful.',
        hint: 'What could an attacker do to the reference to make their changes invisible?',
      },
    },

    {
      id: 'blin-i-05',
      title: 'Beyond rwx: Access Control Lists',
      read: `The classic owner/group/other model has a limit: a file has exactly **one** group. What if two teams, "web" and "audit", both need read access but nothing else should? ACLs solve this by attaching per-user and per-group permissions to a file.

## The tools

- \`getfacl file\` — show the full ACL
- \`setfacl -m u:alice:r file\` — **m**odify: give alice read
- \`setfacl -m g:audit:rX dir\` — give the audit group read + enter-directory
- \`setfacl -x u:alice file\` — remove alice's entry
- \`setfacl -b file\` — strip all ACLs back to plain permissions

## The tell-tale +

When a file has ACLs, \`ls -l\` shows a **\`+\`** after the permission block: \`-rw-r-----+\`. A defender auditing permissions must notice that plus — the \`ls -l\` view alone is now *incomplete*, and the real access could be wider than it looks.

## The mask trap

An ACL has a **mask** — an upper bound on what named users and groups actually get. You can grant \`u:alice:rw\` but if the mask is \`r--\`, alice effectively has only \`r\`. \`getfacl\` shows the mask and an \`#effective:\` note when the mask is clipping a grant. When ACL access seems wrong, check the mask first.`,
      sample: {
        lang: 'bash',
        caption: 'Granting one extra group read — and spotting the + in ls',
        code: `setfacl -m g:audit:r /var/www/config.php
ls -l /var/www/config.php
getfacl /var/www/config.php`,
        output: `-rw-r-----+ 1 www-data www-data 812 Jun 3 config.php
# file: var/www/config.php
# owner: www-data
# group: www-data
user::rw-
group::r--
group:audit:r--
mask::r--
other::---`,
      },
      question: {
        kind: 'fill',
        prompt:
          'You are auditing a directory and one file shows `-rw-r-----+`. The trailing `+` means the file has extra access rules that plain `ls -l` does not show. What command displays the full Access Control List for it? (Just the command and the file, using `config.php`.)',
        placeholder: 'command config.php',
        accept: ['getfacl config.php', 'getfacl ./config.php'],
        explain:
          '`getfacl` prints the complete ACL — every named user and group entry plus the mask. The `+` in `ls -l` is the warning that the simple view is hiding entries; `getfacl` is how you see the real access. Always follow a `+` with `getfacl` when auditing.',
        hint: 'The FACL tools are getfacl and setfacl; you want to *get* (read) the list.',
      },
    },

    {
      id: 'blin-i-06',
      title: 'Capabilities: dismantling all-or-nothing root',
      read: `The problem with SUID-root is that it grants **everything**. A tiny program that only needs to open a low port ends up running as full root — and a bug in it becomes a full root compromise. **Linux capabilities** slice root's power into ~40 distinct privileges you can hand out individually.

## Examples

- \`CAP_NET_BIND_SERVICE\` — bind ports below 1024 (all a web server truly needs)
- \`CAP_NET_RAW\` — craft raw packets (what \`ping\` needs, instead of SUID-root)
- \`CAP_DAC_OVERRIDE\` — bypass file permission checks
- \`CAP_SYS_ADMIN\` — a grab-bag so broad it is nearly root; treat any grant of it as a red flag

## The tools

- \`getcap /path\` — what capabilities a file has
- \`setcap cap_net_bind_service=+ep /usr/bin/myserver\` — grant just that one
- \`getcap -r / 2>/dev/null\` — **hunt** the whole filesystem for files with capabilities

## Why a defender hunts them

Capabilities are invisible to \`ls -l\` — no SUID bit shows. An attacker who gives \`/usr/bin/python3\` the \`CAP_SETUID\` capability has a quiet root backdoor that a permissions audit misses entirely. \`getcap -r /\` is now part of any serious host review, right alongside the SUID hunt.`,
      sample: {
        lang: 'bash',
        caption: 'Replacing SUID-root with one narrow capability — and hunting for abuse',
        code: `# instead of chmod u+s (full root), grant only port-binding:
sudo setcap 'cap_net_bind_service=+ep' /usr/local/bin/webd
getcap /usr/local/bin/webd

# the defensive hunt across the whole box:
sudo getcap -r / 2>/dev/null`,
        output: `/usr/local/bin/webd cap_net_bind_service=ep
/usr/bin/ping cap_net_raw=ep
/usr/bin/python3.10 cap_setuid=ep     <- NOT normal: a root backdoor`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A capability hunt finds `cap_setuid=ep` on `/usr/bin/python3`. Why is that dangerous, and why would a normal permissions audit miss it?',
        options: [
          'It is harmless; Python needs it',
          'CAP_SETUID lets that Python change its UID to root, so anyone who runs it can become root — and because no SUID bit is set, `ls -l` shows nothing unusual, so a permissions-only audit misses it',
          'It only affects networking',
          'It makes Python run slower',
        ],
        answer: 1,
        explain:
          'A Python interpreter with `CAP_SETUID` can call `os.setuid(0)` and become root — a complete, quiet privilege-escalation backdoor. Capabilities do not show in `ls -l`, so only `getcap -r /` reveals it. That is exactly why the capability hunt belongs in every host review.',
        hint: 'What can a program do if it can set its own UID, and would `ls -l` reveal the capability?',
      },
    },

    {
      id: 'blin-i-07',
      title: 'Mandatory Access Control: SELinux and AppArmor',
      read: `Everything so far is **discretionary** access control (DAC): the file owner decides who gets in, and root ignores the rules entirely. **Mandatory Access Control (MAC)** adds a second, system-enforced layer that even root cannot casually override — a policy that says "the web server may only ever touch these files, full stop."

## The two implementations

- **SELinux** (RHEL/Fedora/Android) — labels every process and file with a *context*; policy defines which contexts may interact. Powerful, granular, famously fiddly.
- **AppArmor** (Ubuntu/SUSE) — confines programs by **path**: a profile lists exactly what \`/usr/sbin/nginx\` may read, write and execute. Easier to read and write.

## Why it matters for defence

If an attacker exploits your web server, DAC lets their code do anything \`www-data\` can do. MAC boxes it in: even as \`www-data\`, the exploited process can only touch what the profile allows — so a web-app bug does **not** become "read every file www-data can read". MAC turns a compromise into a contained one.

## Enforcing vs. complaining

Both have a **permissive/complain** mode (log what *would* be blocked, block nothing) and an **enforcing** mode (actually block). You develop a profile in complain mode, confirm it doesn't break the app, then switch to enforce. \`getenforce\`, \`setenforce\`, \`aa-status\` are the daily commands.

> The classic mistake: an app "doesn't work", so someone runs \`setenforce 0\` and disables SELinux instead of fixing the label. That throws away the whole extra layer. The right move is to read the denial in the audit log and adjust the policy.`,
      sample: {
        lang: 'bash',
        caption: 'Checking MAC state and reading a denial instead of disabling it',
        code: `getenforce
sudo aa-status | head -4

# a denial appears in the audit log — read it, do not disable MAC:
sudo ausearch -m AVC -ts recent | tail -4`,
        output: `Enforcing
apparmor module is loaded.
32 profiles are loaded.
30 profiles are in enforce mode.
type=AVC ... denied { read } ... comm="nginx"
  name="/etc/shadow" scontext=...:httpd_t tcontext=...:shadow_t
# GOOD: policy stopped the web server reading /etc/shadow.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A web app on an SELinux box breaks. A colleague suggests `setenforce 0` to fix it. Why is that the wrong defensive move?',
        options: [
          'setenforce 0 deletes the app',
          'It disables SELinux system-wide, throwing away the mandatory-access layer that would contain a future web-app compromise — the right fix is to read the AVC denial and correct the label/policy',
          'setenforce 0 is not a real command',
          'It only affects networking',
        ],
        answer: 1,
        explain:
          'Disabling enforcement removes the exact protection that would stop an exploited web server from roaming the filesystem. The denial in the audit log tells you what context was blocked; you fix the label or add a targeted policy rule. Turning MAC off to make an error go away is trading real containment for convenience.',
        hint: 'What protection are you giving up to make the error disappear?',
      },
    },

    {
      id: 'blin-i-08',
      title: 'Hunting privilege escalation',
      read: `Attackers rarely land as root. They land as some low-privilege user and look for a way **up**. Knowing the common paths lets you find — and close — them before they do.

## The usual routes

- **SUID/SGID binaries** — a SUID program with a shell escape (\`find\`, \`vim\`, \`nmap --interactive\`) hands out root. Hunt: \`find / -perm -4000 -type f 2>/dev/null\`, then check each against **GTFOBins** (a catalogue of binaries abusable this way).
- **Sudo misconfiguration** — \`sudo -l\` shows what the current user may run as root. A single \`NOPASSWD\` entry for a program with a shell escape is game over.
- **Writable files run as root** — a world-writable script in root's cron, or a writable \`systemd\` unit.
- **Kernel exploits** — an unpatched kernel with a known local-privesc CVE.
- **Capabilities** — the \`getcap -r /\` hunt from earlier.

## The defender uses the attacker's own checklist

Tools like **linPEAS** and **LinEnum** automate the attacker's enumeration. Run them on **your own** hosts: whatever they flag as an escalation path is exactly what you fix. Reading your box the way an attacker would is the fastest way to harden it.

## The fix pattern

For each finding: does this SUID binary need to be SUID? (Usually no — remove the bit.) Does this sudo rule need to be NOPASSWD, or that broad? Tighten to least privilege. Every escalation path you remove is one the attacker no longer has.`,
      sample: {
        lang: 'bash',
        caption: 'Two escalation paths a defender should find first',
        code: `find / -perm -4000 -type f 2>/dev/null
echo "--- what can I run as root? ---"
sudo -l`,
        output: `/usr/bin/passwd        <- expected
/usr/bin/sudo          <- expected
/usr/bin/find          <- DANGER: find has a shell escape (GTFOBins)

User web may run the following commands on this host:
    (root) NOPASSWD: /usr/bin/vim   <- DANGER: vim -> :!sh = instant root`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Your audit shows `find` with the SUID bit set and a sudo rule `(root) NOPASSWD: /usr/bin/vim`. Why are both critical?',
        options: [
          'They slow the system down',
          'Both `find` and `vim` can spawn a shell, so a SUID `find` runs that shell as root, and `sudo vim` can drop to `:!sh` as root without a password — each is a one-step path from a normal user to full root',
          'They are harmless standard configuration',
          'Only the sudo rule matters',
        ],
        answer: 1,
        explain:
          'Both are on GTFOBins for exactly this reason. SUID `find` → `find . -exec /bin/sh \\; ` runs a root shell; `sudo vim` → `:!sh` gives a passwordless root shell. Interactive programs that can shell out must never be SUID-root or in a broad NOPASSWD rule. Finding these on your own box before an attacker does is the whole game.',
        hint: 'What do both find and vim have in common that turns "run this one program" into "run any command"?',
      },
    },

    {
      id: 'blin-i-09',
      title: 'Hunting persistence',
      read: `Once in, an attacker wants to **stay** in — to survive a reboot or a password change. Persistence is where they hide, and a defender who knows the hiding spots can evict them. Check every one during an investigation.

## Where persistence lives on Linux

- **cron** — \`/etc/crontab\`, \`/etc/cron.*\`, and each user's \`crontab -l\`. A job that curls a payload every 5 minutes.
- **systemd** — a rogue \`.service\` or \`.timer\` in \`/etc/systemd/system\` or \`~/.config/systemd/user\`. \`systemctl list-timers\`.
- **SSH keys** — an extra line in \`~/.ssh/authorized_keys\` is a silent backdoor that survives password resets. Check *every* user's, including root's.
- **Shell startup** — \`~/.bashrc\`, \`~/.profile\`, \`/etc/profile.d/\` running something on every login.
- **New or modified accounts** — a fresh UID-0 account, or an added sudoer.
- **Services & PAM** — a modified PAM module, an LD_PRELOAD in \`/etc/ld.so.preload\`.

## The mindset

Persistence hunting is systematic, not clever: you walk the list every time, because attackers plant more than one so that removing one leaves them still inside. Finding the miner and missing the cron job that re-downloads it means it is back in five minutes.

## Correlate with time

Sort suspects by modification time (\`ls -lt\`, \`find -mtime -3\`). Persistence planted during the intrusion will cluster around the same timestamps as the rest of the attacker's activity — a powerful way to separate their changes from the system's normal files.`,
      sample: {
        lang: 'bash',
        caption: 'Three persistence spots, checked in one pass',
        code: `# 1. backdoor SSH keys for every user
sudo grep -R "" /home/*/.ssh/authorized_keys /root/.ssh/authorized_keys 2>/dev/null
# 2. rogue systemd timers
systemctl list-timers --all | grep -vi 'apt\\|logrotate\\|man-db'
# 3. anything cron runs
sudo ls -la /etc/cron.d/ && cat /etc/crontab`,
        output: `/home/web/.ssh/authorized_keys:ssh-rsa AAAAB3... attacker@evil  <- not ours
NEXT   UNIT               ACTIVATES
*-*-* update-check.timer  update-check.service   <- we never made this
-rw-r--r-- 1 root root  /etc/cron.d/.sysupdate    <- hidden dotfile in cron.d`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You remove a cryptominer process, but five minutes later it is back. What did you most likely miss?',
        options: [
          'The miner was never really gone',
          'A persistence mechanism — a cron job, systemd timer or startup script that re-downloads and relaunches the miner — so killing the process alone does not evict the attacker',
          'The CPU is faulty',
          'You need to reboot',
        ],
        answer: 1,
        explain:
          'A returning payload is the signature of persistence: something on a schedule keeps bringing it back. Eviction means finding and removing every persistence mechanism — cron, timers, authorized_keys, startup files — not just the visible process. That is why persistence hunting is a systematic walk of the whole list.',
        hint: 'What could keep re-launching a program you just killed?',
      },
    },

    {
      id: 'blin-i-10',
      title: 'Log analysis at scale with awk',
      read: `grep finds lines; **awk** does arithmetic and grouping on the fields *inside* them. When a log has thousands of events and you need "top talkers", "count per hour" or "sum of bytes per IP", awk is the defender's power tool.

## The model

awk runs a block for each line, splitting it into fields \`$1\`, \`$2\`, ... (\`$0\` is the whole line). A common pattern accumulates counts in an associative array, then prints them at the \`END\`:

\`\`\`
awk '{ count[$1]++ } END { for (ip in count) print count[ip], ip }'
\`\`\`

"For each line, add one to this IP's tally; at the end, print every tally." Pipe to \`sort -rn | head\` for a ranked top list.

## Real defensive one-liners

- **Failed logins per source IP**, ranked — the brute-force attackers
- **Requests per minute** — spot a spike (a scan or a DoS)
- **HTTP status codes** — a flood of 404s (scanning) or 401/403s (auth attacks)
- **Bytes per client** — a single IP pulling gigabytes (exfiltration)

The \`sort | uniq -c | sort -rn\` idiom from the amateur level is the quick version; awk is what you reach for when you need a field that isn't the whole line, or need to *add up* numbers rather than just count lines.`,
      sample: {
        lang: 'bash',
        caption: 'Top attacking IPs, and error-rate per hour, from a web log',
        code: `# top 5 IPs by request count
awk '{ c[$1]++ } END { for (i in c) print c[i], i }' access.log \\
  | sort -rn | head -5

# how many 500 errors per hour (field 4 is [10/Jun/2024:14:...)
awk '$9==500 { split($4,t,":"); h[t[2]]++ }
     END { for (x in h) print x, h[x] }' access.log | sort`,
        output: `48213 203.0.113.9     <- one IP, 48k requests: a scanner or DoS
 1102 198.51.100.4
  377 192.0.2.50
13 6      <- 6 server errors in the 13:00 hour
14 251    <- 251 in 14:00: something broke, investigate`,
      },
      question: {
        kind: 'code',
        lang: 'bash',
        prompt:
          'A web access log has the client IP as the first field (`$1`). Write a one-line pipeline that lists each IP with how many requests it made, most frequent first. Use awk to count into an array keyed by `$1`, then sort. (End by sorting numerically, descending.)',
        starter: "awk '{ ",
        mustInclude: [
          "awk\\s+'[^']*\\[\\$1\\][^']*'",
          "\\|\\s*sort\\s+-rn",
        ],
        accept: [
          "awk '{ c[$1]++ } END { for (i in c) print c[i], i }' access.log | sort -rn",
          "awk '{ count[$1]++ } END { for (ip in count) print count[ip], ip }' access.log | sort -rn",
        ],
        solution:
          "awk '{ c[$1]++ } END { for (i in c) print c[i], i }' access.log | sort -rn",
        explain:
          'The array `c[$1]++` tallies each IP; the `END` block prints "count IP" for every key; `sort -rn` ranks by the leading number, biggest first. This "accumulate in an array, print at END, sort" pattern is the workhorse of log analysis — swap `$1` for any field to group by it.',
        hint: 'Increment an array keyed by $1 for each line, print it all in END, then pipe to sort -rn.',
      },
    },

    {
      id: 'blin-i-11',
      title: 'Incident response: the first hour',
      read: `When you find a compromise, panic makes it worse. Responders follow a repeatable process so that evidence survives and the attacker is actually removed. The industry model (SANS/NIST) has six phases; the ones you act on in the first hour are **identification, containment and preservation**.

## Do, in order

1. **Identify** — confirm it is real and scope it. Which hosts? Which accounts? What is the earliest sign in the logs?
2. **Contain** — stop the spread without tipping off the attacker unnecessarily. Network-isolate the host (pull it from the network / firewall it off) rather than powering it off — see below.
3. **Preserve** — capture volatile evidence *before* it vanishes: running processes (\`ps aux\`), network connections (\`ss -tunap\`), logged-in users, memory if you can, then disk images. Note exact times.
4. **Eradicate** — remove the persistence, close the entry point, rotate credentials.
5. **Recover** — rebuild from known-good, restore data, watch closely.
6. **Lessons learned** — write it up so the same door is not left open twice.

## Why "isolate, don't power off"

Pulling the power destroys everything in RAM — running malware, encryption keys, network connections, the attacker's live shell. Network isolation stops the bleeding while preserving that volatile evidence for capture. Powering off is sometimes necessary (active destruction), but it is a last resort, not a reflex.

## Chain of custody

If this might end in a legal case or an insurance claim, *how* you collect matters. Record who did what, when, with which tool, and hash your images. Sloppy collection can make solid evidence useless.`,
      sample: {
        lang: 'bash',
        caption: 'Preserving volatile evidence before it is gone',
        code: `# timestamp everything you do
date -u
# who is here, what is running, what is connected
w > /evidence/who.txt
ps auxww > /evidence/ps.txt
ss -tunap > /evidence/connections.txt
ls -la /proc/$SUSPECT_PID/ > /evidence/proc.txt
# hash the evidence so it cannot be silently altered later
sha256sum /evidence/* > /evidence/MANIFEST.sha256`,
        output: `# connections.txt shows the attacker's live channel:
ESTAB 0 0 10.0.0.12:44122 203.0.113.9:443
  users:(("bash",pid=4102,fd=3))   <- reverse shell, still open
# capture it, THEN isolate the host.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You confirm an active intrusion on a server. Why is network-isolating the host usually better than immediately powering it off?',
        options: [
          'Powering off is slower',
          'Powering off destroys all volatile evidence in RAM — running malware, keys, live connections and the attacker\'s shell — while network isolation stops the spread yet preserves that evidence for capture',
          'You should never contain a host',
          'Network isolation removes the malware automatically',
        ],
        answer: 1,
        explain:
          'RAM holds evidence that exists nowhere else: injected code, decryption keys, open sockets, the attacker\'s in-memory tooling. A hard power-off erases all of it. Isolating from the network halts lateral movement and data exfil while leaving the volatile state intact to collect. Power-off is reserved for cases like active destruction where stopping it *now* outweighs the evidence.',
        hint: 'What is lost the instant the machine loses power, and can you get it back?',
      },
    },

    {
      id: 'blin-i-12',
      title: 'Project: a compromise-triage script',
      read: `Combine the level into one triage script — the thing you run the moment you suspect a Linux host is compromised. It gathers the volatile state and checks the common persistence and escalation spots, all read-only, in one pass.

The checks, and what each answers:

1. **Live connections** — \`ss -tunap\`: is there an open channel to an attacker?
2. **Suspicious processes** — high CPU, running from \`/tmp\` or \`/dev/shm\`, or a service account with a shell.
3. **SUID hunt** — any unexpected SUID binary (privesc)?
4. **Capability hunt** — \`getcap -r /\` (the invisible privesc).
5. **Backdoor SSH keys** — every user's authorized_keys.
6. **cron & timers** — scheduled re-launch of a payload.
7. **New accounts / extra root** — any UID 0 besides root, any new sudoer.
8. **Recent changes** — files modified in the last two days in sensitive dirs.

Run it, then read it as a story: an open reverse shell + a fresh cron job + a new authorized_keys line, all timestamped together, is one incident, not three coincidences.

> Store this script, and its output, **off the suspect host** — you never fully trust a tool that lives on a machine you think is compromised. Keeping a clean copy of your triage kit on read-only media is standard responder practice.`,
      sample: {
        lang: 'bash',
        caption: 'triage.sh — read-only compromise triage built from this level',
        code: `#!/bin/bash
echo "== $(date -u) on $(hostname) =="
echo "== live connections =="
ss -tunap 2>/dev/null | grep ESTAB
echo "== procs from tmp/shm =="
ps auxww | grep -E '/tmp/|/dev/shm/' | grep -v grep
echo "== unexpected SUID =="
find / -perm -4000 -type f 2>/dev/null
echo "== files with capabilities =="
getcap -r / 2>/dev/null
echo "== authorized_keys =="
grep -R "" /home/*/.ssh/authorized_keys /root/.ssh/authorized_keys 2>/dev/null
echo "== extra UID 0 =="
awk -F: '$3==0 {print $1}' /etc/passwd
echo "== changed in last 2 days under /etc /root =="
find /etc /root -mtime -2 -type f 2>/dev/null`,
        output: `== live connections ==
ESTAB ... 10.0.0.12:44122 203.0.113.9:443 users:(("bash",pid=4102))
== procs from tmp/shm ==
web 4090 ... /tmp/.x/kdevtmpfsi
== extra UID 0 ==
root
support        <- a SECOND UID-0 account: backdoor
== changed in last 2 days under /etc /root ==
/etc/passwd
/root/.ssh/authorized_keys`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The triage output shows a live connection to 203.0.113.9, a process from `/tmp`, a second UID-0 account named `support`, and `/etc/passwd` changed today. What is the correct read?',
        options: [
          'Four unrelated warnings, probably false positives',
          'One coordinated compromise: an open reverse shell, a dropped payload, and a backdoor root account added today — contain the host, preserve evidence, then eradicate every piece, because they reinstate each other',
          'Only the reverse shell matters; ignore the rest',
          'Reboot to clear it',
        ],
        answer: 1,
        explain:
          'The findings correlate in time and intent: the attacker has a live channel, a running payload, and a persistent backdoor (the extra UID-0 account) written into `/etc/passwd` today. This is a single incident. You contain (isolate), preserve the volatile evidence, then eradicate *all* of it — because removing only the process leaves the backdoor account, and the account can bring the rest back.',
        hint: 'Do the four findings share a time and a purpose? What happens if you fix only one?',
      },
    },
  ],
}

export default level
