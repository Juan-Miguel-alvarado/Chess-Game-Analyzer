import {
  IconBulb,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLoader2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { RATING_META, toWhiteCp } from '@/lib/classify'
import type { AnalyzedMove } from '@/lib/types'
import { MoveRatingIcon } from './MoveRatingIcon'

interface Props {
  move: AnalyzedMove | null
  ply: number
  total: number
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
}

function evalText(cp: number): string {
  const sign = cp > 0 ? '+' : cp < 0 ? '−' : ''
  return `${sign}${(Math.abs(cp) / 100).toFixed(2)}`
}

export function AnalysisPanel({
  move,
  ply,
  total,
  onFirst,
  onPrev,
  onNext,
  onLast,
}: Props) {
  const meta = move ? RATING_META[move.rating] : null
  const showBest =
    move && !move.isBest && move.rating !== 'brilliant' && move.bestMoveSan

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-[88px] rounded-xl border border-border bg-card p-4">
        {move && move.pending ? (
          <div className="flex items-center gap-3">
            <IconLoader2 size={24} className="animate-spin text-primary" />
            <div>
              <div className="text-lg font-semibold tabular-nums">
                {move.moveNumber}
                {move.color === 'w' ? '.' : '...'} {move.san}
              </div>
              <p className="text-sm text-muted-foreground">Evaluating your move…</p>
            </div>
          </div>
        ) : move && meta ? (
          <div className="flex items-start gap-3">
            <MoveRatingIcon rating={move.rating} size={30} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {move.moveNumber}
                  {move.color === 'w' ? '.' : '...'} {move.san}
                </span>
                <span
                  className="rounded-md px-1.5 py-0.5 text-xs font-semibold"
                  style={{
                    color: meta.colorVar,
                    backgroundColor: `color-mix(in srgb, ${meta.colorVar} 16%, transparent)`,
                  }}
                >
                  {meta.symbol === meta.label
                    ? meta.label
                    : `${meta.symbol} ${meta.label}`}
                </span>
                <span className="ml-auto text-sm font-medium tabular-nums text-muted-foreground">
                  {evalText(toWhiteCp(move.evalAfter))}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {meta.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center text-sm text-muted-foreground">
            Starting position — use the controls or click a move to step through
            the game.
          </div>
        )}
      </div>

      {showBest && (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          <IconBulb size={18} className="shrink-0 text-[var(--rating-best)]" />
          <span className="text-muted-foreground">Best move was</span>
          <span className="font-semibold text-[var(--rating-best)]">
            {move!.bestMoveSan}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" onClick={onFirst} disabled={ply < 0}>
            <IconChevronsLeft size={18} />
          </Button>
          <Button variant="secondary" size="icon" onClick={onPrev} disabled={ply < 0}>
            <IconChevronLeft size={18} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onNext}
            disabled={ply >= total - 1}
          >
            <IconChevronRight size={18} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={onLast}
            disabled={ply >= total - 1}
          >
            <IconChevronsRight size={18} />
          </Button>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {ply + 1} / {total}
        </span>
      </div>
    </div>
  )
}
