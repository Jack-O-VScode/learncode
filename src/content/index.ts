import type { Level, LevelId, Track, TrackId } from './types'
import { LEVEL_ORDER } from './types'

import pythonBeginner from './python/beginner'
import pythonAmateur from './python/amateur'
import pythonIntermediate from './python/intermediate'
import pythonSkilled from './python/skilled'
import pythonPro from './python/pro'

import htmlBeginner from './html/beginner'
import htmlAmateur from './html/amateur'
import htmlIntermediate from './html/intermediate'
import htmlSkilled from './html/skilled'
import htmlPro from './html/pro'

import cppBeginner from './cpp/beginner'
import cppAmateur from './cpp/amateur'
import cppIntermediate from './cpp/intermediate'
import cppSkilled from './cpp/skilled'
import cppPro from './cpp/pro'

import glBeginner from './cpp-gl/beginner'
import glAmateur from './cpp-gl/amateur'
import glIntermediate from './cpp-gl/intermediate'
import glSkilled from './cpp-gl/skilled'
import glPro from './cpp-gl/pro'

import blueLinuxBeginner from './blue-linux/beginner'
import blueLinuxAmateur from './blue-linux/amateur'
import blueLinuxIntermediate from './blue-linux/intermediate'
import blueLinuxSkilled from './blue-linux/skilled'
import blueLinuxPro from './blue-linux/pro'

import blueWindowsBeginner from './blue-windows/beginner'
import blueWindowsAmateur from './blue-windows/amateur'
import blueWindowsIntermediate from './blue-windows/intermediate'
import blueWindowsSkilled from './blue-windows/skilled'
import blueWindowsPro from './blue-windows/pro'

import blueNetworkBeginner from './blue-network/beginner'
import blueNetworkAmateur from './blue-network/amateur'
import blueNetworkIntermediate from './blue-network/intermediate'
import blueNetworkSkilled from './blue-network/skilled'
import blueNetworkPro from './blue-network/pro'

import blueWebBeginner from './blue-web/beginner'
import blueWebAmateur from './blue-web/amateur'
import blueWebIntermediate from './blue-web/intermediate'
import blueWebSkilled from './blue-web/skilled'
import blueWebPro from './blue-web/pro'

import redLinuxBeginner from './red-linux/beginner'
import redLinuxAmateur from './red-linux/amateur'
import redLinuxIntermediate from './red-linux/intermediate'
import redLinuxSkilled from './red-linux/skilled'
import redLinuxPro from './red-linux/pro'

import redWindowsBeginner from './red-windows/beginner'
import redWindowsAmateur from './red-windows/amateur'
import redWindowsIntermediate from './red-windows/intermediate'
import redWindowsSkilled from './red-windows/skilled'
import redWindowsPro from './red-windows/pro'

import redNetworkBeginner from './red-network/beginner'
import redNetworkAmateur from './red-network/amateur'
import redNetworkIntermediate from './red-network/intermediate'
import redNetworkSkilled from './red-network/skilled'
import redNetworkPro from './red-network/pro'

import redWebBeginner from './red-web/beginner'
import redWebAmateur from './red-web/amateur'
import redWebIntermediate from './red-web/intermediate'
import redWebSkilled from './red-web/skilled'
import redWebPro from './red-web/pro'

function levels(list: Level[]): Record<LevelId, Level> {
  return {
    beginner: list[0],
    amateur: list[1],
    intermediate: list[2],
    skilled: list[3],
    pro: list[4],
  }
}

