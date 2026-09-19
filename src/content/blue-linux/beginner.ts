import type { Level } from '../types'

const level: Level = {
  id: 'beginner',
  title: 'The defender’s Linux — from zero',
  summary:
    'Assumes no security background at all. Get a Linux to practise on, learn the shell, the filesystem, users and permissions, and where the logs live — the ground every defender stands on. Ethics and authorization come first.',
  outcomes: [
    'Explain what defensive security is and the CIA triad',
    'Get a safe Linux environment to practise in',
    'Move around the filesystem and read files and logs',
    'Understand Linux users, groups and identity',
    'Read and reason about file permissions',
    'Use sudo, ps and grep — the defender’s daily tools',
  ],
  steps: [
    {
      id: 'blin-b-01',
      title: 'What defensive security actually is',
      read: `**Defensive security** — "blue team" — is the work of keeping systems and data safe: hardening them so attacks are hard, watching them so attacks are noticed, and responding when something gets through.

Everything in security is measured against three goals, the **CIA triad**:

- **Confidentiality** — only the right people can read the data
- **Integrity** — the data and systems are not tampered with
- **Availability** — the systems are up when they are needed

An attack breaks one or more of these. A defence protects one or more of these. When you are unsure whether something matters, ask which letter it touches.

## Why start with Linux

Most servers, most cloud, most of the internet's plumbing runs on Linux. Almost every security tool runs on it. And Linux makes its security model visible — users, permissions, processes and logs are all right there in plain text, which is exactly what a defender needs to read.

## The rule before any of this

You only ever practise on systems **you own or have explicit written permission to test**. This whole track is built around your own machine or a virtual machine you create. Touching someone else's system without authorization is a crime in most of the world — the Computer Fraud and Abuse Act in the US, the Computer Misuse Act in the UK, and equivalents elsewhere — regardless of intent. Defence is done on your own turf. Keep it there.`,
      sample: {
        lang: 'text',
        caption: 'The same event, seen through the CIA triad',
        code: `Event: an attacker copies your customer database.

  Confidentiality  BROKEN   — they can now read private data
  Integrity        intact   — they only read, did not change it
  Availability     intact   — your copy still works

Event: ransomware encrypts your servers.

  Confidentiality  maybe    — depends if they also stole a copy
  Integrity        BROKEN   — files are altered (encrypted)
  Availability     BROKEN   — you cannot use the systems`,
        output: `A defender's job: reduce the chance of each break, and
notice quickly when one happens.`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'A denial-of-service attack floods your website so real customers cannot reach it. Which part of the CIA triad is primarily broken?',
        options: ['Confidentiality', 'Integrity', 'Availability', 'None of them'],
        answer: 2,
        explain:
          'Nothing was read or altered — the site is simply unreachable, so **availability** is the casualty. Naming which letter an event breaks is the fastest way to reason about what a control is actually protecting.',
        hint: 'Nobody read the data or changed it. What did they take away?',
      },
    },

    {
      id: 'blin-b-02',
      title: 'Getting a Linux to practise on safely',
      read: `You need a Linux you can poke at, break and reset without risk. Never learn on a machine that matters.

## The options, easiest first

- **WSL (Windows)** — "Windows Subsystem for Linux". Open PowerShell and run \`wsl --install\`. You get a real Ubuntu shell inside Windows in a few minutes. Great for learning the command line.
- **A virtual machine** — install **VirtualBox** (free) and inside it install **Ubuntu** or, for a security-focused kit, **Kali Linux**. A VM is fully isolated: you can snapshot it, break it, and roll back. This is the proper lab.
- **Mac / Linux already** — you have a terminal now, though a separate VM is still safer for experiments.

## Snapshots are your safety net

The single best habit: take a **snapshot** of your VM when it is clean. Experiment, and if you wreck it, roll back to the snapshot in seconds. Defenders test dangerous things constantly; snapshots make that safe.

## The prompt

When a shell is ready you see a **prompt**, usually ending in \`$\` (normal user) or \`#\` (root — the all-powerful admin). That single character tells you how much damage a mistyped command could do. Respect the \`#\`.`,
      sample: {
        lang: 'bash',
        caption: 'Confirming you have a working shell',
        code: `# Windows PowerShell, once:
wsl --install

# then, inside the Linux shell:
whoami
uname -a
cat /etc/os-release | head -2`,
        output: `student
Linux lab 6.5.0-14-generic #14-Ubuntu SMP x86_64 GNU/Linux
NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"`,
      },
      question: {
        kind: 'mcq',
        prompt: 'Why is a virtual machine with snapshots the ideal place to learn security?',
        options: [
          'VMs run faster than real machines',
          'It is fully isolated and you can roll back to a clean state in seconds, so mistakes and experiments cost nothing',
          'Only VMs can run Linux',
          'Snapshots make the machine more secure against attackers',
        ],
        answer: 1,
        explain:
          'Isolation plus instant rollback is exactly what learning security needs: you can run something risky, watch what it does, and undo it. A snapshot is a saved clean state, not a security control against real attackers.',
        hint: 'What lets you break things without consequences?',
      },
    },

    {
      id: 'blin-b-03',
      title: 'The filesystem: where everything lives',
      read: `Linux organises everything into one tree that starts at the **root**, written \`/\`. There are no drive letters; every disk hangs off this one tree.

## The directories a defender cares about

- \`/etc\` — **configuration**. Almost every system setting is a text file here. \`/etc/passwd\` (accounts), \`/etc/ssh/sshd_config\` (remote login rules), and more.
- \`/var/log\` — the **logs**. Where the system records what happened. You will live here.
- \`/home\` — users' personal folders.
- \`/tmp\` — temporary files anyone can write to. Attackers love it; watch it.
- \`/bin\`, \`/usr/bin\` — the programs (commands).
- \`/root\` — the root user's home. Note this is *not* \`/\`.

## Moving around

- \`pwd\` — "print working directory": where am I?
- \`ls\` — list what is here. \`ls -l\` for detail, \`ls -a\` to include hidden files (names starting with \`.\`), \`ls -la\` for both.
- \`cd somewhere\` — change directory. \`cd ..\` goes up one level, \`cd\` alone goes home, \`cd /var/log\` jumps to an absolute path.

## Hidden files matter in security

Files beginning with \`.\` are hidden from a plain \`ls\`. Configuration and, sometimes, things an attacker wants out of sight live there. A defender always looks with \`ls -a\`.`,
      sample: {
        lang: 'bash',
        caption: 'Orienting yourself, then looking where the logs live',
        code: `pwd
cd /var/log
pwd
ls -la | head -8`,
        output: `/home/student
/var/log
total 1240
drwxr-xr-x  10 root   root      4096 Jun  1 09:14 .
drwxr-xr-x  13 root   root      4096 May 20 11:02 ..
-rw-r-----   1 syslog adm      82311 Jun  1 09:15 auth.log
-rw-r-----   1 syslog adm     140233 Jun  1 09:15 syslog
-rw-r--r--   1 root   root      1092 May 20 11:02 dpkg.log`,
      },
      question: {
        kind: 'fill',
        prompt:
          'You want to list everything in the current folder, including hidden files, with full detail. What command do you type?',
        placeholder: 'a command',
        accept: ['ls -la', 'ls -al', 'ls -a -l', 'ls -l -a', 'ls -lah', 'ls -hal', 'ls -alh'],
        explain:
          '`ls -la` combines `-l` (long detail: permissions, owner, size, date) with `-a` (include hidden dotfiles). Defenders always include `-a`, because things worth hiding start with a dot.',
        hint: 'Combine the "long" flag and the "all" flag after ls.',
      },
    },

    {
      id: 'blin-b-04',
      title: 'Reading files and logs',
      read: `A huge part of defence is reading text — config files and, above all, logs. Linux gives you a set of tools for it, and picking the right one matters when a log is millions of lines long.

- \`cat file\` — dump the whole file to the screen. Fine for short files; a disaster for a 2 GB log.
- \`less file\` — open a file to scroll through. Arrow keys and Page Up/Down move; \`/word\` searches; \`q\` quits. **The right tool for big logs.**
- \`head file\` — the first 10 lines. \`head -n 20\` for 20.
- \`tail file\` — the **last** 10 lines. This is where the newest events are.
- \`tail -f file\` — "follow": keep printing new lines as they are written. This is how you watch a log **live** while something happens. Press Ctrl+C to stop.

## The defender's instinct

When you want to know what *just* happened, you go to the **end** of the log with \`tail\`. When you want to watch something happen, you \`tail -f\`. When you need to read a whole large file, you \`less\` it, never \`cat\` it.

## wc counts

\`wc -l file\` counts the lines — a quick way to ask "how many failed logins today?" once you can filter.`,
      sample: {
        lang: 'bash',
        caption: 'Watching the authentication log live as someone logs in',
        code: `sudo tail -f /var/log/auth.log`,
        output: `Jun  1 09:41:02 lab sshd[2011]: Failed password for root from 203.0.113.9 port 55210 ssh2
Jun  1 09:41:05 lab sshd[2011]: Failed password for root from 203.0.113.9 port 55210 ssh2
Jun  1 09:41:09 lab sshd[2013]: Accepted password for student from 192.168.1.5 port 49882 ssh2
Jun  1 09:41:09 lab sshd[2013]: pam_unix(sshd:session): session opened for user student
^C`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'You want to watch a log update in real time while you test a login. Which command?',
        options: ['`cat /var/log/auth.log`', '`head /var/log/auth.log`', '`tail -f /var/log/auth.log`', '`less /var/log/auth.log`'],
        answer: 2,
        explain:
          '`tail -f` follows the file, printing each new line as it is written — exactly what you want to watch events as they happen. `cat` and `head` show a fixed snapshot; `less` lets you scroll but does not auto-update.',
        hint: 'Which one keeps running and shows new lines as they arrive?',
      },
    },

    {
      id: 'blin-b-05',
      title: 'Users, groups and identity',
      read: `Linux security is built on **who you are**. Every action is done by a user, and every user has a numeric **UID**.

- **root** is UID 0 — the superuser, who can do anything. Compromising a normal account is bad; compromising root is game over.
- Normal human users have UIDs from 1000 up.
- **Service accounts** (like \`www-data\` for a web server) have low UIDs and exist so programs run with as few privileges as possible.

## The commands

- \`whoami\` — which user am I right now?
- \`id\` — my UID, my primary group, and every group I belong to
- \`who\` / \`w\` — who is logged in right now (a defender checks this — is that session yours?)
- \`last\` — a history of recent logins

## Where accounts are defined

\`/etc/passwd\` lists every account, one per line. Despite the name it holds **no passwords** — those moved to \`/etc/shadow\` (readable only by root) decades ago, precisely so that a normal user reading the account list cannot get at the password hashes.

Each \`/etc/passwd\` line is colon-separated: \`name:x:UID:GID:comment:home:shell\`. The \`x\` is a placeholder where the password used to be. An account whose shell is \`/usr/sbin/nologin\` or \`/bin/false\` cannot log in interactively — common and correct for service accounts.`,
      sample: {
        lang: 'bash',
        caption: 'Who am I, and who exists on this box',
        code: `id
echo "---"
grep -vE '/(nologin|false)$' /etc/passwd`,
        output: `uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)
---
root:x:0:0:root:/root:/bin/bash
student:x:1000:1000:Student:/home/student:/bin/bash`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is special about the user with UID 0?',
        options: [
          'It is the first human user',
          'It is root — the superuser, who can do anything on the system',
          'It is a disabled account',
          'It is the guest account',
        ],
        answer: 1,
        explain:
          'UID 0 is always root, regardless of the name. Root bypasses permission checks entirely, which is why gaining root ("privilege escalation") is an attacker\'s goal and protecting it is a defender\'s priority.',
        hint: 'Zero is the most powerful number on a Linux system.',
      },
    },

    {
      id: 'blin-b-06',
      title: 'Permissions: the heart of Linux security',
      read: `Every file and directory has permissions controlling **who can do what**. This is the single most important defensive concept on Linux, and \`ls -l\` shows it on the left of every line:

\`\`\`
-rw-r--r--  1  alice  staff  ...
\`\`\`

Read that ten-character block in four parts:

1. \`-\` — the **type**: \`-\` file, \`d\` directory, \`l\` symbolic link
2. \`rw-\` — what the **owner** (alice) may do
3. \`r--\` — what the **group** (staff) may do
4. \`r--\` — what **everyone else** ("other") may do

Each group of three is **r** (read), **w** (write), **x** (execute), or \`-\` if not allowed. So \`rw-r--r--\` means: owner can read and write; group and everyone else can only read.

## What the letters mean

- On a **file**: r = read the contents, w = change it, x = run it as a program
- On a **directory**: r = list its names, w = create/delete files in it, x = enter it (\`cd\` into it and access files inside)

## Why defenders care

Wrong permissions are one of the most common real vulnerabilities. A private key that "other" can read, a config with a password readable by everyone, a directory anyone can write to — each is a door left open. Reading permissions fluently is a core defensive skill.`,
      sample: {
        lang: 'bash',
        caption: 'Reading permissions — one of these is a problem',
        code: `ls -l /home/student/.ssh/`,
        output: `-rw-------  1 student student  411 Jun  1 id_ed25519       <- private key, owner-only: GOOD
-rw-r--r--  1 student student   98 Jun  1 id_ed25519.pub   <- public key, world-readable: fine
-rw-rw-rw-  1 student student  156 Jun  1 config           <- world-WRITABLE: bad`,
      },
      question: {
        kind: 'mcq',
        prompt: 'A file shows permissions `-rw-r--r--`. Who can change its contents?',
        options: [
          'Everyone',
          'Only the owner',
          'The owner and the group',
          'Nobody',
        ],
        answer: 1,
        explain:
          'Only the owner has `w` (the `rw-` block). Group and "other" have `r--` — read only. Write access is what lets someone alter a file, so here only the owner can.',
        hint: 'Find the "w" and see which of the three blocks it is in.',
      },
    },

    {
      id: 'blin-b-07',
      title: 'Changing permissions and ownership',
      read: `You read permissions with \`ls -l\`; you change them with \`chmod\`, and change ownership with \`chown\`.

## chmod, the readable way

\`chmod who±what file\`:
- who: \`u\` owner, \`g\` group, \`o\` other, \`a\` all
- \`+\` add, \`-\` remove
- what: \`r\`, \`w\`, \`x\`

\`chmod o-w config\` removes write from "other". \`chmod u+x script.sh\` makes a script runnable by its owner.

## chmod, the numeric way

Each permission is a number: **r=4, w=2, x=1**. Add them per block:
- \`rwx\` = 4+2+1 = **7**
- \`rw-\` = 4+2 = **6**
- \`r--\` = **4**
- \`---\` = **0**

So \`chmod 600 secret\` means \`rw-------\` (owner read/write, nobody else) — the correct mode for a private key or a secret. \`chmod 644\` is \`rw-r--r--\`, \`chmod 755\` is \`rwxr-xr-x\` (typical for programs and directories).

The three digits are owner, group, other — in that order. Memorise **600** (private secret), **644** (readable file), **755** (runnable/enterable).

## chown

\`chown alice file\` makes alice the owner; \`chown alice:staff file\` sets owner and group. Needs root.

## The defensive move

When you find something too open, you tighten it: \`chmod 600\` a leaked key, \`chmod o-w\` a world-writable config. Least privilege means giving each thing the *least* access that still lets it work.`,
      sample: {
        lang: 'bash',
        caption: 'Fixing the world-writable config from the last step',
        code: `ls -l config
chmod 600 config
ls -l config`,
        output: `-rw-rw-rw- 1 student student 156 Jun  1 config
-rw------- 1 student student 156 Jun  1 config`,
      },
      question: {
        kind: 'fill',
        prompt:
          'A private SSH key must be readable and writable by its owner only, and completely closed to everyone else. What single `chmod` command with a numeric mode sets that? (Just the command.)',
        placeholder: 'chmod ??? id_ed25519',
        accept: ['chmod 600 id_ed25519', 'chmod 0600 id_ed25519'],
        explain:
          'Owner rw = 4+2 = 6; group and other get 0. So `chmod 600 id_ed25519` gives `rw-------`. SSH actually refuses to use a private key that is more open than this, which is a rare case of a tool enforcing good permissions for you.',
        hint: 'Owner read+write is 6; the other two blocks are 0.',
      },
    },

    {
      id: 'blin-b-08',
      title: 'root, sudo and least privilege',
      read: `You should almost never log in as **root**. Instead you run individual commands as root with **sudo** ("superuser do").

\`\`\`
sudo apt update
\`\`\`

This runs one command with root power, asks for *your* password (not root's), and logs it. Everything else you do stays as your limited normal user.

## Why this is a security control, not an inconvenience

- **Least privilege** — you only hold root power for the one command that needs it, then drop it. A mistake or a malicious program in your normal session cannot casually wreck the system.
- **Accountability** — every \`sudo\` is written to \`/var/log/auth.log\` with who ran what. On a shared system that audit trail is gold.
- **No shared root password** — each admin uses their own password; you can revoke one person without changing a secret everyone knows.

## Who can sudo

Membership of the \`sudo\` group (Ubuntu/Debian) or \`wheel\` (RHEL/Fedora) grants it. \`id\` shows your groups. The rules live in \`/etc/sudoers\`, edited only with \`visudo\` (which checks your edit before saving — a broken sudoers file can lock everyone out).

## The defensive habit

Treat every \`sudo\` as a deliberate act. And when reviewing a system, the \`sudo\` log and the sudoers file tell you exactly who can become root — one of the first things a defender audits.`,
      sample: {
        lang: 'bash',
        caption: 'sudo runs one command as root and records it',
        code: `whoami
sudo whoami
sudo tail -1 /var/log/auth.log`,
        output: `student
root
Jun  1 10:02:11 lab sudo: student : TTY=pts/0 ; PWD=/home/student ; USER=root ; COMMAND=/usr/bin/whoami`,
      },
      question: {
        kind: 'mcq',
        prompt: 'What is the security advantage of `sudo command` over logging in as root and staying there?',
        options: [
          'sudo commands run faster',
          'You hold root power only for that one command and it is logged with your identity — least privilege plus an audit trail',
          'sudo does not need a password',
          'It hides what you did from the logs',
        ],
        answer: 1,
        explain:
          'sudo grants root for a single command, then you are back to your limited user, and every use is recorded against your name. That is least privilege and accountability in one — the opposite of a permanent, anonymous root session.',
        hint: 'Think about how long you hold the power, and who can see what was done.',
      },
    },

    {
      id: 'blin-b-09',
      title: 'Processes: what is running',
      read: `A **process** is a running program. Every process has a **PID** (process ID), an owner, and a command line. Knowing what should be running — and spotting what should not — is core to detecting an intrusion.

## Listing processes

- \`ps aux\` — every process on the system, with owner, PID, CPU and memory use, and the full command. The workhorse.
- \`top\` (or the friendlier \`htop\`) — a live, updating view, sorted by resource use. Great for catching a process pegging the CPU (cryptominers do this).
- \`pstree\` — processes as a tree, so you can see what launched what.

## Reading ps aux

The columns that matter to a defender: **USER** (who is it running as? should \`www-data\` really be running a shell?), **PID**, **%CPU**, and the **COMMAND** at the end. A weird command, a process running from \`/tmp\`, or a service account running an interactive shell are all red flags.

## Stopping a process

\`kill PID\` asks a process to stop; \`kill -9 PID\` forces it. You need to own the process or be root.

## The defensive instinct

Attackers run things. A miner, a reverse shell, a scanning tool — they all appear in the process list. Learning what *normal* looks like on your own box is what lets the *abnormal* stand out later. Look often; build the baseline in your head.`,
      sample: {
        lang: 'bash',
        caption: 'Two suspicious processes hiding in a normal list',
        code: `ps aux --sort=-%cpu | head -6`,
        output: `USER     PID  %CPU %MEM COMMAND
student  4102  98.7  1.2 /tmp/.x/kdevtmpfsi          <- 99% CPU from /tmp: likely a miner
www-data 3980  0.4   0.8 /bin/bash -i                <- web user running a shell: reverse shell?
root     1     0.0   0.1 /sbin/init
student  4110  0.0   0.2 ps aux --sort=-%cpu
root     880   0.0   0.3 /usr/sbin/sshd -D`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'In a process list you see `www-data` running `/bin/bash -i`. Why is that suspicious?',
        options: [
          'www-data is not a real user',
          'A web-server service account has no reason to be running an interactive shell — it is a classic sign of a compromised web app spawning a shell',
          'bash cannot be run interactively',
          'It is using too much CPU',
        ],
        answer: 1,
        explain:
          '`www-data` exists only to run the web server with minimal privilege. An interactive shell owned by it almost always means an attacker exploited the web app and is now running commands as that account. Knowing what each service account *should* do is what makes this jump out.',
        hint: 'What is www-data supposed to be doing, and is running a shell part of it?',
      },
    },

    {
      id: 'blin-b-10',
      title: 'grep: the defender’s magnifying glass',
      read: `Logs are enormous. **grep** finds the lines you care about. If you learn one tool deeply on this track, make it grep.

\`\`\`
grep "pattern" file
\`\`\`

It prints every line containing the pattern. The flags that matter:

- \`-i\` — ignore case (\`grep -i failed\` matches Failed, FAILED, failed)
- \`-r\` — search a whole directory tree
- \`-n\` — show line numbers
- \`-v\` — **invert**: show lines that do *not* match (great for filtering out noise)
- \`-c\` — count matching lines instead of printing them
- \`-E\` — use extended regular expressions (for \`|\` = "or", and more)

## Chaining with the pipe

The \`|\` symbol sends one command's output into another. This is where the shell becomes powerful:

\`\`\`
grep "Failed password" /var/log/auth.log | grep -c "root"
\`\`\`

"Find failed logins, then count how many were against root." A defender builds answers by piping small tools together.

## Real defensive questions grep answers

- How many failed SSH logins today? \`grep -c "Failed password" auth.log\`
- Which IPs are attacking? \`grep "Failed password" auth.log\` and read the addresses
- Did anyone actually get in? \`grep "Accepted" auth.log\`
- Search everything under /etc for a leaked word: \`grep -rn "password" /etc 2>/dev/null\``,
      sample: {
        lang: 'bash',
        caption: 'From a noisy log to a clear answer in one pipeline',
        code: `grep "Failed password" /var/log/auth.log | wc -l
grep "Failed password" /var/log/auth.log | grep -oE "from [0-9.]+" | sort | uniq -c | sort -rn | head -3`,
        output: `1184
    901 from 203.0.113.9
    212 from 198.51.100.4
     71 from 192.0.2.77`,
      },
      question: {
        kind: 'code',
        lang: 'bash',
        prompt:
          'Write a command that counts how many lines in `/var/log/auth.log` contain the text `Accepted` (successful logins). Use grep.',
        starter: 'grep ',
        mustInclude: [
          '(grep\\s+-\\w*c\\w*\\s+["\']?Accepted["\']?\\s+/var/log/auth\\.log|grep\\s+["\']?Accepted["\']?\\s+/var/log/auth\\.log\\s*\\|\\s*wc\\s+-l)',
        ],
        accept: [
          'grep -c "Accepted" /var/log/auth.log',
          'grep -c Accepted /var/log/auth.log',
          "grep -c 'Accepted' /var/log/auth.log",
        ],
        solution: 'grep -c "Accepted" /var/log/auth.log',
        explain:
          '`-c` makes grep count matching lines instead of printing them, answering "how many successful logins?" in one step. You could also pipe to `wc -l`, but `-c` is the direct way.',
        hint: 'The flag that counts matches is -c.',
      },
    },

    {
      id: 'blin-b-11',
      title: 'Patching: the most effective defence there is',
      read: `The most common way real systems get breached is not a genius hacker — it is an **unpatched known vulnerability**. Software has flaws; vendors release fixes; the systems that do not apply them get hit by automated tools scanning for exactly those flaws. Keeping software current is, boringly, the highest-value thing a defender does.

## On Debian/Ubuntu (apt)

- \`sudo apt update\` — refresh the list of available updates (does not install anything)
- \`sudo apt upgrade\` — install the available updates
- \`apt list --upgradable\` — see what is out of date

On RHEL/Fedora the equivalent is \`dnf\` (\`sudo dnf upgrade\`).

## Why "update then upgrade"

\`apt update\` only downloads the *catalogue* of what is available. \`apt upgrade\` is what actually changes your system. New defenders often run \`update\`, see activity, and think they patched — they did not. You need both.

## Checking what a package is

\`apt list --installed\` shows everything installed — useful when auditing a box for software that should not be there. \`dpkg -l\` does similar. Unexpected packages are worth investigating.

## The defensive routine

A patched, minimal system is a small target. Every extra package is more code that can have a flaw, so defenders also *remove* what is not needed. "Reduce the attack surface" is just: run less software, and keep what you run up to date.`,
      sample: {
        lang: 'bash',
        caption: 'The two-step patch, and checking what is exposed',
        code: `sudo apt update
apt list --upgradable
sudo apt upgrade -y`,
        output: `Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease
Get:2 http://security.ubuntu.com/ubuntu jammy-security InRelease
Fetched 328 kB in 1s
Listing... Done
openssl/jammy-security 3.0.2-0ubuntu1.12 amd64 [upgradable from: 3.0.2-0ubuntu1.10]
sudo/jammy-updates 1.9.9-1ubuntu2.4 amd64 [upgradable from: 1.9.9-1ubuntu2.1]
...
The following packages will be upgraded: openssl sudo ...
Setting up openssl (3.0.2-0ubuntu1.12) ...`,
      },
      question: {
        kind: 'mcq',
        prompt: 'You run `sudo apt update` and see lots of output, then walk away. Is the system patched?',
        options: [
          'Yes — update installs the fixes',
          'No — `apt update` only refreshes the catalogue of available updates; `apt upgrade` is what actually installs them',
          'Yes, but only the security fixes',
          'Only after a reboot',
        ],
        answer: 1,
        explain:
          '`apt update` downloads the list of what *could* be updated and changes nothing on the system. You must then run `apt upgrade` to install the fixes. Confusing the two is a genuinely common reason systems sit unpatched.',
        hint: 'One command refreshes a list; a different one installs.',
      },
    },

    {
      id: 'blin-b-12',
      title: 'Project: a 5-minute host checkup',
      read: `Put it together into something a defender actually does: a quick "is this box healthy and who is on it?" checkup. Every command here is one you have met.

The routine, and what each line answers:

1. **Who am I, and am I meant to have this power?** — \`id\`
2. **Who else is logged in right now?** — \`who\` (is that session yours?)
3. **Who can become root?** — the members of the sudo group
4. **What is eating the CPU?** — \`ps aux --sort=-%cpu | head\` (miners, runaway processes)
5. **Any recent failed logins, and from where?** — grep the auth log
6. **Did anyone get in successfully?** — grep for Accepted
7. **Is anything world-writable where it should not be?** — a quick find
8. **Is the system patched?** — \`apt list --upgradable\`

Run this on your own lab VM. The point is not the individual commands — it is building the *habit* of asking these questions and knowing what a normal answer looks like, so an abnormal one stands out. That baseline in your head is the beginning of real detection.

> Save it as a script (\`checkup.sh\`), \`chmod 700\` it so only you can run it, and run it whenever you sit down at a box. You have just written your first defensive tool.`,
      sample: {
        lang: 'bash',
        caption: 'checkup.sh — a first defensive script, built from beginner commands',
        code: `#!/bin/bash
echo "== identity ==";        id
echo "== logged in now ==";  who
echo "== who can sudo ==";   grep '^sudo:' /etc/group
echo "== top CPU ==";        ps aux --sort=-%cpu | head -4
echo "== failed logins ==";  sudo grep -c "Failed password" /var/log/auth.log
echo "== successful ==";     sudo grep -c "Accepted" /var/log/auth.log
echo "== world-writable in /etc =="
sudo find /etc -type f -perm -o+w 2>/dev/null
echo "== updates pending =="; apt list --upgradable 2>/dev/null | grep -c upgradable`,
        output: `== identity ==
uid=1000(student) gid=1000(student) groups=1000(student),27(sudo)
== logged in now ==
student  pts/0  2024-06-01 10:15 (192.168.1.5)
== who can sudo ==
sudo:x:27:student
== top CPU ==
USER  PID  %CPU COMMAND
student 4102 98.7 /tmp/.x/kdevtmpfsi
== failed logins ==
1184
== successful ==
6
== world-writable in /etc ==
== updates pending ==
14`,
      },
      question: {
        kind: 'mcq',
        prompt:
          'The checkup shows one process at 98.7% CPU running from `/tmp`, and 1,184 failed logins. What is the most reasonable defensive read?',
        options: [
          'Everything is fine; high CPU is normal',
          'The box is likely under attack (mass login attempts) and possibly already compromised (a CPU-heavy process running from /tmp) — investigate the process and the source IPs',
          'Reboot and ignore it',
          'The failed logins prove the attacker succeeded',
        ],
        answer: 1,
        explain:
          'Two independent red flags: a flood of failed logins is an active brute-force, and a CPU-pegging binary running out of /tmp is a textbook cryptominer dropped after a compromise. Neither alone is proof, but together they say "investigate now" — check the process, its parent, and whether any login was Accepted. Building the checkup habit is what surfaces this in five minutes.',
        hint: 'Two separate signals point the same way. What do a /tmp CPU-hog and a login flood each suggest?',
      },
    },
  ],
}

export default level
