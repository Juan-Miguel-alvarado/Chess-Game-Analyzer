import { useState } from 'react'
import {
  IconAlertTriangle,
  IconChessFilled,
  IconClipboardText,
  IconUser,
  IconWand,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { GameImport } from '@/components/GameImport'
import { parsePgn, PgnError } from '@/lib/chess'
import { SAMPLE_PGN } from '@/lib/sample'
import type { ParsedGame } from '@/lib/chess'
import { cn } from '@/lib/utils'

interface Props {
  onAnalyze: (game: ParsedGame, pgn: string) => void
  engineReady: boolean
}

type Tab = 'import' | 'paste'

export function PgnInput({ onAnalyze, engineReady }: Props) {
  const [tab, setTab] = useState<Tab>('import')
  const [pgn, setPgn] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (raw: string) => {
    setError(null)
    try {
      const game = parsePgn(raw)
      onAnalyze(game, raw)
    } catch (e) {
      setError(
        e instanceof PgnError
          ? e.message
          : "Couldn't analyze this game — it may use an unsupported variant.",
      )
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <IconChessFilled size={30} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Chess Game Analyzer</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Import your games from Chess.com or Lichess, or paste a PGN — and get
          every move graded by Stockfish.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg bg-background/50 p-1">
          <TabButton
            active={tab === 'import'}
            onClick={() => setTab('import')}
            icon={<IconUser size={16} />}
            label="Import games"
          />
          <TabButton
            active={tab === 'paste'}
            onClick={() => setTab('paste')}
            icon={<IconClipboardText size={16} />}
            label="Paste PGN"
          />
        </div>

        {tab === 'import' ? (
          <>
            <GameImport onPick={submit} />
            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <IconAlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            <Textarea
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder={'[Event "..."]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
              className="min-h-[200px]"
              spellCheck={false}
            />

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <IconAlertTriangle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="flex-1"
                disabled={!pgn.trim()}
                onClick={() => submit(pgn)}
              >
                <IconWand size={18} />
                Analyze game
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setPgn(SAMPLE_PGN)
                  submit(SAMPLE_PGN)
                }}
              >
                Try example
              </Button>
            </div>
          </>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {engineReady ? 'Stockfish engine ready' : 'Loading Stockfish engine…'}
        </p>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
