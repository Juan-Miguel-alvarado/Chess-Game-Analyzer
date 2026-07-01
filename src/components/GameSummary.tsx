import { useEffect, useState } from 'react'
import { IconChevronRight } from '@tabler/icons-react'
import { RATING_META, RATING_ORDER } from '@/lib/classify'
import type { AnalysisSummary, AnalyzedMove, Rating } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AccuracyRing } from './AccuracyRing'
import { MoveRatingIcon } from './MoveRatingIcon'

interface Props {
  summary: AnalysisSummary
  white: string
  black: string
  moves: AnalyzedMove[]
  currentPly: number
  onJump: (plyIndex: number) => void
  activeRating: Rating | null
}

export function GameSummary({
  summary,
  white,
  black,
  moves,
  currentPly,
  onJump,
  activeRating,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Jump to the next move of a given rating after the current position (wraps).
  const jumpTo = (rating: Rating) => {
    const idxs = moves.filter((m) => m.rating === rating).map((m) => m.index)
    if (idxs.length === 0) return
    const next = idxs.find((i) => i > currentPly) ?? idxs[0]
    onJump(next)
  }

  const maxTotal = Math.max(
    1,
    ...RATING_ORDER.map((r) => summary.white[r] + summary.black[r]),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <AccuracyRing value={summary.accuracyWhite} label={white} />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Accuracy
        </span>
        <AccuracyRing value={summary.accuracyBlack} label={black} />
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center px-2 pb-0.5 text-[11px] font-medium text-muted-foreground">
          <span className="flex-1" />
          <span className="w-7 text-center">W</span>
          <span className="w-7 text-center">B</span>
        </div>
        {RATING_ORDER.map((r) => {
          const meta = RATING_META[r]
          const w = summary.white[r]
          const b = summary.black[r]
          const total = w + b
          const active = activeRating === r
          const barPct = mounted ? (total / maxTotal) * 100 : 0
          return (
            <button
              key={r}
              disabled={total === 0}
              onClick={() => jumpTo(r)}
              title={total > 0 ? `Jump to ${meta.label} moves` : undefined}
              className={cn(
                'group relative flex items-center overflow-hidden rounded-md px-2 py-1 text-sm transition-colors',
                total > 0 ? 'cursor-pointer hover:bg-secondary/50' : 'opacity-40',
                active && 'bg-secondary',
              )}
              style={
                active
                  ? { boxShadow: `inset 3px 0 0 0 ${meta.colorVar}` }
                  : undefined
              }
            >
              {/* Proportional distribution fill behind the row */}
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-[width] duration-700 ease-out"
                style={{
                  width: `${barPct}%`,
                  background: `color-mix(in srgb, ${meta.colorVar} ${active ? 22 : 13}%, transparent)`,
                }}
              />
              <span className="relative z-10 flex w-full items-center gap-2">
                <MoveRatingIcon rating={r} size={16} withTooltip={false} />
                <span className="flex flex-1 items-center gap-1.5">
                  {meta.symbol !== meta.label && (
                    <span
                      className="font-semibold"
                      style={{ color: meta.colorVar }}
                    >
                      {meta.symbol}
                    </span>
                  )}
                  <span
                    className={cn(active ? 'text-foreground' : 'text-muted-foreground')}
                  >
                    {meta.label}
                  </span>
                  {total > 0 && (
                    <IconChevronRight
                      size={13}
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70"
                    />
                  )}
                </span>
                <span
                  className="w-7 text-center font-semibold tabular-nums"
                  style={w > 0 ? { color: meta.colorVar } : undefined}
                >
                  {w}
                </span>
                <span
                  className="w-7 text-center font-semibold tabular-nums"
                  style={b > 0 ? { color: meta.colorVar } : undefined}
                >
                  {b}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
