import { Chess } from 'chess.js'
import type { Ply } from './types'

export interface ParsedGame {
  plies: Ply[]
  headers: Record<string, string>
  white: string
  black: string
  result: string
  event: string
}

export class PgnError extends Error {}

/** Parse a PGN string into a list of half-moves with FEN before/after each. */
export function parsePgn(pgn: string): ParsedGame {
  const trimmed = pgn.trim()
  if (!trimmed) throw new PgnError('Paste a PGN to analyze.')

  const chess = new Chess()
  try {
    chess.loadPgn(trimmed)
  } catch {
    throw new PgnError(
      "Couldn't read this PGN. Make sure it's a valid game export.",
    )
  }

  const verbose = chess.history({ verbose: true })
  if (verbose.length === 0) {
    throw new PgnError('This PGN has no moves to analyze.')
  }

  const plies: Ply[] = verbose.map((m, index) => ({
    index,
    moveNumber: Math.floor(index / 2) + 1,
    color: m.color,
    san: m.san,
    uci: m.lan,
    from: m.from,
    to: m.to,
    fenBefore: m.before,
    fenAfter: m.after,
    captured: m.captured,
  }))

  const headers = (chess.getHeaders?.() ?? {}) as Record<string, string>

  return {
    plies,
    headers,
    white: headers.White || 'White',
    black: headers.Black || 'Black',
    result: headers.Result || '*',
    event: headers.Event || '',
  }
}

/** Convert a UCI move (e.g. "e2e4", "e7e8q") to SAN in the given position. */
export function uciToSan(fen: string, uci: string): string | null {
  if (!uci || uci.length < 4) return null
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
    })
    return move ? move.san : null
  } catch {
    return null
  }
}

/** Standard centipawn piece values for material/sacrifice detection. */
export const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 300,
  b: 320,
  r: 500,
  q: 900,
  k: 0,
}
