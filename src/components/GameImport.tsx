import { useState } from 'react'
import { IconAlertTriangle, IconLoader2, IconSearch } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  fetchGames,
  FetchGamesError,
  type GameItem,
  type Platform,
} from '@/lib/fetchGames'
import { cn } from '@/lib/utils'

interface Props {
  onPick: (pgn: string) => void
}

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'chesscom', label: 'Chess.com' },
  { key: 'lichess', label: 'Lichess' },
]

function resultStyle(r: GameItem['result']): string {
  if (r === '1-0') return 'bg-[var(--rating-good)]/15 text-[var(--rating-good)]'
  if (r === '0-1') return 'bg-[var(--rating-blunder)]/15 text-[var(--rating-blunder)]'
  return 'bg-secondary text-muted-foreground'
}

function fmtDate(ms: number): string {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GameImport({ onPick }: Props) {
  const [platform, setPlatform] = useState<Platform>('chesscom')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [games, setGames] = useState<GameItem[]>([])

  const search = async () => {
    if (!username.trim() || loading) return
    setLoading(true)
    setError(null)
    setGames([])
    try {
      const list = await fetchGames(platform, username)
      if (list.length === 0) setError('No standard games found for this user.')
      setGames(list)
    } catch (e) {
      setError(
        e instanceof FetchGamesError ? e.message : 'Something went wrong fetching games.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Platform toggle */}
      <div className="flex rounded-lg border border-border bg-background/50 p-1">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPlatform(p.key)
              setGames([])
              setError(null)
            }}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              platform === p.key
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Username search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder={`${platform === 'chesscom' ? 'Chess.com' : 'Lichess'} username`}
            spellCheck={false}
            autoCapitalize="none"
            className="h-10 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button onClick={search} disabled={!username.trim() || loading}>
          {loading ? (
            <IconLoader2 size={18} className="animate-spin" />
          ) : (
            'Find games'
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <IconAlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {games.length > 0 && (
        <div className="scrollbar-thin flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => onPick(g.pgn)}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-secondary/50"
            >
              <span className="w-12 shrink-0 text-xs font-medium text-muted-foreground">
                {g.speed}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-medium">
                  {g.white}
                  {g.whiteElo ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {g.whiteElo}
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-sm font-medium">
                  {g.black}
                  {g.blackElo ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      {g.blackElo}
                    </span>
                  ) : null}
                </div>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                  resultStyle(g.result),
                )}
              >
                {g.result === '1/2-1/2' ? '½–½' : g.result}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-xs text-muted-foreground sm:block">
                {fmtDate(g.date)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
