// =============================================================
//  game.js — Core spin flow, free spins, and buy feature
// =============================================================

// ── Spin flow ─────────────────────────────────────────────────

/**
 * Runs a full spin cycle: generates finals, animates all columns,
 * then evaluates the result.
 *
 * Every 20 spins a win is forced (nudge) to maintain ~5%+ win rate.
 *
 * @param {boolean} isFree - true when called during free spins
 * @returns {boolean}      - true if free spins were triggered
 */
async function runSpin(isFree = false) {
  clearWins();
  spinCount++;

  // Generate the finals grid
  let finals = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, randSym)
  );

  // Forced win nudge every 20 spins.
  // Symbol probabilities for the forced win:
  //   💎 Sapphire Gem    — 45%  (guaranteed common, low payout)
  //   🔮 Crystal Ball    — 40%  (guaranteed common, low payout)
  //   🏺 Golden Urn      —  9%  (uncommon)
  //   🗡️ Lightning Sword —  4%  (rare)
  //   👁️ Eye of Zeus     —  2%  (very rare, highest payout)
  // Weights for 9 fruit symbols (index matches SYMBOLS order)
  // Low-value fruits more likely; high-value (🍋 fruit3, 🍉 fruit7) much rarer
  const FORCED_WIN_WEIGHTS = [15, 20, 2, 18, 20, 25, 3, 15, 22]; // maps to SYMBOLS
  const forceWin = !isFree && spinCount % 20 === 0;
  if (forceWin) {
    const tot = FORCED_WIN_WEIGHTS.reduce((a, b) => a + b, 0);
    let pick = Math.random() * tot;
    let forcedSym = SYMBOLS.at(-1);
    for (let i = 0; i < SYMBOLS.length; i++) {
      pick -= FORCED_WIN_WEIGHTS[i];
      if (pick <= 0) { forcedSym = SYMBOLS[i]; break; }
    }
    let placed = 0;
    for (let r = 0; r < ROWS && placed < WIN_THRESH; r++)  // WIN_THRESH = 8
      for (let c = 0; c < COLS && placed < WIN_THRESH; c++)
        if (Math.random() < 0.7) { finals[r][c] = forcedSym; placed++; }
    // Note: WIN_THRESH is now 8, so we only need 8 placements minimum
  }

  // Animate all columns (staggered start)
  const BASE = isFree ? 650 : 900;
  await Promise.all(
    Array.from({ length: COLS }, (_, c) =>
      delay(c * (isFree ? 55 : 80)).then(() =>
        rollColumn(c, finals.map(r => r[c]), BASE + c * (isFree ? 80 : 120))
      )
    )
  );

  await delay(isFree ? 80 : 100);

  // Evaluate using the finals grid (not the DOM)
  return evaluateFinals(finals, isFree);
}

/**
 * Handles a single player-initiated spin (base game).
 */
async function spin() {
  if (spinning || balance < bet) return;

  spinning = true;
  balance -= bet;
  sessionWin = 0;
  $('winDisplay').textContent = '$0.00';
  updateBalance();
  $('spinBtn').disabled = true;

  const triggered = await runSpin(false);
  spinning = false;

  if (triggered) await startFreeSpins();
  else $('spinBtn').disabled = false;
}


// ── Auto spin ─────────────────────────────────────────────────

let autoSpinCount     = 0;   // remaining auto spins (-1 = infinite)
let autoSpinActive    = false;
let autoSpinCancelled = false;

function toggleAutoSpinPopup() {
  if (autoSpinActive) { cancelAutoSpin(); return; }  // always allow cancel
  if (spinning || inFreeSpins) return;
  const popup = $('autoSpinPopup');
  const isOpen = popup.classList.contains('open');
  if (isOpen) { closeAutoSpinPopup(); return; }
  popup.classList.add('open');
  setTimeout(() => document.addEventListener('click', closeAutoSpinOutside), 0);
}

function closeAutoSpinPopup() {
  $('autoSpinPopup').classList.remove('open');
  document.removeEventListener('click', closeAutoSpinOutside);
}

function closeAutoSpinOutside(e) {
  const wrap = document.querySelector('.autospin-wrap');
  if (wrap && !wrap.contains(e.target)) closeAutoSpinPopup();
}

