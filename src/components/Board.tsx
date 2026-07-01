import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard, type Arrow } from 'react-chessboard'
import { IconLoader2 } from '@tabler/icons-react'
import { RATING_META } from '@/lib/classify'
import type { AnalyzedMove } from '@/lib/types'
import { RATING_ICONS } from './MoveRatingIcon'

interface Props {
  fen: string
  orientation: 'white' | 'black'
  /** The move that produced this position (for last-move highlight + rating). */
  currentMove: AnalyzedMove | null
  /** Show an arrow for the engine's best move from the previous position. */
  bestArrow: { from: string; to: string } | null
  /** Board edge size in pixels (square = size / 8). */
  size: number
  /** Allow the user to drag pieces to explore lines. */
  interactive: boolean
  /** Called when a legal move is dropped; return true to accept it. */
  onMove: (from: string, to: string) => boolean
}

const FILES = 'abcdefgh'

/** Pixel offset of a square's top-left corner within the board. */
function squareXY(square: string, orientation: 'white' | 'black', sq: number) {
  const file = FILES.indexOf(square[0])
  const rank = Number(square[1])
  const col = orientation === 'white' ? file : 7 - file
  const row = orientation === 'white' ? 8 - rank : rank - 1
  return { x: col * sq, y: row * sq }
}

/** chess.com-style rating badge that sits on the move's destination square. */
function RatingBadge({
  move,
  orientation,
  size,
}: {
  move: AnalyzedMove
  orientation: 'white' | 'black'
  size: number
}) {
  const sq = size / 8
  const badge = Math.max(16, Math.min(30, sq * 0.46))
  const { x, y } = squareXY(move.to, orientation, sq)
  const left = x + sq - badge * 0.55
  const top = y - badge * 0.45
  const meta = RATING_META[move.rating]
  const Glyph = RATING_ICONS[move.rating]
  const notable =
    !move.pending &&
    (move.rating === 'brilliant' || move.rating === 'blunder')

  return (
    <div
      className="animate-badge-pop pointer-events-none absolute z-10"
      style={{ left, top, width: badge, height: badge }}
    >
      {notable && (
        <div
          className="animate-glow-pulse absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 ${badge * 0.5}px ${badge * 0.28}px ${meta.colorVar}` }}
        />
      )}
      <div
        className="relative flex h-full w-full items-center justify-center rounded-full shadow-md ring-2 ring-[#16181d]/40"
        style={{
          backgroundColor: move.pending ? 'var(--charcoal)' : meta.colorVar,
        }}
      >
        {move.pending ? (
          <IconLoader2
            size={badge * 0.62}
            className="animate-spin text-white"
            stroke={2.5}
          />
        ) : (
          <Glyph size={badge * 0.66} stroke={2.5} className="text-[#16181d]" />
        )}
      </div>
    </div>
  )
}

export function Board({
  fen,
  orientation,
  currentMove,
  bestArrow,
  size,
  interactive,
  onMove,
}: Props) {
  // Click-to-move: first click selects a piece, second click plays the move.
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => setSelected(null), [fen])

  const legalTargets = useMemo<string[]>(() => {
    if (!selected || !interactive) return []
    try {
      return new Chess(fen)
        .moves({ square: selected as never, verbose: true })
        .map((m) => m.to)
    } catch {
      return []
    }
  }, [selected, fen, interactive])

  const handleSquareClick = (square: string, piece: unknown) => {
    if (!interactive) return
    if (selected && legalTargets.includes(square)) {
      const ok = onMove(selected, square)
      setSelected(null)
      if (ok) return
    }
    // (Re)select only a square that holds a piece of the side to move.
    try {
      const chess = new Chess(fen)
      const p = chess.get(square as never)
      if (p && p.color === chess.turn()) setSelected(square)
      else setSelected(null)
    } catch {
      setSelected(piece ? square : null)
    }
  }

  const arrows = useMemo<Arrow[]>(() => {
    if (!bestArrow) return []
    return [
      {
        startSquare: bestArrow.from,
        endSquare: bestArrow.to,
        color: 'var(--rating-best)',
      },
    ]
  }, [bestArrow])

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {}
    const highlight = (color: string): React.CSSProperties => ({
      background: `color-mix(in srgb, ${color} 38%, transparent)`,
    })
    if (currentMove) {
      styles[currentMove.from] = highlight('var(--cool-steel)')
      styles[currentMove.to] = highlight(RATING_META[currentMove.rating].colorVar)
    }
    if (selected) {
      styles[selected] = highlight('var(--rating-best)')
      for (const t of legalTargets) {
        styles[t] = {
          background:
            'radial-gradient(circle, color-mix(in srgb, var(--rating-best) 70%, transparent) 22%, transparent 24%)',
        }
      }
    }
    return styles
  }, [currentMove, selected, legalTargets])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 overflow-hidden rounded-xl border border-border shadow-lg">
        <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          arrows,
          squareStyles,
          allowDragging: interactive,
          showAnimations: true,
          animationDurationInMs: 160,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare ? onMove(sourceSquare, targetSquare) : false,
          onSquareClick: ({ square, piece }) => handleSquareClick(square, piece),
          darkSquareStyle: { backgroundColor: '#50505d' },
          lightSquareStyle: { backgroundColor: '#99a69e' },
          darkSquareNotationStyle: { color: '#b8bdae' },
          lightSquareNotationStyle: { color: '#363946' },
          boardStyle: { borderRadius: '0' },
          arrowOptions: {
            color: 'var(--rating-best)',
            secondaryColor: 'var(--rating-interesting)',
            tertiaryColor: 'var(--rating-brilliant)',
            opacity: 0.85,
            activeOpacity: 0.5,
            arrowLengthReducerDenominator: 8,
            sameTargetArrowLengthReducerDenominator: 4,
            arrowWidthDenominator: 5,
            activeArrowWidthMultiplier: 1.2,
            arrowStartOffset: 0.45,
          },
        }}
        />
      </div>
      {currentMove && (
        <RatingBadge
          key={`${currentMove.index}-${currentMove.rating}-${currentMove.pending ? 'p' : 'd'}`}
          move={currentMove}
          orientation={orientation}
          size={size}
        />
      )}
    </div>
  )
}
