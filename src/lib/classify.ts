import { Chess } from 'chess.js'
import { PIECE_VALUE } from './chess'
import type {
  AnalysisSummary,
  AnalyzedMove,
  EvalResult,
  Ply,
  Rating,
  RatingMeta,
} from './types'

export const MATE_CP = 2000

/** Collapse an engine eval (White POV) to a single centipawn scalar. */
export function toWhiteCp(ev: EvalResult): number {
  if (ev.mate != null) {
    if (ev.mate === 0) return ev.cp != null && ev.cp < 0 ? -MATE_CP : MATE_CP
    return ev.mate > 0 ? MATE_CP : -MATE_CP
  }
  return ev.cp ?? 0
}

/** Centipawns from the perspective of the side that just moved. */
function toMoverCp(ev: EvalResult, color: 'w' | 'b'): number {
  const white = toWhiteCp(ev)
  return color === 'w' ? white : -white
}

/** Win probability (0..1) for the side to move, given its centipawn score. */
export function winProb(cp: number): number {
  const c = Math.max(-MATE_CP, Math.min(MATE_CP, cp))
  return 1 / (1 + Math.pow(10, -c / 400))
}

/**
 * Static Exchange Evaluation on a single square: the net material the side to
 * move can win by initiating captures on `target`. Used to detect sacrifices.
 */
function staticExchange(fen: string, target: string): number {
  const chess = new Chess(fen)
  const captures = chess
    .moves({ verbose: true })
    .filter((m) => m.to === target && m.captured)
  if (captures.length === 0) return 0
  captures.sort((a, b) => PIECE_VALUE[a.piece] - PIECE_VALUE[b.piece])
  const m = captures[0]
  const gained = PIECE_VALUE[m.captured as string]
  chess.move({ from: m.from, to: m.to, promotion: m.promotion })
  return Math.max(0, gained - Math.max(0, staticExchange(chess.fen(), target)))
}

const SAC_MIN_MATERIAL = 180 // must give up ~a minor piece, net

/**
 * True only when the move gives up real material *on balance*. We compare what
 * the opponent can win back on the destination square against what the move
 * actually invested, so the following are NOT sacrifices:
 *   - an even trade (NxN recaptured by a pawn) — it's just a capture
 *   - a winning capture (RxQ losing only the rook) — it wins material
 *   - a promotion whose new queen gets taken (f1=Q, Qxf1) — you only spent a
 *     pawn, not a queen, so it's at most a pawn sacrifice
 * This avoids false "brilliant" labels on captures and promotions.
 */
function isSacrifice(ply: Ply): boolean {
  const movedValue = PIECE_VALUE[movedPieceType(ply)] ?? 0
  if (movedValue < 280) return false // only sacrifice a minor piece or more
  const capturedValue = ply.captured ? PIECE_VALUE[ply.captured] ?? 0 : 0
  // A promotion turns a pawn into a bigger piece — that's a material *gain*,
  // not part of the sacrifice. Count only the pawn that was actually invested.
  const promotionGain =
    ply.uci.length > 4 ? movedValue - PIECE_VALUE.p : 0
  const opponentWins = staticExchange(ply.fenAfter, ply.to)
  // Net material the mover is down once the offered piece is taken.
  return opponentWins - capturedValue - promotionGain >= SAC_MIN_MATERIAL
}

function movedPieceType(ply: Ply): string {
  // Read the piece sitting on the destination square after the move.
  const chess = new Chess(ply.fenAfter)
  const piece = chess.get(ply.to as Parameters<typeof chess.get>[0])
  return piece ? piece.type : 'p'
}

export interface Classification {
  rating: Rating
  cpLoss: number
  isBest: boolean
}

/**
 * Grade a single move by comparing the best line available before the move
 * (evalBefore) against the position it produced (evalAfter).
 */