async function startAutoSpin(count) {
  closeAutoSpinPopup();
  autoSpinActive    = true;
  autoSpinCancelled = false;
  autoSpinCount     = count === '∞' ? -1 : count;

  const btn = $('autoSpinBtn');
  btn.classList.add('active');
  updateAutoSpinBtn();

  while (true) {
    if (autoSpinCancelled) break;
    if (autoSpinCount === 0) break;
    if (balance < bet) break;

    await spin();

    // Wait for free spins to finish before continuing auto spin
    while (inFreeSpins) await delay(200);

    if (autoSpinCount > 0) autoSpinCount--;

    // Check cancellation immediately after spin completes — before any delay
    if (autoSpinCancelled) break;

    updateAutoSpinBtn();
    await delay(300);
  }

  autoSpinActive    = false;
  autoSpinCancelled = false;
  btn.classList.remove('active');
  btn.textContent = 'AUTO';
}

function cancelAutoSpin() {
  autoSpinCancelled = true;
  const btn = $('autoSpinBtn');
  btn.textContent = 'STOPPING...';
}

function updateAutoSpinBtn() {
  const btn = $('autoSpinBtn');
  if (!autoSpinActive) return;
  btn.textContent = autoSpinCount === -1 ? 'STOP ∞' : `STOP (${autoSpinCount})`;
}


// ── Free spins ────────────────────────────────────────────────

/**
 * Runs the free spins sequence from start to summary.
 */
async function startFreeSpins() {
  inFreeSpins      = true;
  freeSpinTotalWin = 0;

  $('fsIntroCount').textContent = freeSpins;  // show actual awarded count
  await showOverlay('fsIntroOverlay', 3200, true);
  document.body.classList.add('freespin-mode');

  const hud = $('freeSpinHUD');
  hud.style.display = 'flex';

  while (freeSpins > 0) {
    freeSpins--;
    $('fsCount').textContent = freeSpins;
    await runSpin(true);
    // If scatters added more spins during this spin, the HUD will reflect it next iteration
    $('fsCount').textContent = freeSpins;
    await delay(600);
  }

  document.body.classList.remove('freespin-mode');
  hud.style.display = 'none';

  $('fsSummaryWin').textContent = '$' + freeSpinTotalWin.toFixed(2);
  await showOverlay('fsSummaryOverlay', 3000, true);

  inFreeSpins = false;
  $('spinBtn').disabled = false;
  updateBalance();
}


// ── Buy feature ───────────────────────────────────────────────

function openBuyModal() {
  if (spinning) return;
  const cost = bet * FS_MULT;
  $('buyModalCost').textContent    = '$' + cost;
  $('buyModalFormula').textContent = `${FS_MULT}× current bet ($${bet})`;
  $('buyPurchaseBtn').disabled     = balance < cost;
  $('buyModal').classList.add('open');
}

function closeBuyModal() {
  $('buyModal').classList.remove('open');
}

async function purchaseFreeSpin() {
  const cost = bet * FS_MULT;

  if (balance < cost) {
    const m = $('buyModal');
    m.style.cssText += 'border-color:#f44;box-shadow:0 0 30px rgba(255,60,60,.4)';
    if (!m.querySelector('.ins-msg')) {
      const d = Object.assign(document.createElement('div'), {
        className:   'ins-msg',
        textContent: '⚠️ INSUFFICIENT BALANCE',
      });
      Object.assign(d.style, {
        color: '#f66', fontFamily: 'Cinzel,serif', fontSize: '12px',
        textAlign: 'center', letterSpacing: '2px', marginBottom: '8px',
      });
      m.querySelector('.buy-modal-footer').before(d);
      setTimeout(() => {
        d.remove();
        m.style.borderColor = '';
        m.style.boxShadow   = '';
      }, 2000);
    }
    return;
  }

  closeBuyModal();
  balance  -= cost;
  freeSpins = 10;
  updateBalance();

  $('buyConfirmIcon').textContent  = '🪖';
  $('buyConfirmTitle').textContent = 'SPINS PURCHASED!';
  $('buyConfirmSub').textContent   = '10 Free Spins Activated';
  $('buyConfirmCost').textContent  = '-$' + cost;

  await showOverlay('buyConfirmOverlay', 2200, true);
  await startFreeSpins();
}