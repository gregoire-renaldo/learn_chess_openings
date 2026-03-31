import fs from 'node:fs/promises';
import path from 'node:path';
import { Chess } from 'chess.js';

const ROOT = process.cwd();
const OPENINGS_PATH = path.join(ROOT, 'src/data/openings.json');
const POSITION_INDEX_PATH = path.join(ROOT, 'src/data/positionIndex.json');
const TACTICS_PATH = path.join(ROOT, 'src/data/tactics.json');
const LICHESS_EXPLORER_URL = 'https://explorer.lichess.ovh/lichess';

function normaliseFen(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }

  return { positional, options };
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.writeFile(`${filePath}`, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function uciToMoveObject(uci) {
  if (!uci || uci.length < 4) {
    return null;
  }

  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchExplorerMoves(fen, options = {}) {
  const query = new URLSearchParams({
    variant: 'standard',
    fen,
    moves: String(options.moves ?? 12),
    topGames: '0',
    recentGames: '0',
  });

  const response = await fetch(`${LICHESS_EXPLORER_URL}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Explorer request failed (${response.status}) for fen: ${fen}`);
  }

  const data = await response.json();
  const moves = Array.isArray(data.moves) ? data.moves : [];
  return moves
    .map((move) => ({
      uci: String(move.uci ?? ''),
      san: String(move.san ?? ''),
      games: Number(move.white ?? 0) + Number(move.draws ?? 0) + Number(move.black ?? 0),
      white: Number(move.white ?? 0),
      draws: Number(move.draws ?? 0),
      black: Number(move.black ?? 0),
    }))
    .filter((move) => move.uci.length >= 4)
    .sort((left, right) => right.games - left.games);
}

function sideToMoveFromHistory(side, historyLen) {
  const userTurn = side === 'white' ? historyLen % 2 === 0 : historyLen % 2 === 1;
  return userTurn ? 'user' : 'opponent';
}

function selectMoveForProfile(sortedMoves, profile, isOpponentTurn, firstOpponentChoiceDone) {
  if (sortedMoves.length === 0) {
    return null;
  }

  if (!isOpponentTurn || firstOpponentChoiceDone) {
    return sortedMoves[0];
  }

  if (profile === 'main') {
    return sortedMoves[0];
  }

  if (profile === 'sideline') {
    return sortedMoves[1] ?? sortedMoves[0];
  }

  // offbeat: choose a lower-frequency move while staying legal/popular enough.
  const candidatePool = sortedMoves.slice(1, Math.min(6, sortedMoves.length));
  return candidatePool[candidatePool.length - 1] ?? sortedMoves[0];
}

async function generateLineFromExplorer({
  side,
  seedMoves,
  maxPlies,
  minGames,
  profile,
  paceMs,
}) {
  const chess = new Chess();
  const moves = [];

  for (const seedMove of seedMoves) {
    const moveObj = uciToMoveObject(seedMove);
    if (!moveObj || !chess.move(moveObj)) {
      throw new Error(`Invalid seed move: ${seedMove}`);
    }
    moves.push(seedMove);
  }

  let firstOpponentChoiceDone = false;
  while (moves.length < maxPlies) {
    const isOpponentTurn = sideToMoveFromHistory(side, moves.length) === 'opponent';
    const explorerMoves = await fetchExplorerMoves(chess.fen(), { moves: 12 });
    const filtered = explorerMoves.filter((move) => move.games >= minGames);
    const pool = filtered.length > 0 ? filtered : explorerMoves;
    if (pool.length === 0) {
      break;
    }

    const selected = selectMoveForProfile(pool, profile, isOpponentTurn, firstOpponentChoiceDone);
    if (!selected) {
      break;
    }

    const selectedMove = uciToMoveObject(selected.uci);
    if (!selectedMove || !chess.move(selectedMove)) {
      break;
    }

    moves.push(selected.uci);
    if (isOpponentTurn) {
      firstOpponentChoiceDone = true;
    }

    if (paceMs > 0) {
      await sleep(paceMs);
    }
  }

  return moves;
}

function upsertNextMove(existingMoves, candidate) {
  const found = existingMoves.find((move) => move.uci === candidate.uci && move.type === candidate.type);
  if (!found) {
    existingMoves.push(candidate);
    return;
  }

  found.weight = Math.max(found.weight ?? 1, candidate.weight ?? 1);
  if (!found.note && candidate.note) {
    found.note = candidate.note;
  }

  if (candidate.recommendedResponses?.length) {
    found.recommendedResponses = Array.from(new Set([...(found.recommendedResponses ?? []), ...candidate.recommendedResponses]));
  }
  if (candidate.acceptedResponses?.length) {
    found.acceptedResponses = Array.from(new Set([...(found.acceptedResponses ?? []), ...candidate.acceptedResponses]));
  }
}

async function rebuildIndex() {
  const openings = await readJson(OPENINGS_PATH);
  const index = {};

  for (const opening of openings) {
    for (const line of opening.lines) {
      const chess = new Chess();

      for (let ply = 0; ply < line.moves.length; ply += 1) {
        const fenKey = normaliseFen(chess.fen());
        const nextUci = line.moves[ply];
        const moveObj = uciToMoveObject(nextUci);

        if (!moveObj || !chess.move(moveObj)) {
          throw new Error(`Invalid move '${nextUci}' in opening '${opening.id}', line '${line.id}' at ply ${ply + 1}`);
        }

        if (!index[fenKey]) {
          index[fenKey] = { openingIds: [], nextMoves: [] };
        }

        if (!index[fenKey].openingIds.includes(opening.id)) {
          index[fenKey].openingIds.push(opening.id);
        }

        upsertNextMove(index[fenKey].nextMoves, {
          uci: nextUci,
          type: line.type,
          weight: line.weight,
          note: line.explanation,
          recommendedResponses: line.recommendedResponses,
          acceptedResponses: line.acceptedResponses,
        });
      }
    }
  }

  const sorted = Object.fromEntries(
    Object.entries(index)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fenKey, entry]) => {
        entry.openingIds.sort();
        entry.nextMoves.sort((left, right) => {
          if (right.weight !== left.weight) {
            return right.weight - left.weight;
          }
          return left.uci.localeCompare(right.uci);
        });
        return [fenKey, entry];
      }),
  );

  await writeJson(POSITION_INDEX_PATH, sorted);
  console.log(`Rebuilt position index with ${Object.keys(sorted).length} positions.`);
}

