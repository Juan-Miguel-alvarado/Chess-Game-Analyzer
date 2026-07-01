import { Fragment, useEffect, useRef } from 'react'
import { IconArrowGuide, IconLoader2 } from '@tabler/icons-react'
import { RATING_META } from '@/lib/classify'
import type { AnalyzedMove } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MoveRatingIcon } from './MoveRatingIcon'

export interface Variation {
  startPly: number
  moves: AnalyzedMove[]
}

interface Props {
  mainMoves: AnalyzedMove[]
  variation: Variation | null
  activeIndex: number // pos.ply
  activeIsVar: boolean
  onSelectMain: (plyIndex: number) => void
  onSelectVar: (plyIndex: number) => void
}

function MoveCell({
  move,
  active,
  onSelect,
}: {
  move?: AnalyzedMove
  active: boolean
  onSelect: (i: number) => void
}) {
  if (!move) return <div className="flex-1" />
  const meta = RATING_META[move.rating]
  return (
    <button
      onClick={() => onSelect(move.index)}
      className={cn(
        'flex flex-1 items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors',
        active ? 'bg-secondary text-foreground' : 'hover:bg-secondary/50',
      )}
    >
      {move.pending ? (
        <IconLoader2 size={15} className="animate-spin text-muted-foreground" />
      ) : (
        <MoveRatingIcon rating={move.rating} size={15} withTooltip={false} />
      )}
      <span className="font-medium tabular-nums">{move.san}</span>
      {!move.pending && (
        <span
          className="ml-auto text-xs font-semibold"
          style={{ color: meta.colorVar }}
        >
          {meta.symbol}
        </span>
      )}
    </button>
  )
}

/** Compact inline token for a move inside the secondary variation. */
function VarToken({
  move,
  active,
  onSelect,
}: {
  move: AnalyzedMove
  active: boolean
  onSelect: (i: number) => void
}) {
  const showNumber = move.color === 'w'
  return (
    <button
      onClick={() => onSelect(move.index)}
      className={cn(
        'flex items-center gap-1 rounded px-1.5 py-0.5 text-sm transition-colors',
        active ? 'bg-secondary text-foreground' : 'hover:bg-secondary/50',
      )}
    >
      {showNumber && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {move.moveNumber}.
        </span>
      )}
      {move.pending ? (
        <IconLoader2 size={13} className="animate-spin text-muted-foreground" />
      ) : (
        <MoveRatingIcon rating={move.rating} size={13} withTooltip={false} />
      )}
      <span className="font-medium tabular-nums">{move.san}</span>
    </button>
  )
}

export function MoveList({
  mainMoves,
  variation,
  activeIndex,
  activeIsVar,
  onSelectMain,
  onSelectVar,
}: Props) {
  const rows: { no: number; white?: AnalyzedMove; black?: AnalyzedMove }[] = []
  for (const m of mainMoves) {
    if (m.color === 'w') rows.push({ no: m.moveNumber, white: m })
    else {
      const last = rows[rows.length - 1]
      if (last && !last.black && last.no === m.moveNumber) last.black = m
      else rows.push({ no: m.moveNumber, black: m })
    }
  }

  const activeRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = activeRef.current
    if (!el) return
    // Scroll ONLY the move-list container into view — never the page/window, so
    // the board stays put while stepping through moves.
    const container = el.closest<HTMLElement>('[data-scroll-container]')
    if (!container) return
    const c = container.getBoundingClientRect()
    const e = el.getBoundingClientRect()
    const pad = 8
    if (e.top < c.top + pad) container.scrollTop -= c.top + pad - e.top
    else if (e.bottom > c.bottom - pad)
      container.scrollTop += e.bottom - (c.bottom - pad)
  }, [activeIndex, activeIsVar])

  const sp = variation?.startPly ?? null
  const rowHasBranch = (r: (typeof rows)[number]) =>
    sp != null && (r.white?.index === sp || r.black?.index === sp)

  const VarBlock = () =>
    variation ? (
      <div
        ref={activeIsVar ? activeRef : undefined}
        className="my-1 ml-7 flex flex-wrap items-center gap-x-1 gap-y-0.5 border-l-2 pl-2"
        style={{ borderColor: 'color-mix(in srgb, var(--primary) 60%, transparent)' }}
      >
        <span className="flex items-center gap-1 pr-1 text-xs text-muted-foreground">
          <IconArrowGuide size={13} /> Your line
        </span>
        {variation.moves.map((m) => (
          <VarToken
            key={m.uid ?? m.index}
            move={m}
            active={activeIsVar && m.index === activeIndex}
            onSelect={onSelectVar}
          />
        ))}
      </div>
    ) : null

  return (
    <div className="pr-1">
      <div className="flex flex-col gap-0.5">
        {sp === -1 && <VarBlock />}
        {rows.map((row) => {
          const isActiveRow =
            !activeIsVar &&
            (row.white?.index === activeIndex || row.black?.index === activeIndex)
          return (
            <Fragment key={row.no}>
              <div
                ref={isActiveRow ? activeRef : undefined}
                className="flex items-center gap-1"
              >
                <span className="w-7 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                  {row.no}.
                </span>
                <MoveCell
                  move={row.white}
                  active={!activeIsVar && row.white?.index === activeIndex}
                  onSelect={onSelectMain}
                />
                <MoveCell
                  move={row.black}
                  active={!activeIsVar && row.black?.index === activeIndex}
                  onSelect={onSelectMain}
                />
              </div>
              {rowHasBranch(row) && <VarBlock />}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