export const TRACKS: Record<TrackId, Track> = {
  python: {
    id: 'python',
    name: 'Python',
    language: 'python',
    accent: '#38bdf8',
    tagline: 'The friendliest place to start',
    description:
      'Reads almost like English. Great first language, and the one used for automation, data, AI and back-ends.',
    levels: levels([
      pythonBeginner,
      pythonAmateur,
      pythonIntermediate,
      pythonSkilled,
      pythonPro,
    ]),
  },
  html: {
    id: 'html',
    name: 'HTML',
    language: 'html',
    accent: '#fb923c',
    tagline: 'Build pages you can actually see',
    description:
      'The language of every web page. You will see results instantly in a browser — and pick up CSS and a little JavaScript along the way.',
    levels: levels([htmlBeginner, htmlAmateur, htmlIntermediate, htmlSkilled, htmlPro]),
  },
  cpp: {
    id: 'cpp',
    name: 'C++ · Normal',
    language: 'cpp',
    accent: '#a78bfa',
    tagline: 'Fast, powerful, close to the machine',
    description:
      'The language behind games, engines and high-performance software. You control the memory, and nothing is hidden from you.',
    levels: levels([cppBeginner, cppAmateur, cppIntermediate, cppSkilled, cppPro]),
  },
  'cpp-gl': {
    id: 'cpp-gl',
    name: 'C++ · OpenGL',
    language: 'cpp',
    accent: '#f472b6',
    tagline: 'Same C++, but you draw things on screen',
    description:
      'Every C++ idea is taught through graphics: open a window, push triangles to the GPU, animate them, and end up with a 3D scene you fly through.',
    levels: levels([glBeginner, glAmateur, glIntermediate, glSkilled, glPro]),
  },

  /* ---------------------- Defensive cybersecurity (blue) ---------------------- */
  'blue-linux': {
    id: 'blue-linux',
    name: 'Defensive · Linux',
    language: 'security',
    accent: '#2dd4bf',
    tagline: 'Harden, monitor and defend a Linux host',
    description:
      'The shell, users and permissions, then hardening, log analysis and detection. You learn how attacks work so you can shut them down on a machine you run.',
    levels: levels([
      blueLinuxBeginner,
      blueLinuxAmateur,
      blueLinuxIntermediate,
      blueLinuxSkilled,
      blueLinuxPro,
    ]),
  },
  'blue-windows': {
    id: 'blue-windows',
    name: 'Defensive · Windows',
    language: 'security',
    accent: '#22d3ee',
    tagline: 'Defend Windows and Active Directory',
    description:
      'The Windows security model, PowerShell for defenders, Event Log analysis and Active Directory hardening — how to detect and stop the common attack paths.',
    levels: levels([
      blueWindowsBeginner,
      blueWindowsAmateur,
      blueWindowsIntermediate,
      blueWindowsSkilled,
      blueWindowsPro,
    ]),
  },
  'blue-network': {
    id: 'blue-network',
    name: 'Defensive · Networking',
    language: 'security',
    accent: '#60a5fa',
    tagline: 'Read the wire, catch the intruder',
    description:
      'TCP/IP, packet analysis in Wireshark, firewalls and IDS/IPS. Learn to see what normal traffic looks like so the abnormal jumps out.',
    levels: levels([
      blueNetworkBeginner,
      blueNetworkAmateur,
      blueNetworkIntermediate,
      blueNetworkSkilled,
      blueNetworkPro,
    ]),
  },
  'blue-web': {
    id: 'blue-web',
    name: 'Defensive · Web',
    language: 'security',
    accent: '#818cf8',
    tagline: 'Build and defend web apps that hold up',
    description:
      'How the web really works, the OWASP Top 10, and the defence for each one: input handling, authentication, access control, headers and secure design.',
    levels: levels([
      blueWebBeginner,
      blueWebAmateur,
      blueWebIntermediate,
      blueWebSkilled,
      blueWebPro,
    ]),
  },

  /* ---------------------- Offensive cybersecurity (red) ----------------------- */
  'red-linux': {
    id: 'red-linux',
    name: 'Offensive · Linux',
    language: 'security',
    accent: '#fb7185',
    tagline: 'Enumerate and escalate — in your own lab',
    description:
      'Authorized-testing methodology on Linux: enumeration, service analysis, privilege escalation and post-exploitation, practised only against machines you own or CTF targets.',
    levels: levels([
      redLinuxBeginner,
      redLinuxAmateur,
      redLinuxIntermediate,
      redLinuxSkilled,
      redLinuxPro,
    ]),
  },
  'red-windows': {
    id: 'red-windows',
    name: 'Offensive · Windows',
    language: 'security',
    accent: '#f87171',
    tagline: 'Windows and Active Directory attack paths',
    description:
      'How Windows and Active Directory are attacked in a real engagement — enumeration, credential attacks, lateral movement and privilege escalation — on lab domains you build.',
    levels: levels([
      redWindowsBeginner,
      redWindowsAmateur,
      redWindowsIntermediate,
      redWindowsSkilled,
      redWindowsPro,
    ]),
  },
  'red-network': {
    id: 'red-network',
    name: 'Offensive · Networking',
    language: 'security',
    accent: '#fb923c',
    tagline: 'Scan, capture and pivot, with permission',
    description:
      'Reconnaissance and network attack technique for authorized testers: scanning with nmap, traffic interception, man-in-the-middle concepts and pivoting through a network you are cleared to test.',
    levels: levels([
      redNetworkBeginner,
      redNetworkAmateur,
      redNetworkIntermediate,
      redNetworkSkilled,
      redNetworkPro,
    ]),
  },
  'red-web': {
    id: 'red-web',
    name: 'Offensive · Web',
    language: 'security',
    accent: '#f472b6',
    tagline: 'Find the OWASP Top 10 before attackers do',
    description:
      'Web application penetration testing: how to find and prove injection, XSS, broken access control and the rest of the OWASP Top 10, against deliberately vulnerable apps and authorized targets.',
    levels: levels([
      redWebBeginner,
      redWebAmateur,
      redWebIntermediate,
      redWebSkilled,
      redWebPro,
    ]),
  },
}

