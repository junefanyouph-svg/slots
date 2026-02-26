// =============================================================
//  config.js — Game constants and shared mutable state
// =============================================================

// ── Grid dimensions ───────────────────────────────────────────
const ROWS = 5;
const COLS = 6;

// ── Symbols ───────────────────────────────────────────────────
const SCATTER = '⭐';
const SYMBOLS = ['🍇', '🍊', '🍋', '🍎', '🍓', '🍒', '🍉', '🍑', '🍍'];
const WEIGHTS = [1, 1, 1, 1, 1, 1, 1, 1, 1];  // Equal weight ~11% each

// ── Symbol image map ──────────────────────────────────────────
// Maps each symbol (emoji key) to its image path in assets/
const SYMBOL_IMAGES = {
  '🍇': 'assets/grapes.png',
  '🍊': 'assets/orange.png',
  '🍋': 'assets/lemon.png',
  '🍎': 'assets/apple.png',
  '🍓': 'assets/strawberry.png',
  '🍒': 'assets/cherry.png',
  '🍉': 'assets/watermelon.png',
  '🍑': 'assets/peach.png',
  '🍍': 'assets/pineapple.png',
  '⭐': 'assets/scatter.png',
};

// ── Payout table — bet multipliers ──────────────────────────
// Each entry: [min_count, multiplier]. Payout = multiplier × bet.
// e.g. 🍒 12+ = 2× → $10 bet wins $20, $50 bet wins $100
const PAYOUTS = {
  '🍇': [[ 8,  2.00], [10,  5.00], [12, 15.00]],  // fruit 1
  '🍊': [[ 8,  0.80], [10,  1.20], [12,  8.00]],  // fruit 2
  '🍋': [[ 8, 10.00], [10, 25.00], [12, 50.00]],  // fruit 3
  '🍎': [[ 8,  1.50], [10,  2.00], [12, 12.00]],  // fruit 4
  '🍓': [[ 8,  0.50], [10,  1.00], [12,  5.00]],  // fruit 5
  '🍒': [[ 8,  0.20], [10,  0.70], [12,  2.00]],  // fruit 6
  '🍉': [[ 8,  2.50], [10, 10.00], [12, 25.00]],  // fruit 7
  '🍑': [[ 8,  1.00], [10,  1.50], [12, 25.00]],  // fruit 8
  '🍍': [[ 8,  0.40], [10,  0.90], [12,  4.00]],  // fruit 9
};

// ── Scatter payouts — [multiplier, free_spins] ───────────────
// Cash prize = multiplier × bet
const SCATTER_PAYOUTS = {
  3: [0.00,   5],
  4: [3.00,  15],
  5: [5.00,  15],
};
const SCATTER_PAYOUT_6PLUS = [100.00, 15];

// ── Win rules ─────────────────────────────────────────────────
const WIN_THRESH = 8;    // Minimum cluster to pay (fruits)
const FS_MULT    = 100;  // Buy-feature cost = bet × FS_MULT

// ── Mutable game state ────────────────────────────────────────
let balance         = 100;
let bet             = 1;
let spinning        = false;
let freeSpins       = 0;
let inFreeSpins     = false;
let freeSpinTotalWin = 0;
let spinCount       = 0;   // Used for forced-win nudge every 20 spins
let sessionWin      = 0;   // Accumulated win for current spin session (resets on new manual spin)

// ── Reel data ─────────────────────────────────────────────────
let reelCols = [];  // Array of { el, tiles, tileH } per column

// ── Utility ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const delay = ms => new Promise(r => setTimeout(r, ms));