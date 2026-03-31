# Learn Chess Openings

A web app to study and train chess openings move by move.

## Basic Features

- Choose your side: start by selecting White or Black repertoires.
- Browse opening catalog: filter by category and difficulty, and search by opening name.
- Study mode: step through an opening line with board controls (start, back, forward, end).
- Move list with guidance: see SAN moves, active move highlighting, and key move notes.
- Training mode: play the expected moves directly on the board.
- Instant feedback: get responses for correct moves, illegal moves, and off-opening moves.
- Hint system: highlight the target square for the next expected move.
- Auto opponent replies: the app plays the opponent side in training flow.
- Progress tracking: view move progress and session stats while training.
- Local persistence: completed training sessions are saved in local storage.

## Included Openings

The app currently includes a curated set of common openings for both colors, including:

- White examples: Italian Game, Scotch Game, Ruy Lopez, Queen's Gambit, London System
- Black examples: Sicilian Defense, French Defense, Caro-Kann Defense, King's Indian Defense, Nimzo-Indian Defense

## Tech Stack

- React 19
- TypeScript
- Vite
- chess.js
- react-chessboard

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```
