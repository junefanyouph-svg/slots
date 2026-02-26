// =============================================================
//  ui.js — UI helpers: balance, bet, overlays, particles, etc.
// =============================================================

// ── Balance & bet ─────────────────────────────────────────────

function updateBalance() {
  $('balanceDisplay').textContent = '$' + balance.toFixed(2);
  if (balance < bet && !inFreeSpins) {
    $('spinBtn').disabled    = true;
    $('spinBtn').textContent = 'NO FUNDS';
  }
}

// ── Bet step ladder ──────────────────────────────────────────
// Defines the available values at each tier and the steps within each tier.
const BET_PRESETS = [1, 5, 10, 20, 50, 100];

const BET_STEPS = {
  1:  [1, 1.5, 2, 2.5, 3, 4, 5],
  5:  [5, 6, 7, 8, 9, 10],
  10: [10, 15, 20],
  20: [20, 25, 30, 35, 40, 45, 50],
  50: [50, 60, 70, 80, 90, 100],
  100: [100],
};

function getCurrentSteps() {
  // Build a flat, deduplicated, ordered list of all bet values
  const seen = new Set();
  return BET_PRESETS.flatMap(p => BET_STEPS[p]).filter(v => {
    const key = v.toFixed(3);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function findBetIndex(steps) {
  // Use tolerance for floating point comparison
  return steps.findIndex(v => Math.abs(v - bet) < 0.001);
}

function changeBetStep(dir) {
  if (spinning || inFreeSpins) return;
  closeBetPopup();
  const steps = getCurrentSteps();
  let idx = findBetIndex(steps);
  if (idx === -1) {
    // Snap to nearest
    idx = steps.reduce((best, v, i) =>
      Math.abs(v - bet) < Math.abs(steps[best] - bet) ? i : best, 0);
  }
  const newIdx = idx + dir;
  if (newIdx >= 0 && newIdx < steps.length) {
    bet = steps[newIdx];
  }
  updateBetDisplay();
  updateBetButtons();
}

function selectBet(value) {
  if (spinning || inFreeSpins) return;
  bet = value;
  updateBetDisplay();
  updateBetButtons();
  closeBetPopup();
}

function updateBetButtons() {
  const steps = getCurrentSteps();
  const idx = findBetIndex(steps);
  const atMin = idx <= 0;
  const atMax = idx >= steps.length - 1;
  const down = $('betDownBtn');
  const up   = $('betUpBtn');
  if (down) { down.disabled = atMin;  down.style.opacity = atMin ? '.35' : ''; }
  if (up)   { up.disabled   = atMax;  up.style.opacity   = atMax ? '.35' : ''; }
}

function updateBetDisplay() {
  $('betDisplay').textContent = bet % 1 === 0 ? bet : bet.toFixed(1);
  updateBetButtons();
  if ($('buyModal').classList.contains('open')) {
    $('buyModalCost').textContent    = '$' + (bet * FS_MULT).toFixed(2);
    $('buyModalFormula').textContent = `${FS_MULT}× current bet ($${bet})`;
    $('buyPurchaseBtn').disabled     = balance < bet * FS_MULT;
  }
}

function toggleBetPopup() {
  if (spinning || inFreeSpins) return;
  const popup = $('betPopup');
  const isOpen = popup.classList.contains('open');
  if (isOpen) { closeBetPopup(); return; }

  // Populate preset buttons
  const opts = $('betPopupOptions');
  opts.innerHTML = '';
  BET_PRESETS.forEach(v => {
    const btn = document.createElement('button');
    btn.className = 'bet-popup-btn' + (v === Math.floor(bet) || v === bet ? ' active' : '');
    btn.textContent = '$' + v;
    btn.onclick = () => selectBet(v);
    opts.appendChild(btn);
  });
  popup.classList.add('open');
  // Close when clicking outside
  setTimeout(() => document.addEventListener('click', closeBetPopupOutside), 0);
}

function closeBetPopup() {
  $('betPopup').classList.remove('open');
  document.removeEventListener('click', closeBetPopupOutside);
}

function closeBetPopupOutside(e) {
  const wrap = document.querySelector('.bet-selector-wrap');
  if (!wrap.contains(e.target)) closeBetPopup();
}

// Legacy alias so buy modal sync still works
function changeBet(delta) { changeBetStep(delta > 0 ? 1 : -1); }


// ── Win message ───────────────────────────────────────────────

function showWin(amount, isScatter, freeSpinsAwarded = 0) {
  if (isScatter) {
    const cashPart = amount > 0 ? ` +$${amount.toFixed(2)}` : '';
    $('winText').textContent = `⭐ ${freeSpinsAwarded} FREE SPINS!${cashPart} ⭐`;
  } else {
    $('winText').textContent = amount >= 50  ? `🏆 MEGA WIN! $${amount.toFixed(2)}`
                             : amount >= 20  ? `✨ BIG WIN! $${amount.toFixed(2)}`
                             :                 `💰 WIN! $${amount.toFixed(2)}`;
  }

  const m = $('winMessage');
  m.classList.add('show');
  setTimeout(() => m.classList.remove('show'), 2000);
}


// ── Particles ─────────────────────────────────────────────────

function spawnParticles(big = false) {
  const ct   = $('particles');
  const cols = big
    ? ['#ffd700', '#fff700', '#ffaa00', '#fff', '#ffe566']
    : ['#ffd700', '#ff6b35', '#fff',    '#c8ff00', '#ff9500'];
  const count = big ? 80 : 30;

  for (let i = 0; i < count; i++) {
    const p = Object.assign(document.createElement('div'), { className: 'particle' });
    Object.assign(p.style, {
      left:              Math.random() * 100 + 'vw',
      top:               '-10px',
      background:        cols[Math.random() * cols.length | 0],
      animationDelay:    Math.random() * (big ? 1.5 : 0.8) + 's',
      animationDuration: (big ? 1.5 + Math.random() * 1.5 : 1 + Math.random()) + 's',
    });
    if (big) p.style.width = p.style.height = (6 + Math.random() * 10) + 'px';
    ct.appendChild(p);
    setTimeout(() => p.remove(), big ? 4000 : 2500);
  }
}


// ── Overlay helper ────────────────────────────────────────────

/**
 * Shows a full-screen overlay for a given duration, then hides it.
 * Optionally spawns particles while it's visible.
 */
function showOverlay(id, ms, particles = false) {
  return new Promise(resolve => {
    const el = $(id);
    el.classList.add('show');
    if (particles) spawnParticles(true);
    setTimeout(() => { el.classList.remove('show'); resolve(); }, ms);
  });
}


// ── Loading screen ────────────────────────────────────────────

async function runLoadingScreen() {
  // Populate twinkling stars
  const ct = $('loadStars');
  for (let i = 0; i < 80; i++) {
    const s  = Object.assign(document.createElement('div'), { className: 'star' });
    const sz = 1 + Math.random() * 3;
    s.style.cssText = [
      `width:${sz}px`, `height:${sz}px`,
      `left:${Math.random() * 100}%`,
      `top:${Math.random() * 100}%`,
      `animation-duration:${2 + Math.random() * 3}s`,
      `animation-delay:${Math.random() * 3}s`,
    ].join(';');
    ct.appendChild(s);
  }

  // Progress bar & rotating tips
  const bar  = $('loadBar');
  const pct  = $('loadPct');
  const tip  = $('loadTip');
  const tips = [
    'Harvesting fruits...',
    'Polishing the reels...',
    'Counting cherries...',
    'Ripening the jackpot...',
    'Squeezing the lemons...',
    'Preparing your fortune...',
  ];
  let ti = 0;
  const iv = setInterval(() => {
    ti = (ti + 1) % tips.length;
    tip.style.opacity = 0;
    setTimeout(() => { tip.textContent = tips[ti]; tip.style.opacity = ''; }, 300);
  }, 900);

  for (let i = 0; i <= 100; i++) {
    await delay(30 + Math.random() * 20);
    bar.style.width  = i + '%';
    pct.textContent  = i + '%';
  }

  clearInterval(iv);
  await delay(300);
  $('loadingScreen').classList.add('hidden');
  await delay(800);
  $('mainMenu').classList.remove('hidden');
}


// ── Game entry point ──────────────────────────────────────────

function startGame() {
  $('mainMenu').classList.add('hidden');
  setTimeout(() => {
    $('gameRoot').classList.remove('hidden');
    updateBetDisplay();
    updateBetButtons();
    requestAnimationFrame(() => requestAnimationFrame(buildGrid));
  }, 600);
}