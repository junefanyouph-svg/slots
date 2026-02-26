// =============================================================
//  reel.js — Grid construction and column spin animation
// =============================================================

// ── Symbol rendering ──────────────────────────────────────────

/**
 * Sets the visual content of a tile element to the symbol's image.
 * Falls back to text emoji if no image mapping exists.
 */
function setTileSymbol(el, sym) {
  const src = SYMBOL_IMAGES[sym];
  if (src) {
    el.textContent = '';
    const img = document.createElement('img');
    img.src = src;
    img.alt = sym;
    img.className = 'sym-img';
    el.appendChild(img);
  } else {
    el.textContent = sym;
  }
}


// ── Symbol generation ─────────────────────────────────────────

/**
 * Returns a random symbol, weighted by WEIGHTS.
 * SCATTER has its own tiny flat probability (0.4%).
 */
function randSym() {
  if (Math.random() < 0.01) return SCATTER;  // ~4% per cell → P(≥3 scatters) ≈ 4.7%
  const tot = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * tot;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS.at(-1);
}


// ── Grid construction ─────────────────────────────────────────

/**
 * Builds the 5×6 reel grid inside #grid.
 * Each column gets ROWS absolutely-positioned tile divs.
 * tiles[r] is always the visible tile for row r — no hidden extras.
 */
function buildGrid() {
  const g = $('grid');
  g.innerHTML = '';
  reelCols = [];

  const tileH = (g.getBoundingClientRect().height || 450 - (ROWS - 1) * 6) / ROWS;

  for (let c = 0; c < COLS; c++) {
    const col = document.createElement('div');
    col.className = 'reel-col';
    col.id = 'col_' + c;
    g.appendChild(col);

    const tiles = [];

    for (let r = 0; r < ROWS; r++) {
      const t = document.createElement('div');
      t.className  = 'reel-tile';
      t.style.cssText = `height:${tileH}px;position:absolute;left:0;right:0;top:${r * tileH}px;`;
      setTileSymbol(t, randSym());
      col.appendChild(t);
      tiles.push(t);
    }

    reelCols.push({ el: col, tiles, tileH });
  }
}


// ── Column spin animation ─────────────────────────────────────

/**
 * Animates one column scrolling in new symbols.
 *
 * Strategy:
 *   A temporary "incoming" strip is built above the column:
 *     [SCROLL_ROWS random symbols]  ← scroll fodder
 *     [ROWS final symbols]          ← will land in frame
 *     [ROWS current symbols]        ← currently visible, pushed out the bottom
 *
 *   The strip is positioned so the current symbols align with the column frame,
 *   then animated downward until the finals occupy the frame.
 *   The permanent tiles[] are updated and the strip removed at the end.
 *
 * @param {number}   c       - Column index
 * @param {string[]} finals  - Array of ROWS final symbol strings
 * @param {number}   dur     - Animation duration in ms
 */
async function rollColumn(c, finals, dur) {
  const { el: col, tiles, tileH } = reelCols[c];
  const SCROLL_ROWS = 8;
  const totalRows   = SCROLL_ROWS + ROWS + ROWS;  // fodder + finals + existing
  const totalH      = totalRows * tileH;

  // Build the incoming strip (positioned above the column)
  const strip = document.createElement('div');
  strip.style.cssText = 'position:absolute;left:0;right:0;';

  // Section 1: random scroll fodder
  for (let r = 0; r < SCROLL_ROWS; r++) {
    const t = document.createElement('div');
    t.className  = 'reel-tile';
    t.style.cssText = `height:${tileH}px;position:relative;`;
    setTileSymbol(t, randSym());
    strip.appendChild(t);
  }

  // Section 2: final symbols (will land in the visible frame)
  for (let r = 0; r < ROWS; r++) {
    const tf = document.createElement('div');
    tf.className  = 'reel-tile';
    tf.style.cssText = `height:${tileH}px;position:relative;`;
    setTileSymbol(tf, finals[r]);
    strip.appendChild(tf);
  }

  // Section 3: clone of current visible tiles (pushed out the bottom)
  for (let r = 0; r < ROWS; r++) {
    const tc = document.createElement('div');
    tc.className  = 'reel-tile';
    tc.style.cssText = `height:${tileH}px;position:relative;`;
    setTileSymbol(tc, tiles[r].querySelector('img')?.alt || tiles[r].textContent);
    strip.appendChild(tc);
  }

  // Position strip so Section 3 (existing) aligns with the column frame
  const startY = -(SCROLL_ROWS + ROWS) * tileH;
  const endY   = 0;  // finals in frame once strip reaches this position

  strip.style.top = startY + 'px';

  // Hide the permanent tiles while the strip is active
  tiles.forEach(t => t.style.visibility = 'hidden');
  col.appendChild(strip);

  // Animate strip downward — linear scroll, ease-out in last 20%
  await new Promise(resolve => {
    let startTime = null;

    function tick(ts) {
      if (!startTime) startTime = ts;
      const elapsed  = Math.min(ts - startTime, dur);
      const progress = elapsed / dur;

      const eased = progress < 0.8
        ? (progress / 0.8) * 0.8                                          // linear phase
        : 0.8 + (1 - (1 - (progress - 0.8) / 0.2) ** 2) * 0.2;          // ease-out phase

      strip.style.top = (startY + (endY - startY) * eased) + 'px';

      if (elapsed < dur) requestAnimationFrame(tick);
      else resolve();
    }

    requestAnimationFrame(tick);
  });

  // Snap finals into permanent tiles and remove the strip
  // Re-apply full inline style to guarantee position:absolute is never lost
  finals.forEach((s, r) => {
    tiles[r].innerHTML = '';
    setTileSymbol(tiles[r], s || '?');
    tiles[r].style.cssText = `height:${tileH}px;position:absolute;left:0;right:0;top:${r * tileH}px;`;
  });
  tiles.forEach(t => t.style.visibility = '');
  col.removeChild(strip);

  // Bounce settle
  await new Promise(resolve => {
    let st = null;
    const bounceH  = tileH * 0.055;
    const bounceMs = 130;

    function tick(ts) {
      if (!st) st = ts;
      const p = Math.min((ts - st) / bounceMs, 1);
      const y = bounceH * Math.sin(p * Math.PI);
      tiles.forEach((t, r) => { t.style.top = (r * tileH + y) + 'px'; });
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        tiles.forEach((t, r) => { t.style.top = (r * tileH) + 'px'; });
        resolve();  // cssText already set correctly in snap step above
      }
    }

    requestAnimationFrame(tick);
  });
}