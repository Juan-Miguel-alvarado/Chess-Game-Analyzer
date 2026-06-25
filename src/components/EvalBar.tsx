import { toWhiteCp, winProb } from '@/lib/classify'
import type { EvalResult } from '@/lib/types'

interface Props {
  evaluation: EvalResult | null
  orientation: 'white' | 'black'
}

function formatEval(ev: EvalResult): string {
  if (ev.mate != null) return `M${Math.abs(ev.mate)}`
  return (Math.abs(toWhiteCp(ev)) / 100).toFixed(1)
}

/** Vertical bar: white's share grows from the bottom (or top when flipped). */
export function EvalBar({ evaluation, orientation }: Props) {
  const cp = evaluation ? toWhiteCp(evaluation) : 0
  const whiteShare = winProb(cp) * 100
  const whiteOnBottom = orientation === 'white'
  const label = evaluation ? formatEval(evaluation) : '0.0'
  const whiteIsBetter = cp >= 0

  const fillStyle: React.CSSProperties = { height: `${whiteShare}%` }
  if (whiteOnBottom) fillStyle.bottom = 0
  else fillStyle.top = 0

  // Place the number on the side of whichever player is currently ahead.
  const labelStyle: React.CSSProperties = {
    color: whiteIsBetter ? '#16181d' : '#e9ebe3',
  }
  if (whiteIsBetter === whiteOnBottom) labelStyle.bottom = 4
  else labelStyle.top = 4

  return (
    <div className="relative h-full w-7 shrink-0 overflow-hidden rounded-md border border-border bg-[#16181d]">
      <div
        className="absolute inset-x-0 bg-[#e9ebe3] transition-[height] duration-300 ease-out"
        style={fillStyle}
      />
      <span
        className="absolute inset-x-0 text-center text-[10px] font-semibold tabular-nums"
        style={labelStyle}
      >
        {label}
      </span>
    </div>
  )
}