/* -------------------------------------------------------------------------- */
/*  Home cards                                                                 */
/* -------------------------------------------------------------------------- */

/** One selectable platform inside a multi-mode card (like C++'s Normal/OpenGL). */
export interface ModeOption {
  trackId: TrackId
  /** Short name shown on the mode card, e.g. "Linux". */
  label: string
  headline: string
  points: string[]
}

/** A card on the home page. Cards with more than one track show a mode chooser. */
export interface LanguageCard {
  id: string
  name: string
  blurb: string
  accent: string
  tracks: TrackId[]
  /** Present when the card leads to a mode chooser rather than straight to levels. */
  chooser?: {
    title: string
    intro: string
    modes: ModeOption[]
  }
}

const cyberModes = (prefix: 'blue' | 'red'): ModeOption[] => [
  {
    trackId: `${prefix}-linux` as TrackId,
    label: 'Linux',
    headline: prefix === 'blue' ? 'Defend a Linux host' : 'Attack a Linux host (in a lab)',
    points:
      prefix === 'blue'
        ? [
            'The shell, users, permissions and SUID',
            'Hardening, auditing and log analysis',
            'Detect privilege escalation and persistence',
          ]
        : [
            'Enumeration and service analysis',
            'Privilege escalation and post-exploitation',
            'Practised on your own VMs and CTF targets',
          ],
  },
  {
    trackId: `${prefix}-windows` as TrackId,
    label: 'Windows',
    headline: prefix === 'blue' ? 'Defend Windows & AD' : 'Attack Windows & AD (in a lab)',
    points:
      prefix === 'blue'
        ? [
            'The Windows security model and PowerShell',
            'Event Log analysis and detection',
            'Active Directory hardening',
          ]
        : [
            'Enumeration and credential attacks',
            'Lateral movement and privilege escalation',
            'On lab domains you build yourself',
          ],
  },
  {
    trackId: `${prefix}-network` as TrackId,
    label: 'Networking',
    headline: prefix === 'blue' ? 'Watch the wire' : 'Scan and pivot (authorized)',
    points:
      prefix === 'blue'
        ? [
            'TCP/IP and packet analysis in Wireshark',
            'Firewalls, IDS and IPS',
            'Spot the abnormal in real traffic',
          ]
        : [
            'Reconnaissance and scanning with nmap',
            'Traffic interception and MITM concepts',
            'Pivoting through a cleared network',
          ],
  },
  {
    trackId: `${prefix}-web` as TrackId,
    label: 'Web',
    headline: prefix === 'blue' ? 'Defend web apps' : 'Test web apps (authorized)',
    points:
      prefix === 'blue'
        ? [
            'How the web works and the OWASP Top 10',
            'Input handling, auth and access control',
            'Secure headers and secure design',
          ]
        : [
            'Find and prove the OWASP Top 10',
            'Injection, XSS, broken access control',
            'Against deliberately vulnerable apps',
          ],
  },
]

