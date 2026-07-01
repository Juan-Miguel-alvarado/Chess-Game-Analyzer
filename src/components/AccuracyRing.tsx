import { useEffect, useRef, useState } from 'react'

/** Animate a number from 0 to `target` with an ease-out curve. */
function useCountUp(target: number, duration = 850) {
  const [val, setVal] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * eased))
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])
  return val
}

function accuracyColor(v: number): string {
  if (v >= 85) return 'var(--rating-good)'
  if (v >= 70) return 'var(--rating-inaccuracy)'
  if (v >= 55) return 'var(--rating-mistake)'
  return 'var(--rating-blunder)'
}

function tier(v: number): string {
  if (v >= 95) return 'Excellent'
  if (v >= 88) return 'Great'
  if (v >= 80) return 'Good'
  if (v >= 70) return 'Fair'
  return 'Shaky'
}

interface Props {
  value: number
  label: string
}

export function AccuracyRing({ value, label }: Props) {
  const v = useCountUp(value)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const r = 26
  const circ = 2 * Math.PI * r
  const color = accuracyColor(value)
  const offset = mounted ? circ * (1 - value / 100) : circ

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth="6"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)',
              filter: `drop-shadow(0 0 3px color-mix(in srgb, ${color} 55%, transparent))`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>
            {v}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center leading-tight">
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {tier(value)}
        </span>
        <span className="max-w-[104px] truncate text-xs text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}
