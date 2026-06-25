import { useCallback, useEffect, useRef, useState } from 'react'
import type { EvalResult } from '@/lib/types'

const ENGINE_URL = '/engine/stockfish-18-lite-single.js'

// Cap each position's search by time so sharp/tactical positions can't blow up
// the analysis (a deep search on a forced-mate position can take 30s+).
const MOVETIME = 900
const SAFETY_MS = 5000 // hard fallback so a position can never hang forever

interface PendingEval {
  fen: string
  depth: number
  resolve: (r: EvalResult) => void
}

interface Acc {
  cp: number | null
  mate: number | null
  depth: number
  best: string | null
}

/** Parse a UCI "info" line (side-to-move POV) into score, depth and best move. */
function parseInfo(line: string): Acc | null {
  if (!line.startsWith('info') || !line.includes('score')) return null
  const parts = line.split(/\s+/)
  let cp: number | null = null
  let mate: number | null = null
  let depth = 0
  let best: string | null = null
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'depth') depth = Number(parts[i + 1]) || depth
    if (parts[i] === 'score') {
      if (parts[i + 1] === 'cp') cp = Number(parts[i + 2])
      else if (parts[i + 1] === 'mate') mate = Number(parts[i + 2])
    }
    if (parts[i] === 'pv') best = parts[i + 1] || best
  }
  return { cp, mate, depth, best }
}

/**
 * Loads Stockfish (lite, single-threaded WASM) in a Web Worker and exposes a
 * sequential `evaluate(fen, depth)` that resolves to a White-POV evaluation.
 */
export function useStockfish() {
  const queueRef = useRef<PendingEval[]>([])
  const activeRef = useRef<PendingEval | null>(null)
  const accRef = useRef<Acc>({ cp: null, mate: null, depth: 0, best: null })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readyRef = useRef(false)
  const pumpRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const worker = new Worker(ENGINE_URL)
    const send = (cmd: string) => worker.postMessage(cmd)

    // Resolve the active job with whatever the engine has found so far.
    const finish = () => {
      const job = activeRef.current
      if (!job) return
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      activeRef.current = null
      const blackToMove = job.fen.split(/\s+/)[1] === 'b'
      const sign = blackToMove ? -1 : 1
      const a = accRef.current
      job.resolve({
        cp: a.cp != null ? a.cp * sign : null,
        mate: a.mate != null ? a.mate * sign : null,
        bestMoveUci: a.best,
        depth: a.depth,
      })
      pump()
    }

    const pump = () => {
      if (activeRef.current || !readyRef.current) return
      const job = queueRef.current.shift()
      if (!job) return
      activeRef.current = job
      accRef.current = { cp: null, mate: null, depth: 0, best: null }
      send('position fen ' + job.fen)
      send('go depth ' + job.depth + ' movetime ' + MOVETIME)
      timerRef.current = setTimeout(finish, MOVETIME + SAFETY_MS)
    }
    pumpRef.current = pump

    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : ''
      if (!line) return

      if (line === 'uciok') {
        send('setoption name UCI_AnalyseMode value true')
        send('isready')
        return
      }
      if (line === 'readyok') {
        if (!readyRef.current) {
          readyRef.current = true
          setReady(true)
          pump()
        }
        return
      }

      const info = parseInfo(line)
      if (info) {
        if (info.depth >= accRef.current.depth) {
          accRef.current.depth = info.depth
          accRef.current.cp = info.cp
          accRef.current.mate = info.mate
          if (info.best) accRef.current.best = info.best
        }
        return
      }

      if (line.startsWith('bestmove')) {
        const best = line.split(/\s+/)[1]
        if (best && best !== '(none)') accRef.current.best = best
        finish()
      }
    }

    send('uci')

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      worker.terminate()
      readyRef.current = false
    }
  }, [])

  const evaluate = useCallback(
    (fen: string, depth = 15) =>
      new Promise<EvalResult>((resolve) => {
        queueRef.current.push({ fen, depth, resolve })
        pumpRef.current()
      }),
    [],
  )

  return { ready, evaluate }
}