export const LANGUAGES: LanguageCard[] = [
  {
    id: 'python',
    name: 'Python',
    blurb: 'Start here if you have never coded. Clear, readable, useful everywhere.',
    accent: '#38bdf8',
    tracks: ['python'],
  },
  {
    id: 'html',
    name: 'HTML',
    blurb: 'Make real web pages. Instant visual feedback, plus CSS and a taste of JavaScript.',
    accent: '#fb923c',
    tracks: ['html'],
  },
  {
    id: 'cpp',
    name: 'C++',
    blurb: 'Serious performance. Choose plain C++, or the OpenGL mode that draws graphics.',
    accent: '#a78bfa',
    tracks: ['cpp', 'cpp-gl'],
    chooser: {
      title: 'Which kind of C++?',
      intro:
        'C++ has two modes. Both teach the same language — the OpenGL mode just makes every lesson produce something you can see. You can switch at any time, and each mode keeps its own progress.',
      modes: [
        {
          trackId: 'cpp',
          label: 'Normal',
          headline: 'C++ on its own',
          points: [
            'Everything happens in a terminal window',
            'Variables, loops, functions, classes, memory, templates',
            'The standard route — pick this if you are unsure',
          ],
        },
        {
          trackId: 'cpp-gl',
          label: 'OpenGL',
          headline: 'C++ that draws on screen',
          points: [
            'Same C++ language, taught through graphics',
            'Open a window, push triangles to the GPU, animate them, go 3D',
            'How far you get depends on the difficulty you pick next',
          ],
        },
      ],
    },
  },
  {
    id: 'defensive',
    name: 'Defensive Cybersecurity',
    blurb:
      'Blue team. Harden systems, read the logs, and catch intruders across Linux, Windows, networks and the web.',
    accent: '#2dd4bf',
    tracks: ['blue-linux', 'blue-windows', 'blue-network', 'blue-web'],
    chooser: {
      title: 'Defensive Cybersecurity — pick a platform',
      intro:
        'Blue-team defence, one track per platform. Each starts from no security background and works up to real detection and hardening. You learn how attacks work only so you can stop them, on systems you run.',
      modes: cyberModes('blue'),
    },
  },
  {
    id: 'offensive',
    name: 'Offensive Cybersecurity',
    blurb:
      'Red team, the ethical way. Penetration-testing method for Linux, Windows, networks and web — practised only on your own lab and authorized targets.',
    accent: '#f43f5e',
    tracks: ['red-linux', 'red-windows', 'red-network', 'red-web'],
    chooser: {
      title: 'Offensive Cybersecurity — pick a platform',
      intro:
        'Authorized penetration-testing method, one track per platform. Every technique is framed for your own lab VMs, deliberately vulnerable targets and CTFs — never against systems you do not own or have written permission to test. Ethics, scope and the law come first.',
      modes: cyberModes('red'),
    },
  },
]

export function getTrack(id: string | undefined): Track | null {
  if (!id) return null
  return (TRACKS as Record<string, Track>)[id] ?? null
}

/** The multi-mode card a track belongs to, if any (used for breadcrumbs). */
export function cardForTrack(trackId: string | undefined): LanguageCard | null {
  if (!trackId) return null
  return (
    LANGUAGES.find(
      (card) => (card.chooser?.modes.length ?? 0) > 0 && card.tracks.includes(trackId as TrackId),
    ) ?? null
  )
}

export function getCard(id: string | undefined): LanguageCard | null {
  if (!id) return null
  return LANGUAGES.find((card) => card.id === id) ?? null
}

export function getLevel(track: Track, levelId: string | undefined): Level | null {
  if (!levelId) return null
  if (!LEVEL_ORDER.includes(levelId as LevelId)) return null
  return track.levels[levelId as LevelId] ?? null
}

export function totalStepsInTrack(track: Track): number {
  return LEVEL_ORDER.reduce((sum, id) => sum + track.levels[id].steps.length, 0)
}

export const ALL_TRACK_IDS: TrackId[] = [
  'python',
  'html',
  'cpp',
  'cpp-gl',
  'blue-linux',
  'blue-windows',
  'blue-network',
  'blue-web',
  'red-linux',
  'red-windows',
  'red-network',
  'red-web',
]
