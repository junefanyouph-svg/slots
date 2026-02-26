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

function changeBet(delta) {
  if (spinning || inFreeSpins) return;
  bet = Math.max(5, Math.min(100, bet + delta));
  $('betDisplay').textContent = bet;

  // Keep buy modal in sync if it's open
  if ($('buyModal').classList.contains('open')) {
    $('buyModalCost').textContent    = '$' + bet * FS_MULT;
    $('buyModalFormula').textContent = `${FS_MULT}× current bet ($${bet})`;
    $('buyPurchaseBtn').disabled     = balance < bet * FS_MULT;
  }
}


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
    requestAnimationFrame(() => requestAnimationFrame(buildGrid));
  }, 600);
}