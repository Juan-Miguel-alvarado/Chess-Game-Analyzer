# Chess Game Analyzer

A chess.com-style game analyzer that grades every move with Stockfish —
running **entirely in your browser**, no backend. Import your games from
Chess.com or Lichess by username, or paste any PGN.

<img width="1307" height="676" alt="image" src="https://github.com/user-attachments/assets/d8662508-0432-4ce3-912d-5dcc3c2c8b27" />


## Features

- **Import games** — type a Chess.com or Lichess username and pick from your
  last ~20 games, or paste a PGN (clock annotations supported).
- **Full move grading** by Stockfish 18 (WASM) with chess.com-style ratings.
- **Interactive board** — step through the game, and **drag or click-to-move**
  any piece to explore your own line. Your moves are analyzed live as a
  **secondary variation** without losing the original game.
- **"Best move you could have played"** shown whenever your move wasn't best,
  with an arrow on the board.
- **Evaluation bar + graph** across the whole game, with markers for
  brilliants, blunders, mistakes and inaccuracies, and a hover scrubber that
  shows which move you'll jump to.
- **Per-side accuracy** and a full rating breakdown.
- **Resizable board** (drag the corner) and a clean dark UI in the Onest font.

## Move ratings

| Symbol | Rating | Meaning |
| --- | --- | --- |
| `!!` | Brilliant | The best move, and a genuine sound sacrifice. |
| `★` | Best | The engine's top choice. |
| `📖` | Book | A well-known opening move from theory. |
| `!` | Good | A strong move that keeps your advantage. |
| `Ok` | Ok | A reasonable move with only a small concession. |
| `!?` | Inaccuracy | A slightly imprecise move — there was something better. |
| `?` | Mistake | A mistake that lets your position slip. |
| `??` | Blunder | A serious mistake that badly hurts your position. |

A move is only **Brilliant** when it gives up real material *on balance* — even
trades, winning captures and promotions don't qualify — and the position stays
sound.

## Stack

React + TypeScript (Vite), Tailwind CSS + shadcn-style UI, `chess.js`,
`react-chessboard`, Tabler icons, the Onest font, and Stockfish 18 (lite,
single-threaded WASM) running in a Web Worker. Games are fetched from the
public Chess.com and Lichess APIs.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

The Stockfish engine files live in [public/engine/](public/engine/) and are
served statically; analysis runs client-side via a Web Worker. Each position is
searched to depth 16 with a per-move time cap so even sharp games finish fast.