export function classifyMove(
  ply: Ply,
  evalBefore: EvalResult,
  evalAfter: EvalResult,
): Classification {
  const bestUci = evalBefore.bestMoveUci
  const isBest =
    !!bestUci && (bestUci === ply.uci || bestUci === ply.uci.slice(0, 4))

  // Mover-POV centipawns: how good things are before vs. after the move.
  const beforeCp = toMoverCp(evalBefore, ply.color)
  const afterCp = toMoverCp(evalAfter, ply.color)
  const cpLoss = Math.max(0, Math.round(beforeCp - afterCp))

  // Win-probability loss dampens grading when already winning/losing.
  const wpLoss = Math.max(0, winProb(beforeCp) - winProb(afterCp))

  // Brilliant: a best (or near-best) sacrifice that keeps the position sound.
  const nearBest = isBest || cpLoss <= 20
  if (nearBest && afterCp >= -60 && isSacrifice(ply)) {
    return { rating: 'brilliant', cpLoss, isBest }
  }

  if (isBest || wpLoss <= 0.01) return { rating: 'best', cpLoss, isBest }
  if (wpLoss <= 0.03) return { rating: 'good', cpLoss, isBest }
  if (wpLoss <= 0.06) return { rating: 'ok', cpLoss, isBest }
  if (wpLoss <= 0.11) return { rating: 'inaccuracy', cpLoss, isBest }
  if (wpLoss <= 0.18) return { rating: 'mistake', cpLoss, isBest }

  // A move that keeps you clearly winning isn't a blunder — at worst it just
  // missed a faster win (common at shallow depth). Cap it at "mistake".
  if (afterCp >= 150) return { rating: 'mistake', cpLoss, isBest }
  return { rating: 'blunder', cpLoss, isBest }
}

/** Per-move accuracy (0..100), Lichess-style, from win-probability loss. */
function moveAccuracy(wpLoss: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * (wpLoss * 100)) - 3.1669
  return Math.max(0, Math.min(100, acc))
}

const emptyTally = (): Record<Rating, number> => ({
  brilliant: 0,
  best: 0,
  book: 0,
  good: 0,
  ok: 0,
  inaccuracy: 0,
  mistake: 0,
  blunder: 0,
})

/** Build the game summary: rating tallies, eval line, and accuracy per side. */
export function buildSummary(moves: AnalyzedMove[]): AnalysisSummary {
  const white = emptyTally()
  const black = emptyTally()
  const evalLine: number[] = [0]
  const accW: number[] = []
  const accB: number[] = []

  for (const m of moves) {
    const tally = m.color === 'w' ? white : black
    tally[m.rating] += 1
    evalLine.push(toWhiteCp(m.evalAfter))

    const beforeCp = toMoverCp(m.evalBefore, m.color)
    const afterCp = toMoverCp(m.evalAfter, m.color)
    const wpLoss = Math.max(0, winProb(beforeCp) - winProb(afterCp))
    ;(m.color === 'w' ? accW : accB).push(moveAccuracy(wpLoss))
  }

  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 100

  return {
    white,
    black,
    evalLine,
    accuracyWhite: avg(accW),
    accuracyBlack: avg(accB),
  }
}

export const RATING_META: Record<Rating, RatingMeta> = {
  brilliant: {
    key: 'brilliant',
    symbol: '!!',
    label: 'Brilliant',
    description: 'A stunning move — the best move, and a sound sacrifice.',
    colorVar: 'var(--rating-brilliant)',
  },
  best: {
    key: 'best',
    symbol: '★',
    label: 'Best',
    description: "The engine's top choice in this position.",
    colorVar: 'var(--rating-best)',
  },
  book: {
    key: 'book',
    symbol: 'Book',
    label: 'Book',
    description: 'A well-known opening move from theory.',
    colorVar: 'var(--rating-book)',
  },
  good: {
    key: 'good',
    symbol: '!',
    label: 'Good',
    description: 'A strong move that keeps your advantage.',
    colorVar: 'var(--rating-good)',
  },
  ok: {
    key: 'ok',
    symbol: 'Ok',
    label: 'Ok',
    description: 'A reasonable move with only a small concession.',
    colorVar: 'var(--rating-ok)',
  },
  inaccuracy: {
    key: 'inaccuracy',
    symbol: '!?',
    label: 'Inaccuracy',
    description: 'A slightly imprecise move — there was something better.',
    colorVar: 'var(--rating-inaccuracy)',
  },
  mistake: {
    key: 'mistake',
    symbol: '?',
    label: 'Mistake',
    description: 'A mistake that lets your position slip.',
    colorVar: 'var(--rating-mistake)',
  },
  blunder: {
    key: 'blunder',
    symbol: '??',
    label: 'Blunder',
    description: 'A serious mistake that badly hurts your position.',
    colorVar: 'var(--rating-blunder)',
  },
}

export const RATING_ORDER: Rating[] = [
  'brilliant',
  'best',
  'good',
  'ok',
  'inaccuracy',
  'mistake',
  'blunder',
  'book',
]
