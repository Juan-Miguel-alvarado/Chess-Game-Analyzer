import { RATING_META, RATING_ORDER } from '@/lib/classify'
import type { AnalysisSummary } from '@/lib/types'
import { MoveRatingIcon } from './MoveRatingIcon'

interface Props {
  summary: AnalysisSummary
  white: string
  black: string
}

function AccuracyPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-secondary/40 px-3 py-2">
      <span className="text-xl font-bold tabular-nums text-foreground">
        {value}
      </span>
      <span className="max-w-[110px] truncate text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function GameSummary({ summary, white, black }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <AccuracyPill label={white} value={summary.accuracyWhite} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Accuracy
        </span>
        <AccuracyPill label={black} value={summary.accuracyBlack} />
      </div>

      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="col-start-3 text-center text-xs font-medium text-muted-foreground">
          W
        </span>
        <span className="text-center text-xs font-medium text-muted-foreground">
          B
        </span>
        {RATING_ORDER.map((r) => {
          const meta = RATING_META[r]
          return (
            <Row
              key={r}
              rating={r}
              label={meta.label}
              symbol={meta.symbol}
              color={meta.colorVar}
              w={summary.white[r]}
              b={summary.black[r]}
            />
          )
        })}
      </div>
    </div>
  )
}

function Row({
  rating,
  label,
  symbol,
  color,
  w,
  b,
}: {
  rating: (typeof RATING_ORDER)[number]
  label: string
  symbol: string
  color: string
  w: number
  b: number
}) {
  return (
    <>
      <MoveRatingIcon rating={rating} size={16} withTooltip={false} />
      <span className="flex items-center gap-1.5">
        {symbol !== label && (
          <span className="font-medium" style={{ color }}>
            {symbol}
          </span>
        )}
        <span className="text-muted-foreground">{label}</span>
      </span>
      <span className="text-center font-semibold tabular-nums">{w}</span>
      <span className="text-center font-semibold tabular-nums">{b}</span>
    </>
  )
}
