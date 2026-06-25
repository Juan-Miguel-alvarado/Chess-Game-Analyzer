// ../../../../../tmp/claude-1000/-home-juan-Documents-proyects-A3/a4cb0867-0fdf-49e3-b73f-9467d95a0622/scratchpad/probe.mjs
import initEngine from "stockfish";

// src/lib/chess.ts
import { Chess } from "chess.js";
var PgnError = class extends Error {
};
function parsePgn(pgn) {
  const trimmed = pgn.trim();
  if (!trimmed) throw new PgnError("Paste a PGN to analyze.");
  const chess = new Chess();
  try {
    chess.loadPgn(trimmed);
  } catch {
    throw new PgnError(
      "Couldn't read this PGN. Make sure it's a valid game export."
    );
  }
  const verbose = chess.history({ verbose: true });
  if (verbose.length === 0) {
    throw new PgnError("This PGN has no moves to analyze.");
  }
  const plies = verbose.map((m, index) => ({
    index,
    moveNumber: Math.floor(index / 2) + 1,
    color: m.color,
    san: m.san,
    uci: m.lan,
    from: m.from,
    to: m.to,
    fenBefore: m.before,
    fenAfter: m.after,
    captured: m.captured
  }));
  const headers = chess.getHeaders?.() ?? {};
  return {
    plies,
    headers,
    white: headers.White || "White",
    black: headers.Black || "Black",
    result: headers.Result || "*",
    event: headers.Event || ""
  };
}

// src/lib/classify.ts
import { Chess as Chess2 } from "chess.js";
var MATE_CP = 2e3;
function toWhiteCp(ev2) {
  if (ev2.mate != null) {
    if (ev2.mate === 0) return ev2.cp != null && ev2.cp < 0 ? -MATE_CP : MATE_CP;
    return ev2.mate > 0 ? MATE_CP : -MATE_CP;
  }
  return ev2.cp ?? 0;
}

// src/lib/sample.ts
var SAMPLE_PGN = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8
13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

// ../../../../../tmp/claude-1000/-home-juan-Documents-proyects-A3/a4cb0867-0fdf-49e3-b73f-9467d95a0622/scratchpad/probe.mjs
var enginePath = "/home/juan/Documents/proyects/A3/node_modules/stockfish/bin/stockfish-18-lite-single.js";
function pi(l) {
  if (!l.startsWith("info") || !l.includes("score")) return null;
  const p = l.split(/\s+/);
  let cp = null, mate = null, d = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] === "depth") d = Number(p[i + 1]) || d;
    if (p[i] === "score") {
      if (p[i + 1] === "cp") cp = Number(p[i + 2]);
      else if (p[i + 1] === "mate") mate = Number(p[i + 2]);
    }
  }
  return { cp, mate, d };
}
function ev(e2, fen, depth) {
  return new Promise((r) => {
    let a = { cp: null, mate: null, d: 0 };
    e2.listener = (l) => {
      const i = pi(l);
      if (i && i.d >= a.d) a = { ...i };
      if (typeof l === "string" && l.startsWith("bestmove")) {
        const s = fen.split(/\s+/)[1] === "b" ? -1 : 1;
        r({ cp: a.cp != null ? a.cp * s : null, mate: a.mate != null ? a.mate * s : null, depth: a.d });
      }
    };
    e2.sendCommand("position fen " + fen);
    e2.sendCommand("go depth " + depth);
  });
}
var e = await initEngine(enginePath);
e.sendCommand("uci");
e.sendCommand("isready");
await new Promise((r) => setTimeout(r, 300));
var g = parsePgn(SAMPLE_PGN);
for (const d of [14, 18, 22]) {
  const before = await ev(e, g.plies[28].fenBefore, d);
  const after = await ev(e, g.plies[28].fenAfter, d);
  console.log("depth", d, "15.Bxd7+  beforeWhiteCp=", toWhiteCp(before), "mate=", before.mate, " afterWhiteCp=", toWhiteCp(after), "mate=", after.mate);
}
process.exit(0);
