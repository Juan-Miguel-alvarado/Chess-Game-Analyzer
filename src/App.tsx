import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import {
  IconArrowBackUp,
  IconArrowLeft,
  IconChessFilled,
  IconLoader2,
  IconPointer,
  IconRotateClockwise,
} from '@tabler/icons-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Board } from '@/components/Board'
import { EvalBar } from '@/components/EvalBar'
import { MoveList, type Variation } from '@/components/MoveList'
import { EvalGraph } from '@/components/EvalGraph'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { GameSummary } from '@/components/GameSummary'
import { PgnInput } from '@/components/PgnInput'
import { useGameAnalysis } from '@/engine/useGameAnalysis'
import { buildSummary, classifyMove } from '@/lib/classify'
import { uciToSan } from '@/lib/chess'
import type { ParsedGame } from '@/lib/chess'
import type { AnalyzedMove, EvalResult } from '@/lib/types'

const DEPTH = 16
const MAX_BOARD = 560
const EMPTY_EVAL: EvalResult = { cp: 0, mate: null, bestMoveUci: null, depth: 0 }

type Pos = { line: 'main' | 'var'; ply: number }

export default function App() {
  const { ready, state, analyze, reset, evaluate } = useGameAnalysis(DEPTH)
  const [game, setGame] = useState<ParsedGame | null>(null)
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  // Board auto-fits its available space (responsive; no manual resize).
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const [boardSize, setBoardSize] = useState(360)

  // The analyzed game (mainline) plus an optional user-played secondary line.
  const [mainMoves, setMainMoves] = useState<AnalyzedMove[]>([])
  const [variation, setVariation] = useState<Variation | null>(null)
  const [pos, setPos] = useState<Pos>({ line: 'main', ply: -1 })
  const uidRef = useRef(0)

  useEffect(() => {
    if (state.status === 'done') {
      setMainMoves(state.moves)
      setVariation(null)
      setPos({ line: 'main', ply: -1 })
    }
  }, [state.status, state.moves])

  const onAnalyze = useCallback(
    (parsed: ParsedGame) => {
      setGame(parsed)
      setMainMoves([])
      setVariation(null)
      setPos({ line: 'main', ply: -1 })
      analyze(parsed.plies)
    },
    [analyze],
  )

  const inVar = !!variation && pos.line === 'var'
  const activeLine = useMemo<AnalyzedMove[]>(
    () =>
      inVar
        ? [...mainMoves.slice(0, variation!.startPly + 1), ...variation!.moves]
        : mainMoves,
    [inVar, mainMoves, variation],
  )

  const ply = pos.ply
  const total = activeLine.length
  const startFen = game?.plies[0]?.fenBefore ?? ''
  const startEval = mainMoves[0]?.evalBefore ?? null

  const goFirst = useCallback(() => setPos((p) => ({ ...p, ply: -1 })), [])
  const goPrev = useCallback(
    () => setPos((p) => ({ ...p, ply: Math.max(-1, p.ply - 1) })),
    [],
  )
  const goNext = useCallback(
    () => setPos((p) => ({ ...p, ply: Math.min(total - 1, p.ply + 1) })),
    [total],
  )
  const goLast = useCallback(
    () => setPos((p) => ({ ...p, ply: total - 1 })),
    [total],
  )

  useEffect(() => {
    if (!game) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowUp') goFirst()
      else if (e.key === 'ArrowDown') goLast()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game, goPrev, goNext, goFirst, goLast])

  const fen = useMemo(() => {
    if (!game) return ''
    return ply >= 0 ? activeLine[ply]?.fenAfter ?? startFen : startFen
  }, [game, ply, activeLine, startFen])

  const currentMove = ply >= 0 ? activeLine[ply] ?? null : null
  const currentEval = currentMove ? currentMove.evalAfter : startEval

  const summary = useMemo(
    () => (mainMoves.length ? buildSummary(mainMoves) : null),
    [mainMoves],
  )

  const activeIsVar = inVar && pos.ply > (variation?.startPly ?? -1)

  const bestArrow = useMemo(() => {
    if (!currentMove || currentMove.pending || currentMove.isBest) return null
    if (!currentMove.bestMoveUci) return null
    if (currentMove.rating === 'brilliant' || currentMove.rating === 'best')
      return null
    const u = currentMove.bestMoveUci
    return { from: u.slice(0, 2), to: u.slice(2, 4) }
  }, [currentMove])

  // Play a user move from the current position as a secondary variation.
  const onMove = useCallback(
    (from: string, to: string) => {
      if (state.status !== 'done' || !game) return false
      const baseFen = ply >= 0 ? activeLine[ply].fenAfter : startFen
      const before = (ply >= 0 ? activeLine[ply].evalAfter : startEval) ?? EMPTY_EVAL

      const chess = new Chess(baseFen)
      let mv
      try {
        mv = chess.move({ from, to, promotion: 'q' })
      } catch {
        return false
      }
      if (!mv) return false

      const fenAfter = chess.fen()
      const idx = ply + 1
      const uid = ++uidRef.current
      const moveNumber = Math.floor(idx / 2) + 1

      // Extend the current variation, or branch a fresh one at this ply.
      let startPly: number
      let baseMoves: AnalyzedMove[]
      if (variation && pos.line === 'var' && ply >= variation.startPly + 1) {
        startPly = variation.startPly
        baseMoves = variation.moves.slice(0, ply - variation.startPly)
      } else {
        startPly = ply
        baseMoves = []
      }

      const placeholder: AnalyzedMove = {
        index: idx,
        moveNumber,
        color: mv.color,
        san: mv.san,
        uci: mv.lan,
        from: mv.from,
        to: mv.to,
        fenBefore: baseFen,
        fenAfter,
        captured: mv.captured,
        rating: 'ok',
        cpLoss: 0,
        evalBefore: before,
        evalAfter: EMPTY_EVAL,
        bestMoveUci: before.bestMoveUci,
        bestMoveSan: null,
        isBest: false,
        pending: true,
        uid,
      }
      setVariation({ startPly, moves: [...baseMoves, placeholder] })
      setPos({ line: 'var', ply: idx })

      evaluate(fenAfter, DEPTH).then((evalAfter) => {
        const plyData = {
          index: idx,
          moveNumber,
          color: mv.color,
          san: mv.san,
          uci: mv.lan,
          from: mv.from,
          to: mv.to,
          fenBefore: baseFen,
          fenAfter,
          captured: mv.captured,
        }
        const { rating, cpLoss, isBest } = classifyMove(plyData, before, evalAfter)
        setVariation((prev) =>
          prev
            ? {
                ...prev,
                moves: prev.moves.map((m) =>
                  m.uid === uid
                    ? {
                        ...m,
                        rating,
                        cpLoss,
                        evalAfter,
                        isBest,
                        bestMoveSan: before.bestMoveUci
                          ? uciToSan(baseFen, before.bestMoveUci)
                          : null,
                        pending: false,
                      }
                    : m,
                ),
              }
            : prev,
        )
      })
      return true
    },
    [state.status, game, ply, activeLine, startFen, startEval, variation, pos.line, evaluate],
  )

  const closeVariation = useCallback(() => {
    const at = variation?.startPly ?? -1
    setVariation(null)
    setPos({ line: 'main', ply: at })
  }, [variation])

  // Auto-fit the board to its available width and the viewport height.
  useEffect(() => {
    if (!game) return
    const el = boardAreaRef.current
    if (!el) return
    const update = () => {
      const width = el.clientWidth
      const height = window.innerHeight * 0.82
      setBoardSize(Math.max(240, Math.min(width, height, MAX_BOARD)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [game])

  const back = () => {
    reset()
    setGame(null)
    setMainMoves([])
    setVariation(null)
    setPos({ line: 'main', ply: -1 })
  }

  if (!game) {
    return (
      <TooltipProvider delayDuration={150}>
        <PgnInput onAnalyze={onAnalyze} engineReady={ready} />
      </TooltipProvider>
    )
  }

  const analyzing = state.status === 'analyzing'

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4">
        <header className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={back}>
              <IconArrowLeft size={20} />
            </Button>
            <div className="flex items-center gap-2">
              <IconChessFilled size={22} className="text-primary" />
              <div className="leading-tight">
                <div className="text-sm font-semibold">
                  {game.white} <span className="text-muted-foreground">vs</span>{' '}
                  {game.black}
                </div>
                <div className="text-xs text-muted-foreground">
                  {game.event || 'Game analysis'} · {game.result}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {variation && (
              <Button variant="secondary" size="sm" onClick={closeVariation}>
                <IconArrowBackUp size={16} />
                Back to game
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setOrientation((o) => (o === 'white' ? 'black' : 'white'))
              }
            >
              <IconRotateClockwise size={16} />
              Flip
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-start">
          {/* Board column — auto-fits its width; stays pinned on desktop */}
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 lg:mx-0 lg:w-[clamp(320px,40vw,540px)] lg:max-w-none lg:shrink-0 lg:sticky lg:top-4 lg:self-start">
            <div className="flex items-stretch gap-2" style={{ height: boardSize }}>
              <EvalBar evaluation={currentEval} orientation={orientation} />
              <div ref={boardAreaRef} className="flex min-w-0 flex-1 justify-center">
                <div
                  className="relative"
                  style={{ width: boardSize, height: boardSize }}
                >
                  <Board
                    fen={fen}
                    orientation={orientation}
                    currentMove={currentMove}
                    bestArrow={bestArrow}
                    size={boardSize}
                    interactive={state.status === 'done'}
                    onMove={onMove}
                  />
                  {analyzing && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-xl bg-black/55 backdrop-blur-[2px]">
                      <IconLoader2 size={28} className="animate-spin text-primary" />
                      <div className="w-2/3">
                        <Progress value={Math.round(state.progress * 100)} />
                      </div>
                      <span className="text-sm font-medium">
                        Analyzing… {Math.round(state.progress * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {state.status === 'done' && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconPointer size={14} />
                Drag or click a piece to play your own line — it's analyzed as a
                variation.
              </div>
            )}

            <div>
              <AnalysisPanel
                move={currentMove}
                ply={ply}
                total={total}
                onFirst={goFirst}
                onPrev={goPrev}
                onNext={goNext}
                onLast={goLast}
              />
            </div>
          </div>

          {/* Right column */}
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            {/* Fixed summary — accuracy + rating breakdown (does not scroll) */}
            {summary && (
              <div className="shrink-0 rounded-xl border border-border bg-card p-4">
                <GameSummary
                  summary={summary}
                  white={game.white}
                  black={game.black}
                  moves={mainMoves}
                  currentPly={pos.line === 'main' ? ply : -1}
                  onJump={(i) => setPos({ line: 'main', ply: i })}
                  activeRating={
                    currentMove && !currentMove.pending ? currentMove.rating : null
                  }
                />
              </div>
            )}

            {/* Scrollable move list */}
            <div
              data-scroll-container
              className="scrollbar-thin max-h-[46vh] min-h-[160px] flex-1 overflow-y-auto rounded-xl border border-border bg-card p-3"
            >
              <MoveList
                mainMoves={mainMoves}
                variation={variation}
                activeIndex={ply}
                activeIsVar={activeIsVar}
                onSelectMain={(i) => setPos({ line: 'main', ply: i })}
                onSelectVar={(i) => setPos({ line: 'var', ply: i })}
              />
            </div>

            {summary && (
              <div className="h-24 shrink-0 rounded-xl border border-border bg-card p-3">
                <EvalGraph
                  evalLine={summary.evalLine}
                  moves={mainMoves}
                  currentPly={pos.line === 'main' ? ply : -1}
                  onSelect={(i) => setPos({ line: 'main', ply: i })}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
