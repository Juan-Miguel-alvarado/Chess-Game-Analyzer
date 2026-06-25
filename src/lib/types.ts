export type Rating =
  | 'brilliant' // !!
  | 'best' // ★
  | 'book' // 📖 opening theory
  | 'good' // !
  | 'ok' // Ok (like)
  | 'inaccuracy' // !?
  | 'mistake' // ?
  | 'blunder' // ??

export interface RatingMeta {
  key: Rating
  symbol: string
  label: string
  description: string
  colorVar: string // CSS color value
}

/** A single half-move parsed from the PGN, before analysis. */
export interface Ply {
  index: number // 0-based ply index
  moveNumber: number // full-move number (1, 1, 2, 2, ...)
  color: 'w' | 'b'
  san: string // e.g. "Nf3"
  uci: string // e.g. "g1f3"
  from: string
  to: string
  fenBefore: string // position before the move was played
  fenAfter: string // position after the move was played
  captured?: string // piece captured by this move, if any
}

/** Engine evaluation of a position, normalized to White's perspective. */
export interface EvalResult {
  cp: number | null // centipawns (White POV); null when mate is set
  mate: number | null // moves-to-mate (White POV); positive = White mates
  bestMoveUci: string | null
  depth: number
}

/** A ply enriched with engine analysis and a rating. */
export interface AnalyzedMove extends Ply {
  rating: Rating
  cpLoss: number // centipawn loss vs. the engine's best move (mover POV)
  evalBefore: EvalResult // eval of fenBefore (best line for the mover)
  evalAfter: EvalResult // eval of fenAfter
  bestMoveUci: string | null // engine's recommended move from fenBefore
  bestMoveSan: string | null // same, in SAN
  isBest: boolean // the played move matched the engine's choice
  pending?: boolean // a user-played move still being evaluated
  uid?: number // stable id for user-played moves
}

export interface AnalysisSummary {
  white: Record<Rating, number>
  black: Record<Rating, number>
  /** Eval after each ply (White POV centipawns), plus the start (index 0). */
  evalLine: number[]
  accuracyWhite: number
  accuracyBlack: number
}
