// =============================================================
//  evaluate.js — Win detection and tile highlighting
// =============================================================

/** Returns the bet multiplier for a fruit symbol at a given count. Multiply by bet for actual payout. */
function getPayout(sym, count) {
  const tiers = PAYOUTS[sym];
  if (!tiers) return 0;
  for (let i = tiers.length - 1; i >= 0; i--)
    if (count >= tiers[i][0]) return tiers[i][1];
  return 0;
}

/** Returns [cash, freeSpins] for a given scatter count. */
function getScatterPayout(count) {
  if (count >= 6) return SCATTER_PAYOUT_6PLUS;
  return SCATTER_PAYOUTS[count] || [0, 0];
}

/**
 * Evaluates a completed spin against the finals grid.
 * @param {string[][]} finals
 * @param {boolean}    isFree
 * @returns {boolean} true if free spins intro should play
 */
function evaluateFinals(finals, isFree = false) {
  const getTile = (r, c) => reelCols[c]?.tiles[r];
  const getSym  = (r, c) => finals[r][c];

  let totalWin  = 0;
  let triggered = false;
  let scatters  = 0;

  // Count scatters
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (getSym(r, c) === SCATTER) scatters++;

  // Fruit wins — 8+ cluster pays fixed $
  for (const sym of SYMBOLS) {
    const matches = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (getSym(r, c) === sym) matches.push([r, c]);

    const payout = getPayout(sym, matches.length) * bet;
    if (payout > 0) {
      totalWin += payout;
      matches.forEach(([r, c]) => {
        const tile = getTile(r, c);
        if (tile) { tile.classList.add('winner'); tile.dataset.sym = sym; }
      });
    }
  }

  // Scatter trigger — P(>=3) = sum C(6,k)*p^k*(1-p)^(6-k), k=3..6
  // Re-triggers during free spins, adding to remaining count.
  if (scatters >= 3) {
    const [cashPrize, awarded] = getScatterPayout(scatters);
    freeSpins += awarded;
    triggered  = !isFree;  // intro overlay only in base game
    const cashPrizeAmt = cashPrize * bet;
    if (cashPrizeAmt > 0) totalWin += cashPrizeAmt;

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (getSym(r, c) === SCATTER) {
          const tile = getTile(r, c);
          if (tile) tile.classList.add('scatter-tile');
        }

    showWin(cashPrizeAmt, true, awarded);
  }

  // Apply total win
  if (totalWin > 0) {
    $('grid').classList.add('has-winners');
    balance += totalWin;
    if (isFree) freeSpinTotalWin += totalWin;
    updateBalance();
    sessionWin += totalWin;
    $('winDisplay').textContent = '$' + sessionWin.toFixed(2);
    if (!triggered) showWin(totalWin, false);
    spawnParticles();
  }

  return triggered;
}

/** Removes all win highlights from every visible tile. */
function clearWins() {
  $('grid').classList.remove('has-winners');
  reelCols.forEach(({ tiles }) => tiles.forEach(t => {
    t.classList.remove('winner', 'scatter-tile');
    delete t.dataset.count;
    delete t.dataset.sym;
  }));
}