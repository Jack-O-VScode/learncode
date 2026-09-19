interface Props {
  pct: number
  accent?: string
  /** Shows "7 / 12" style text next to the bar. */
  label?: string
  thin?: boolean
}

export function ProgressBar({ pct, accent = '#38bdf8', label, thin = false }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className={thin ? 'pbar thin' : 'pbar'}>
      <div
        className="pbar-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${clamped}% complete`}
      >
        <div
          className="pbar-fill"
          style={{ width: `${clamped}%`, backgroundColor: accent }}
        />
      </div>
      {label && <span className="pbar-label">{label}</span>}
    </div>
  )
}

export function ProgressRing({
  pct,
  accent = '#38bdf8',
  size = 54,
}: {
  pct: number
  accent?: string
  size?: number
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)))
  const stroke = 5
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  return (
    <svg className="pring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="pring-text">
        {clamped}%
      </text>
    </svg>
  )
}
