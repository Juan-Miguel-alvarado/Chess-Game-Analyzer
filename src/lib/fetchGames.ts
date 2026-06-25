export type Platform = 'chesscom' | 'lichess'

export interface GameItem {
  id: string
  white: string
  black: string
  whiteElo?: number
  blackElo?: number
  result: '1-0' | '0-1' | '1/2-1/2' | '*'
  speed: string // "Blitz", "Rapid", …
  timeControl: string // raw, e.g. "180+2"
  date: number // ms epoch
  pgn: string
  url?: string
}

export class FetchGamesError extends Error {}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Fetch a user's most recent ~20 games from the chosen platform. */
export async function fetchGames(
  platform: Platform,
  username: string,
): Promise<GameItem[]> {
  const user = username.trim()
  if (!user) throw new FetchGamesError('Enter a username first.')
  return platform === 'chesscom'
    ? fetchChessCom(user)
    : fetchLichess(user)
}

// ---------------------------------------------------------------- Chess.com

interface ChessComGame {
  url?: string
  pgn?: string
  time_class?: string
  time_control?: string
  end_time?: number
  rules?: string
  white?: { username?: string; rating?: number; result?: string }
  black?: { username?: string; rating?: number; result?: string }
}

function chessComResult(g: ChessComGame): GameItem['result'] {
  if (g.white?.result === 'win') return '1-0'
  if (g.black?.result === 'win') return '0-1'
  return '1/2-1/2'
}

async function fetchChessCom(user: string): Promise<GameItem[]> {
  const archRes = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(
      user.toLowerCase(),
    )}/games/archives`,
  )
  if (archRes.status === 404)
    throw new FetchGamesError(`No Chess.com player named "${user}".`)
  if (!archRes.ok)
    throw new FetchGamesError("Couldn't reach Chess.com. Try again.")

  const { archives } = (await archRes.json()) as { archives: string[] }
  if (!archives?.length)
    throw new FetchGamesError('This player has no games yet.')

  const collected: ChessComGame[] = []
  for (const url of [...archives].reverse()) {
    const res = await fetch(url)
    if (!res.ok) continue
    const { games } = (await res.json()) as { games: ChessComGame[] }
    collected.push(...games.reverse()) // newest first within the month
    if (collected.length >= 20) break
  }

  return collected
    .filter((g) => g.pgn && (!g.rules || g.rules === 'chess'))
    .slice(0, 20)
    .map((g, i) => ({
      id: g.url ?? `cc-${i}`,
      white: g.white?.username ?? 'White',
      black: g.black?.username ?? 'Black',
      whiteElo: g.white?.rating,
      blackElo: g.black?.rating,
      result: chessComResult(g),
      speed: cap(g.time_class ?? 'game'),
      timeControl: g.time_control ?? '',
      date: (g.end_time ?? 0) * 1000,
      pgn: g.pgn as string,
      url: g.url,
    }))
}

// ------------------------------------------------------------------ Lichess

interface LichessGame {
  id: string
  speed?: string
  createdAt?: number
  winner?: 'white' | 'black'
  variant?: string
  clock?: { initial: number; increment: number }
  players?: {
    white?: { user?: { name?: string }; rating?: number }
    black?: { user?: { name?: string }; rating?: number }
  }
  pgn?: string
}

async function fetchLichess(user: string): Promise<GameItem[]> {
  const res = await fetch(
    `https://lichess.org/api/games/user/${encodeURIComponent(
      user,
    )}?max=20&pgnInJson=true&clocks=false&evals=false&opening=false`,
    { headers: { Accept: 'application/x-ndjson' } },
  )
  if (res.status === 404)
    throw new FetchGamesError(`No Lichess player named "${user}".`)
  if (!res.ok) throw new FetchGamesError("Couldn't reach Lichess. Try again.")

  const text = (await res.text()).trim()
  if (!text) throw new FetchGamesError('This player has no games yet.')

  const games = text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LichessGame)

  return games
    .filter((g) => g.pgn && (!g.variant || g.variant === 'standard'))
    .map((g) => ({
      id: g.id,
      white: g.players?.white?.user?.name ?? 'Anonymous',
      black: g.players?.black?.user?.name ?? 'Anonymous',
      whiteElo: g.players?.white?.rating,
      blackElo: g.players?.black?.rating,
      result: g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2',
      speed: cap(g.speed ?? 'game'),
      timeControl: g.clock ? `${g.clock.initial / 60}+${g.clock.increment}` : '',
      date: g.createdAt ?? 0,
      pgn: g.pgn as string,
      url: `https://lichess.org/${g.id}`,
    }))
}