async function addLine(options) {
  const required = ['opening', 'line-id', 'type', 'weight', 'moves'];
  const missing = required.filter((key) => !options[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(', ')}`);
  }

  const openings = await readJson(OPENINGS_PATH);
  const opening = openings.find((item) => item.id === options.opening);
  if (!opening) {
    throw new Error(`Opening '${options.opening}' not found in openings.json`);
  }

  const moves = String(options.moves)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (moves.length === 0) {
    throw new Error('Moves list is empty. Pass UCI moves with --moves "e2e4 e7e5 ..."');
  }

  if (opening.lines.some((line) => line.id === options['line-id'])) {
    throw new Error(`Line id '${options['line-id']}' already exists for opening '${opening.id}'`);
  }

  const line = {
    id: String(options['line-id']),
    moves,
    type: String(options.type),
    weight: Number(options.weight),
    explanation: String(options.explanation ?? 'Imported line'),
    notes: String(options.notes ?? '')
      .split('|')
      .map((note) => note.trim())
      .filter(Boolean),
    recommendedResponses: String(options.recommended ?? '')
      .split(/[\s,|]+/)
      .map((item) => item.trim())
      .filter(Boolean),
    acceptedResponses: String(options.accepted ?? '')
      .split(/[\s,|]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  };

  const chess = new Chess();
  for (const move of line.moves) {
    const moveObj = uciToMoveObject(move);
    if (!moveObj || !chess.move(moveObj)) {
      throw new Error(`Invalid UCI move in provided line: ${move}`);
    }
  }

  opening.lines.push(line);
  await writeJson(OPENINGS_PATH, openings);
  console.log(`Added line '${line.id}' to opening '${opening.id}'.`);
}

async function addOpening(options) {
  const required = ['id', 'name', 'eco', 'side', 'description'];
  const missing = required.filter((key) => !options[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(', ')}`);
  }

  const side = String(options.side);
  if (side !== 'white' && side !== 'black') {
    throw new Error("--side must be 'white' or 'black'");
  }

  const openings = await readJson(OPENINGS_PATH);
  if (openings.some((opening) => opening.id === options.id)) {
    throw new Error(`Opening id '${options.id}' already exists.`);
  }

  openings.push({
    id: String(options.id),
    name: String(options.name),
    eco: String(options.eco),
    side,
    startFen: String(options['start-fen'] ?? 'start'),
    description: String(options.description),
    lines: [],
  });

  await writeJson(OPENINGS_PATH, openings);
  console.log(`Added opening '${options.id}' (${side}).`);
}

