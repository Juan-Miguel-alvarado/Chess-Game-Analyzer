import { useCallback, useState } from 'react'
import { Chess } from 'chess.js'
import { uciToSan } from '@/lib/chess'
import {
  buildSummary,
  classifyMove,
  MATE_CP,
} from '@/lib/classify'
import type {
  AnalysisSummary,
  AnalyzedMove,
  EvalResult,
  Ply,
} from '@/lib/types'
import { useStockfish } from './useStockfish'

export interface AnalysisState {
  status: 'idle' | 'analyzing' | 'done'
  progress: number // 0..1
  moves: AnalyzedMove[]
  summary: AnalysisSummary | null
}

const IDLE: AnalysisState = {
  status: 'idle',
  progress: 0,
  moves: [],
  summary: null,
}

const BOOK_MAX_PLY = 14 // first 7 moves each side can be opening theory

/**
 * Tag the opening prefix as "Book": a contiguous run of sound moves from the
 * start, until either side leaves theory (plays anything below "ok").
 */
function markBookMoves(moves: AnalyzedMove[]): void {
  for (const m of moves) {
    if (m.index >= BOOK_MAX_PLY) break
    if (m.rating === 'best' || m.rating === 'good' || m.rating === 'ok') {
      m.rating = 'book'
    } else {
      break // left the book — stop tagging
    }
  }
}

/** Evaluate a position, short-circuiting terminal ones without the engine. */
async function evalPosition(
  fen: string,
  depth: number,
  evaluate: (fen: string, depth: number) => Promise<EvalResult>,
): Promise<EvalResult> {
  const chess = new Chess(fen)
  if (chess.isCheckmate()) {
    const blackToMove = chess.turn() === 'b'
    return { cp: blackToMove ? MATE_CP : -MATE_CP, mate: null, bestMoveUci: null, depth: 0 }
  }
  if (chess.isStalemate() || chess.isDraw()) {
    return { cp: 0, mate: null, bestMoveUci: null, depth: 0 }
  }
  return evaluate(fen, depth)
}

export function useGameAnalysis(depth = 16) {
  const { ready, evaluate } = useStockfish()
  const [state, setState] = useState<AnalysisState>(IDLE)

  const reset = useCallback(() => setState(IDLE), [])

  const analyze = useCallback(
    async (plies: Ply[]) => {
      if (plies.length === 0) return
      setState({ status: 'analyzing', progress: 0, moves: [], summary: null })

      // Positions after 0..n moves: index 0 = start, index k = after move k.
      const fens = [plies[0].fenBefore, ...plies.map((p) => p.fenAfter)]
      const evals: EvalResult[] = []
      for (let j = 0; j < fens.length; j++) {
        evals.push(await evalPosition(fens[j], depth, evaluate))
        setState((s) => ({ ...s, progress: (j + 1) / fens.length }))
      }

      const moves: AnalyzedMove[] = plies.map((ply, i) => {
        const evalBefore = evals[i]
        const evalAfter = evals[i + 1]
        const { rating, cpLoss, isBest } = classifyMove(ply, evalBefore, evalAfter)
        const bestMoveUci = evalBefore.bestMoveUci
        return {
          ...ply,
          rating,
          cpLoss,
          evalBefore,
          evalAfter,
          bestMoveUci,
          bestMoveSan: bestMoveUci ? uciToSan(ply.fenBefore, bestMoveUci) : null,
          isBest,
        }
      })

      markBookMoves(moves)

      setState({
        status: 'done',
        progress: 1,
        moves,
        summary: buildSummary(moves),
      })
    },
    [depth, evaluate],
  )

  return { ready, state, analyze, reset, evaluate }
}
