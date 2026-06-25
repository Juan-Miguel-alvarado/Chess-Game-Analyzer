import { useMemo, useState } from 'react'
import { RATING_META, winProb } from '@/lib/classify'
import type { AnalyzedMove, Rating } from '@/lib/types'

const MARKED: Rating[] = ['brilliant', 'blunder', 'mistake', 'inaccuracy']

interface Props {
  evalLine: number[] // White-POV centipawns, index 0 = start
  moves: AnalyzedMove[]
  currentPly: number // -1 = start
  onSelect: (plyIndex: number) => void
}

const W = 100
const H = 40

function evalLabel(cp: number): string {
  const sign = cp > 0 ? '+' : cp < 0 ? '−' : ''
  return `${sign}${(Math.abs(cp) / 100).toFixed(1)}`
}

/** Area chart of the evaluation across the game, with a hover scrubber. */
export function EvalGraph({ evalLine, moves, currentPly, onSelect }: Props) {
  const [hover, setHover] = useState<number | null>(null) // hovered point index
  const n = evalLine.length

  const { line, area } = useMemo(() => {
    const xs = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W)
    const ys = (cp: number) => H - winProb(cp) * H
    const pts = evalLine.map((cp, i) => ({ x: xs(i), y: ys(cp) }))
    const linePath = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
    return { line: linePath, area: `${linePath} L${W},${H} L0,${H} Z` }
  }, [evalLine, n])

  const pct = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100)
  const activeX = pct(currentPly + 1)

  const markers = useMemo(
    () =>
      moves
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => MARKED.includes(m.rating)),
    [moves],
  )

  const onMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (n - 1)))
  }

  // The hovered point (index k) is the position *after* ply k-1.
  const hoverPly = hover != null ? hover - 1 : null
  const hoverMove = hoverPly != null && hoverPly >= 0 ? moves[hoverPly] : null
  const hoverCp = hover != null ? evalLine[hover] : 0

  return (
    <div
      className="relative h-full w-full cursor-pointer"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onClick={() => {
        if (hover != null) onSelect(Math.max(-1, Math.min(n - 2, hover - 1)))
      }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeWidth="0.4" />
        <path d={area} fill="color-mix(in srgb, var(--ash-grey-3) 18%, transparent)" />
        <path
          d={line}
          fill="none"
          stroke="var(--ash-grey-3)"
          strokeWidth="0.9"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={activeX}
          y1="0"
          x2={activeX}
          y2={H}
          stroke="var(--primary)"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Rating markers (brilliants, blunders, mistakes, inaccuracies) */}
      {markers.map(({ m, i }) => {
        const big = m.rating === 'brilliant' || m.rating === 'blunder'
        const s = big ? 9 : 7
        return (
          <div
            key={m.uid ?? i}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#16181d]/60 shadow-sm"
            style={{
              left: `${pct(i + 1)}%`,
              top: `${(1 - winProb(evalLine[i + 1] ?? 0)) * 100}%`,
              width: s,
              height: s,
              backgroundColor: RATING_META[m.rating].colorVar,
            }}
          />
        )
      })}

      {/* Hover scrubber */}
      {hover != null && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-foreground/60"
            style={{ left: `${pct(hover)}%` }}
          />
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] shadow-md"
            style={{
              left: `clamp(34px, ${pct(hover)}%, calc(100% - 34px))`,
            }}
          >
            {hoverMove ? (
              <span className="font-medium">
                {hoverMove.moveNumber}
                {hoverMove.color === 'w' ? '.' : '…'} {hoverMove.san}
                <span
                  className="ml-1 font-semibold"
                  style={{ color: RATING_META[hoverMove.rating].colorVar }}
                >
                  {RATING_META[hoverMove.rating].symbol}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">Start</span>
            )}
            <span className="ml-1.5 tabular-nums text-muted-foreground">
              {evalLabel(hoverCp)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
