// =============================================================
//  evaluate.js — Win detection and tile highlighting
// =============================================================

/**
 * Evaluates a completed spin against the finals grid.
 *
 * @param {string[][]} finals  - finals[row][col] symbol strings
 * @param {boolean}    isFree  - true during free spins (scatters don't re-trigger)
 * @returns {boolean}          - true if free spins were triggered
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

  // Check each paying symbol for a cluster of WIN_THRESH or more
  for (const sym of SYMBOLS) {
    const matches = [];

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (getSym(r, c) === sym) matches.push([r, c]);

    if (matches.length >= WIN_THRESH) {
      totalWin += bet * getMult(sym, matches.length);

      // Highlight winning tiles
      matches.forEach(([r, c]) => {
        const tile = getTile(r, c);
        if (tile) {
          tile.classList.add('winner');
          tile.dataset.count = matches.length;
          tile.dataset.sym   = sym;
        }
      });
    }
  }

  // Scatter trigger (exactly 4, only in base game)
  if (scatters === 4 && !isFree) {
    freeSpins += 10;
    triggered  = true;

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (getSym(r, c) === SCATTER) {
          const tile = getTile(r, c);
          if (tile) tile.classList.add('scatter-tile');
        }

    showWin(0, true);
  }

  // Apply win
  if (totalWin > 0) {
    $('grid').classList.add('has-winners');
    balance += totalWin;
    if (isFree) freeSpinTotalWin += totalWin;
    updateBalance();
    $('winDisplay').textContent = '$' + totalWin.toFixed(2);
    if (!triggered) showWin(totalWin, false);
    spawnParticles();
  }

  return triggered;
}

/**
 * Returns the payout multiplier for a symbol at a given cluster size.
 * Base value × cluster-size bonus.
 */
function getMult(sym, count) {
  const base  = [50, 20, 10, 5, 3][SYMBOLS.indexOf(sym)] || 2;
  const bonus = count >= 25 ? 10
              : count >= 20 ?  7
              : count >= 16 ?  5
              : count >= 14 ?  3
              : count >= 12 ?  2
              :                1;
  return base * bonus;
}

/**
 * Removes all win highlights from every visible tile.
 */
function clearWins() {
  $('grid').classList.remove('has-winners');
  reelCols.forEach(({ tiles }) => tiles.forEach(t => {
    t.classList.remove('winner', 'scatter-tile');
    delete t.dataset.count;
    delete t.dataset.sym;
  }));
}