async function fetchOpening(options) {
  const required = ['id', 'name', 'eco', 'side', 'description'];
  const missing = required.filter((key) => !options[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(', ')}`);
  }

  const side = String(options.side);
  if (side !== 'white' && side !== 'black') {
    throw new Error("--side must be 'white' or 'black'");
  }

  const openingId = String(options.id);
  const seedMoves = String(options.seed ?? '')
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const maxPlies = Number(options['max-plies'] ?? 10);
  const minGames = Number(options['min-games'] ?? 100);
  const paceMs = Number(options['pace-ms'] ?? 200);
  const replace = String(options.replace ?? 'false') === 'true';

  const openings = await readJson(OPENINGS_PATH);
  let opening = openings.find((item) => item.id === openingId);
  if (!opening) {
    opening = {
      id: openingId,
      name: String(options.name),
      eco: String(options.eco),
      side,
      startFen: String(options['start-fen'] ?? 'start'),
      description: String(options.description),
      lines: [],
    };
    openings.push(opening);
  } else {
    opening.name = String(options.name);
    opening.eco = String(options.eco);
    opening.side = side;
    opening.description = String(options.description);
  }

  if (replace) {
    opening.lines = [];
  }

  const profiles = [
    { type: 'main', weight: Number(options['main-weight'] ?? 100) },
    { type: 'sideline', weight: Number(options['sideline-weight'] ?? 60) },
    { type: 'offbeat', weight: Number(options['offbeat-weight'] ?? 20) },
  ];

  for (const profile of profiles) {
    const generatedMoves = await generateLineFromExplorer({
      side,
      seedMoves,
      maxPlies,
      minGames,
      profile: profile.type,
      paceMs,
    });

    if (generatedMoves.length === 0) {
      continue;
    }

    const lineId = `${openingId}-${profile.type}-${Date.now()}`;
    const line = {
      id: lineId,
      moves: generatedMoves,
      type: profile.type,
      weight: profile.weight,
      explanation: `Generated from Lichess explorer (${profile.type}).`,
      notes: [
        'Imported from real game statistics',
        'Review before using in training',
      ],
      recommendedResponses: [],
      acceptedResponses: [],
    };

    opening.lines.push(line);
    console.log(`Generated ${profile.type} line with ${generatedMoves.length} plies.`);
  }

  await writeJson(OPENINGS_PATH, openings);
  console.log(`Updated opening '${openingId}' using explorer data.`);
  console.log('Run: npm run data:rebuild-index');
}

async function normaliseTactics() {
  const tactics = await readJson(TACTICS_PATH);
  const seen = new Set();
  const normalized = [];

  for (const tactic of tactics) {
    const id = String(tactic.id);
    if (seen.has(id)) {
      throw new Error(`Duplicate tactic id: ${id}`);
    }
    seen.add(id);

    normalized.push({
      ...tactic,
      fen: normaliseFen(String(tactic.fen)),
      solution: Array.isArray(tactic.solution) ? tactic.solution : [],
      theme: Array.isArray(tactic.theme) ? tactic.theme : [],
      openingTags: Array.isArray(tactic.openingTags) ? tactic.openingTags : [],
    });
  }

  await writeJson(TACTICS_PATH, normalized);
  console.log(`Normalized ${normalized.length} tactics.`);
}

function printHelp() {
  console.log(`
Opening data tools

Commands:
  rebuild-index
    Rebuild src/data/positionIndex.json from src/data/openings.json

  fetch-opening --id <id> --name "..." --eco <code> --side <white|black> --description "..."
    [--seed "e2e4 e7e5"] [--max-plies 10] [--min-games 100] [--pace-ms 200] [--replace true]
    Fetch real move statistics from Lichess explorer and append generated lines

  add-opening --id <id> --name "..." --eco <code> --side <white|black> --description "..." [--start-fen "start"]
    Add a new opening shell with empty lines

  add-line --opening <id> --line-id <id> --type <main|sideline|offbeat> --weight <n> --moves "e2e4 e7e5 ..." [--explanation "..."] [--notes "n1|n2"] [--recommended "e2e4,c2c4"] [--accepted "..."]
    Add one line to an opening entry in openings.json

  normalize-tactics
    Normalize tactic FENs and validate shape in src/data/tactics.json

Examples:
  node scripts/opening-data.mjs rebuild-index
  node scripts/opening-data.mjs fetch-opening --id sicilian-defense --name "Sicilian Defense" --eco B20 --side black --description "Counter-attacking defense with c5" --seed "e2e4 c7c5" --max-plies 12 --replace true
  node scripts/opening-data.mjs add-opening --id sicilian-defense --name "Sicilian Defense" --eco B20 --side black --description "Counter-attacking defense with c5"
  node scripts/opening-data.mjs add-line --opening sicilian-defense --line-id sicilian-main-open --type main --weight 100 --moves "e2e4 c7c5 g1f3 d7d6 d2d4"
  node scripts/opening-data.mjs normalize-tactics
`);
}

async function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));
  const command = positional[0];

  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  if (command === 'rebuild-index') {
    await rebuildIndex();
    return;
  }

  if (command === 'add-line') {
    await addLine(options);
    return;
  }

  if (command === 'add-opening') {
    await addOpening(options);
    return;
  }

  if (command === 'fetch-opening') {
    await fetchOpening(options);
    return;
  }

  if (command === 'normalize-tactics') {
    await normaliseTactics();
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
