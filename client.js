window.__ModuleLoader__.load({
  id: 'dsh-auto-snake',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    /**
     * dsh-auto-snake — client half.
     *
     * A neon Snake game the agent can play by itself, so a developer can lean
     * back and watch. The solver is a BFS-to-food search restricted to moves that
     * keep the snake's reachable free space at least as large as its own body,
     * which is what stops it from walling itself in.
     *
     * Everything is local to the browser: one canvas, one rAF loop, no Host RPC.
     */
    const React = require('react');
    const h = React.createElement;

    // ------------------------------------------------------------------ config

    const COLS = 24;
    const ROWS = 24;

    const MIN_STEP = 18;
    const MAX_STEP = 220;
    const DEFAULT_STEP = 80;

    const NS = 'dsh-auto-snake';
    const BEST_KEY = 'dsh.auto-snake.best';

    const DIRS = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    const FOOD_COLOURS = ['#ff4d6d', '#ffb703', '#4cc9f0', '#b5179e', '#80ed99'];

    /**
     * Solver knobs the user can tune.
     *
     * `margin` is the interesting one: it demands the move leave this many more
     * free cells than the body length. Raising it plays cautiously and takes long
     * routes; lowering it gets greedy and eventually traps itself.
     */
    const DEFAULT_TUNE = {
      margin: 0,
      lookahead: true,
      step: DEFAULT_STEP,
    };

    const CSS = `
.dsh-as { display: flex; flex-direction: column; gap: 10px; padding: 10px; height: 100%; box-sizing: border-box; overflow: auto; }
.dsh-as-hud { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.dsh-as-stat { display: flex; flex-direction: column; gap: 1px; min-width: 46px; }
.dsh-as-statlabel { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--dsw-alias-text-secondary); }
.dsh-as-statvalue { font-size: var(--dsw-font-size-md, 15px); font-weight: 700; font-variant-numeric: tabular-nums; color: var(--dsw-alias-text-primary); line-height: 1.1; }
.dsh-as-spacer { flex: 1; }
.dsh-as-btn { font: inherit; font-size: var(--dsw-font-size-sm, 12px); padding: 5px 11px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-subtle); background: var(--dsw-alias-bg-elevated); color: var(--dsw-alias-text-primary); cursor: pointer; transition: background 0.12s ease, transform 0.08s ease; white-space: nowrap; }
.dsh-as-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-hover); }
.dsh-as-btn:active:not(:disabled) { transform: translateY(1px); }
.dsh-as-btn:disabled { opacity: 0.45; cursor: default; }
.dsh-as-btn.primary { background: var(--dsw-alias-status-success, #3ba55d); border-color: transparent; color: #fff; font-weight: 600; }
.dsh-as-btn.ai { background: linear-gradient(135deg, #4cc9f0, #b5179e); border-color: transparent; color: #fff; font-weight: 600; }
.dsh-as-stage { position: relative; width: 100%; aspect-ratio: 1 / 1; max-height: 58vh; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid var(--dsw-alias-border-subtle); background: #0b0e17; box-shadow: inset 0 0 42px rgba(0,0,0,0.5); }
.dsh-as-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.dsh-as-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; text-align: center; padding: 16px; box-sizing: border-box; background: rgba(6,9,18,0.74); backdrop-filter: blur(3px); }
.dsh-as-overlaytitle { font-size: 20px; font-weight: 800; letter-spacing: 0.02em; background: linear-gradient(92deg, #4cc9f0, #b5179e 55%, #ffb703); -webkit-background-clip: text; background-clip: text; color: transparent; }
.dsh-as-overlaytext { font-size: var(--dsw-font-size-sm, 12px); color: #aab4d4; max-width: 250px; line-height: 1.5; }
.dsh-as-pad { display: grid; grid-template-columns: repeat(3, 40px); grid-template-rows: repeat(3, 34px); gap: 5px; justify-content: center; }
.dsh-as-dbtn { display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid var(--dsw-alias-border-subtle); background: var(--dsw-alias-bg-elevated); color: var(--dsw-alias-text-primary); font-size: 14px; cursor: pointer; user-select: none; -webkit-user-select: none; }
.dsh-as-dbtn:active { background: var(--dsw-alias-bg-hover); }
.dsh-as-dbtn.blank { visibility: hidden; }
.dsh-as-foot { display: flex; align-items: center; gap: 7px; font-size: 10px; color: var(--dsw-alias-text-secondary); flex-wrap: wrap; }
.dsh-as-badge { padding: 1px 6px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-subtle); font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; }
.dsh-as-badge.ai { background: linear-gradient(135deg, #4cc9f0, #b5179e); color: #fff; border-color: transparent; font-weight: 700; }
.dsh-as-tune { display: flex; flex-direction: column; gap: 8px; padding: 9px 11px; border: 1px solid var(--dsw-alias-border-subtle); border-radius: 9px; background: var(--dsw-alias-bg-elevated); }
.dsh-as-tunerow { display: flex; align-items: center; gap: 9px; font-size: 11px; color: var(--dsw-alias-text-primary); }
.dsh-as-tunerow label { min-width: 92px; }
.dsh-as-tunerow input[type=range] { flex: 1; min-width: 70px; accent-color: #4cc9f0; }
.dsh-as-tunerval { min-width: 42px; text-align: right; font-variant-numeric: tabular-nums; color: var(--dsw-alias-text-secondary); }
.dsh-as-tunehint { font-size: 10px; line-height: 1.5; color: var(--dsw-alias-text-secondary); }
.dsh-as-setrow { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-subtle); border-radius: 8px; background: var(--dsw-alias-bg-elevated); }
.dsh-as-settext { display: flex; flex-direction: column; gap: 2px; }
.dsh-as-settitle { font-size: var(--dsw-font-size-sm, 12px); font-weight: 500; color: var(--dsw-alias-text-primary); }
.dsh-as-setdesc { font-size: var(--dsw-font-size-xs, 11px); color: var(--dsw-alias-text-secondary); }
`;

    /** Idempotently add this plugin's stylesheet to the document head. */
    function ensureStyle() {
      const ID = 'dsh-auto-snake-style';
      if (document.getElementById(ID)) return;
      const el = document.createElement('style');
      el.id = ID;
      el.textContent = CSS;
      document.head.appendChild(el);
    }

    // -------------------------------------------------------------- game engine

    /**
     * Create an independent game state machine.
     *
     * @returns {object} the engine handle.
     */
    function createEngine() {
      let snake = [];
      let dir = DIRS[0];
      let pending = DIRS[0];
      let food = null;
      let foodTint = 0;
      let score = 0;
      let best = 0;
      let phase = 'idle';
      let deathCause = null;
      let particles = [];
      let popups = [];
      let shake = 0;
      let flash = 0;
      let time = 0;

      /** Put a fresh piece of food on a free cell. */
      function placeFood() {
        const occupied = new Set(snake.map((s) => s.x + ',' + s.y));
        const free = [];
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            if (!occupied.has(x + ',' + y)) free.push({ x, y });
          }
        }
        if (free.length === 0) {
          food = null;
          phase = 'dead';
          deathCause = 'perfect';
          return;
        }
        food = free[Math.floor(Math.random() * free.length)];
        foodTint = (foodTint + 1) % FOOD_COLOURS.length;
      }

      /**
       * Reset to the starting position.
       * @param {number} [carryBest] - best score to carry over.
       * @param {boolean} [autoStart] - start running immediately.
       */
      function reset(carryBest, autoStart) {
        const mid = Math.floor(ROWS / 2);
        snake = [
          { x: 5, y: mid },
          { x: 4, y: mid },
          { x: 3, y: mid },
        ];
        dir = DIRS[0];
        pending = DIRS[0];
        score = 0;
        particles = [];
        popups = [];
        shake = 0;
        flash = 0;
        deathCause = null;
        phase = autoStart ? 'running' : 'idle';
        if (typeof carryBest === 'number') best = carryBest;
        placeFood();
      }

      /**
       * Queue a direction change, ignoring reversals into the neck.
       * @param {{x: number, y: number}} next - requested direction.
       */
      function turn(next) {
        if (phase === 'dead') return;
        if (next.x === -pending.x && next.y === -pending.y) return;
        if (next.x === pending.x && next.y === pending.y) return;
        pending = next;
        if (phase === 'idle') phase = 'running';
      }

      /** Spawn a burst of particles at a board cell. */
      function burst(cx, cy, colour, n, power) {
        for (let i = 0; i < n; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const sp = (40 + Math.random() * 170) * power;
          const life = 0.32 + Math.random() * 0.4;
          particles.push({
            x: cx + 0.5,
            y: cy + 0.5,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 40,
            life,
            maxLife: life,
            colour: Math.random() > 0.3 ? colour : '#ff8fa3',
            size: 0.06 + Math.random() * 0.09,
          });
        }
      }

      /**
       * Advance one tick.
       * @returns {{ate: boolean, died: boolean}} what happened.
       */
      function step() {
        const outcome = { ate: false, died: false };
        if (phase !== 'running') return outcome;

        dir = pending;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        /** Wall or self collision ends the run. */
        const die = (cause) => {
          phase = 'dead';
          deathCause = cause;
          shake = 7;
          flash = 0.5;
          for (const s of snake.slice(0, 14)) burst(s.x, s.y, '#ff4d6d', 5, 1.2);
          outcome.died = true;
        };

        if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
          die('wall');
          return outcome;
        }
        // The tail tip vacates this tick, so it is not a collision target.
        const hitSelf = snake.some(
          (s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y,
        );
        if (hitSelf) {
          die('self');
          return outcome;
        }

        snake.unshift(head);
        if (food && head.x === food.x && head.y === food.y) {
          outcome.ate = true;
          score += 1;
          if (score > best) best = score;
          // A brief, small kick. Kept tiny and decayed smoothly in `tickFx` so
          // it reads as impact feedback, never as a shaking board.
          shake = Math.max(shake, Math.min(2.2, 1.2 + score * 0.05));
          burst(head.x, head.y, FOOD_COLOURS[foodTint], 16, 1.1);
          popups.push({ x: head.x + 0.5, y: head.y + 0.5, life: 0.9, text: '+1' });
          placeFood();
        } else {
          snake.pop();
        }
        return outcome;
      }

      /**
       * Advance the decorative effects.
       * @param {number} dt - seconds elapsed.
       */
      function tickFx(dt) {
        time += dt;
        for (let i = particles.length - 1; i >= 0; i -= 1) {
          const p = particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 8 * dt;
          p.vx *= 0.985;
          p.life -= dt;
          if (p.life <= 0) particles.splice(i, 1);
        }
        for (let i = popups.length - 1; i >= 0; i -= 1) {
          const q = popups[i];
          q.life -= dt;
          q.y -= 1.1 * dt;
          if (q.life <= 0) popups.splice(i, 1);
        }
        // ~0.13s to fall to 10%: a punchy kick that clears quickly.
        shake *= Math.pow(0.00005, dt);
        if (shake < 0.06) shake = 0;
        flash = Math.max(0, flash - dt * 2.4);
      }

      /** Clear decorative state so a fresh run starts clean. */
      function clearFx() {
        particles = [];
        popups = [];
        shake = 0;
        flash = 0;
      }

      return {
        reset,
        turn,
        step,
        burst,
        tickFx,
        clearFx,
        get snake() { return snake; },
        get food() { return food; },
        get foodColour() { return FOOD_COLOURS[foodTint]; },
        get dir() { return dir; },
        get pending() { return pending; },
        get score() { return score; },
        get phase() { return phase; },
        get best() { return best; },
        get deathCause() { return deathCause; },
        get particles() { return particles; },
        get popups() { return popups; },
        get shake() { return shake; },
        get flash() { return flash; },
        get time() { return time; },
        set best(v) { best = v; },
        togglePause() {
          if (phase === 'running') phase = 'paused';
          else if (phase === 'paused') phase = 'running';
        },
      };
    }

    // ------------------------------------------------------------------ the AI

    /**
     * Breadth-first shortest path from start to goal, avoiding `blocked`.
     *
     * @param {{x: number, y: number}} start - origin cell.
     * @param {{x: number, y: number}} goal - target cell.
     * @param {Set<string>} blocked - "x,y" keys that cannot be entered.
     * @returns {Array<{x: number, y: number}>|null} path including both ends.
     */
    function bfs(start, goal, blocked) {
      const key = (c) => c.x + ',' + c.y;
      if (start.x === goal.x && start.y === goal.y) return [start];
      const prev = new Map();
      const seen = new Set([key(start)]);
      const queue = [start];
      let head = 0;
      while (head < queue.length) {
        const cur = queue[head];
        head += 1;
        for (const d of DIRS) {
          const nx = cur.x + d.x;
          const ny = cur.y + d.y;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const k = nx + ',' + ny;
          if (blocked.has(k) || seen.has(k)) continue;
          seen.add(k);
          prev.set(k, cur);
          if (nx === goal.x && ny === goal.y) {
            const path = [{ x: nx, y: ny }];
            let node = cur;
            while (node.x !== start.x || node.y !== start.y) {
              path.push(node);
              node = prev.get(node.x + ',' + node.y);
              if (!node) break;
            }
            path.push(start);
            return path.reverse();
          }
          queue.push({ x: nx, y: ny });
        }
      }
      return null;
    }

    /**
     * Count free cells reachable from `start`, 4-connected.
     *
     * This is the safety yardstick: if the area the head can still roam is
     * smaller than the snake's own length, the run is about to end.
     *
     * @param {{x: number, y: number}} start - origin cell.
     * @param {Set<string>} blocked - occupied cells.
     * @returns {number} reachable free-cell count.
     */
    function floodArea(start, blocked) {
      const seen = new Set([start.x + ',' + start.y]);
      const queue = [start];
      let head = 0;
      while (head < queue.length) {
        const cur = queue[head];
        head += 1;
        for (const d of DIRS) {
          const nx = cur.x + d.x;
          const ny = cur.y + d.y;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const k = nx + ',' + ny;
          if (blocked.has(k) || seen.has(k)) continue;
          seen.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
      return seen.size;
    }

    /**
     * Choose the AI's next direction.
     *
     * For every legal move it simulates the resulting body, measures the free
     * space left to the head and whether the tail is still reachable, then picks
     * the safest move that gets closest to the food. This is the same criterion
     * that took the reference Python build to length 31 without dying.
     *
     * @param {object} engine - the game engine handle.
     * @param {object} tune - solver knobs.
     * @returns {{x: number, y: number}|null} the chosen direction, or null.
     */
    function chooseMove(engine, tune) {
      const snake = engine.snake;
      const head = snake[0];
      const food = engine.food;
      const pending = engine.pending;
      if (!head) return null;

      const legal = [];
      for (const d of DIRS) {
        if (d.x === -pending.x && d.y === -pending.y) continue;
        const n = { x: head.x + d.x, y: head.y + d.y };
        if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS) continue;
        // Ignore the tail tip: it moves out of the way on this same tick.
        let blocked = false;
        for (let i = 0; i < snake.length - 1; i += 1) {
          if (snake[i].x === n.x && snake[i].y === n.y) { blocked = true; break; }
        }
        if (blocked) continue;
        legal.push({ d, n });
      }
      if (legal.length === 0) return null;

      const scored = legal.map(({ d, n }) => {
        const ate = food && n.x === food.x && n.y === food.y;
        // Body after the move, with the tail dropped when not growing.
        const body = ate ? [n].concat(snake) : [n].concat(snake.slice(0, -1));
        const occ = new Set(body.map((s) => s.x + ',' + s.y));
        const space = floodArea(n, occ);
        const tailCell = body[body.length - 1];

        // Geometric safety: room to manoeuvre must exceed the body length by
        // the tuned margin, and the tail must stay reachable.
        const roomOk = space >= body.length + tune.margin;
        const tailOk = tune.lookahead
          ? bfs(
              n,
              tailCell,
              new Set([...occ].filter((k) => k !== tailCell.x + ',' + tailCell.y)),
            ) !== null
          : true;

        const goal = food || tailCell;
        const freeForPath = new Set(occ);
        freeForPath.delete(goal.x + ',' + goal.y);
        const path = bfs(n, goal, freeForPath);
        const dist = path ? path.length : Number.MAX_SAFE_INTEGER;

        return { d, safe: roomOk && tailOk, dist, space };
      });

      const safe = scored.filter((s) => s.safe);
      const pool = safe.length > 0 ? safe : scored;

      // Prefer the shortest safe route to the food; tie-break on more space.
      pool.sort((a, b) => (a.dist !== b.dist ? a.dist - b.dist : b.space - a.space));
      return pool[0].d;
    }

    /**
     * One AI decision for the current tick, if the engine is running.
     *
     * Kept separate from the view so the solver is testable in isolation.
     *
     * @param {object} engine - the game engine handle.
     * @param {object} tune - solver knobs.
     * @returns {{x: number, y: number}|null} the chosen direction, or null.
     */
    function aiMove(engine, tune) {
      if (engine.phase !== 'running') return null;
      return chooseMove(engine, tune);
    }

    // ------------------------------------------------------------------ drawing

    /**
     * Paint one frame.
     *
     * Geometry comes from the element's own CSS box each frame, so the board
     * stays square and crisp across resize, zoom and DPR changes with no
     * ResizeObserver bookkeeping.
     *
     * @param {HTMLCanvasElement} canvas - target canvas.
     * @param {object} engine - the game engine handle.
     */
    function draw(canvas, engine) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssSize = Math.max(1, Math.min(rect.width, rect.height));
      const px = Math.round(cssSize * dpr);
      if (canvas.width !== px || canvas.height !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cell = px / COLS;

      // Smooth damped oscillation. A fresh random offset every frame at 60fps
      // reads as violent vibration, so the shake is a waveform, not noise.
      const shake = engine.shake;
      let ox = 0;
      let oy = 0;
      if (shake > 0) {
        const ph = engine.time * 46;
        ox = Math.sin(ph) * shake * cell * 0.16;
        oy = Math.cos(ph * 1.37) * shake * cell * 0.1;
      }
      ctx.save();
      ctx.translate(ox, oy);

      // Board backdrop: a soft vertical gradient.
      const bg = ctx.createLinearGradient(0, 0, 0, px);
      bg.addColorStop(0, '#111629');
      bg.addColorStop(1, '#0b0e17');
      ctx.fillStyle = bg;
      ctx.fillRect(-cell, -cell, px + cell * 2, px + cell * 2);

      // Subtle checker so motion reads clearly.
      ctx.fillStyle = 'rgba(255,255,255,0.016)';
      for (let y = 0; y < ROWS; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      // Grid lines.
      ctx.strokeStyle = 'rgba(120,150,220,0.075)';
      ctx.lineWidth = Math.max(1, cell * 0.02);
      for (let i = 1; i < COLS; i += 1) {
        ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, px); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(px, i * cell); ctx.stroke();
      }

      // Screen flash on death.
      if (engine.flash > 0) {
        ctx.fillStyle = 'rgba(255,77,109,' + (engine.flash * 0.5).toFixed(3) + ')';
        ctx.fillRect(0, 0, px, px);
      }

      // Food: a pulsing gem with a layered halo.
      if (engine.food) {
        const t = (engine.time % 1.1) / 1.1;
        const pulse = 0.84 + Math.sin(t * Math.PI * 2) * 0.16;
        const fx = engine.food.x * cell + cell / 2;
        const fy = engine.food.y * cell + cell / 2;
        const r = (cell / 2) * 0.62 * pulse;
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = engine.foodColour;
        ctx.beginPath(); ctx.arc(fx, fy, r * 2.1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = engine.foodColour;
        ctx.shadowBlur = cell * 0.9;
        ctx.fillStyle = engine.foodColour;
        ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(fx - r * 0.3, fy - r * 0.32, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles.
      for (const p of engine.particles) {
        const f = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = 0.15 + 0.85 * f;
        ctx.fillStyle = p.colour;
        ctx.beginPath();
        ctx.arc(p.x * cell, p.y * cell, Math.max(0.5, p.size * cell * f), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Snake: hue ramp teal -> magenta from head to tail.
      const n = engine.snake.length;
      const pad = Math.max(1, cell * 0.09);
      for (let i = n - 1; i >= 0; i -= 1) {
        const seg = engine.snake[i];
        const f = n === 1 ? 0 : i / (n - 1);
        const hue = 186 + f * 130;
        const light = 62 - f * 20;
        const x = seg.x * cell + pad;
        const y = seg.y * cell + pad;
        const w = cell - pad * 2;
        ctx.save();
        if (i === 0) {
          ctx.shadowColor = 'hsl(' + hue + ' 92% 62%)';
          ctx.shadowBlur = cell * 0.8;
        }
        ctx.fillStyle = 'hsl(' + hue + ' 80% ' + light + '%)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, w, Math.max(1.5, w * (i === 0 ? 0.42 : 0.3)));
        } else {
          ctx.rect(x, y, w, w);
        }
        ctx.fill();
        ctx.restore();
      }

      // Eyes on the head, oriented by the current direction.
      if (n > 0) {
        const head = engine.snake[0];
        const cx = head.x * cell + cell / 2;
        const cy = head.y * cell + cell / 2;
        const d = engine.dir;
        const off = cell * 0.17;
        const eyeR = Math.max(1, cell * 0.085);
        const ex = d.x !== 0 ? 0 : off;
        const ey = d.y !== 0 ? 0 : off;
        const fwd = cell * 0.13;
        ctx.fillStyle = '#0b1220';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + d.x * fwd + ex * s, cy + d.y * fwd + ey * s, eyeR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Score popups ride above everything.
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.max(9, cell * 0.5) + 'px ui-monospace, monospace';
      for (const q of engine.popups) {
        const f = Math.max(0, q.life / 0.9);
        ctx.globalAlpha = 0.25 + 0.75 * f;
        ctx.fillStyle = '#4cc9f0';
        ctx.fillText(q.text, q.x * cell, q.y * cell);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // --------------------------------------------------------------- persistence

    /** Read the persisted best score, tolerating a blocked localStorage. */
    function readBest() {
      try {
        const n = Number.parseInt(window.localStorage.getItem(BEST_KEY) || '0', 10);
        return Number.isFinite(n) && n > 0 ? n : 0;
      } catch {
        return 0;
      }
    }

    /** Persist the best score, ignoring storage failures. */
    function writeBest(value) {
      try {
        window.localStorage.setItem(BEST_KEY, String(value));
      } catch {
        /* private mode or quota: the score simply does not persist */
      }
    }

    // ------------------------------------------------------------------ react view

    /**
     * The game panel body, mounted into `sidebar.right.pane.tab` for kind
     * `auto-snake`.
     *
     * The engine lives in a ref so re-renders never reset the run. One rAF loop
     * drives both the tick and the paint, and is torn down on unmount. When AI
     * mode is on the loop steers before each step, which is what makes the
     * difference between a demo and a run that survives.
     *
     * @returns {object} React element tree.
     */
    function AutoSnakePanel() {
      ensureStyle();
      const canvasRef = React.useRef(null);
      const engineRef = React.useRef(null);
      if (engineRef.current === null) {
        const engine = createEngine();
        engine.reset(readBest(), false);
        engineRef.current = engine;
      }
      const engine = engineRef.current;

      // The AI toggle and knobs are React state; the loop reads them through a
      // ref so changing a slider never restarts the rAF loop.
      const [ai, setAi] = React.useState(false);
      const [tune, setTune] = React.useState(DEFAULT_TUNE);
      const tuneRef = React.useRef(tune);
      tuneRef.current = tune;
      const aiRef = React.useRef(ai);
      aiRef.current = ai;

      const [, tick] = React.useState(0);
      const bestRef = React.useRef(engine.best);
      /** Rolling AI statistics shown under the board. */
      const [stats, setStats] = React.useState({ runs: 0, deaths: { wall: 0, self: 0 }, peak: 0 });
      const statsRef = React.useRef(stats);
      statsRef.current = stats;

      /** Restart the run, keeping the best score banked so far. */
      const restart = React.useCallback((autoStart) => {
        engine.reset(bestRef.current, autoStart === undefined ? aiRef.current : autoStart);
        tick((v) => v + 1);
      }, [engine]);

      // Keyboard: arrows and WASD steer, Space pauses, R restarts. Bound on the
      // window only while mounted, and ignored while typing in a field.
      React.useEffect(() => {
        const onKey = (event) => {
          const t = event.target;
          const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
          if (typing) return;
          const k = event.key;
          let handled = true;
          // Any manual steering takes the wheel back from the AI.
          const manual = () => { if (aiRef.current) setAi(false); };
          if (k === 'ArrowUp' || k === 'w' || k === 'W') { manual(); engine.turn(DIRS[3]); }
          else if (k === 'ArrowDown' || k === 's' || k === 'S') { manual(); engine.turn(DIRS[2]); }
          else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { manual(); engine.turn(DIRS[1]); }
          else if (k === 'ArrowRight' || k === 'd' || k === 'D') { manual(); engine.turn(DIRS[0]); }
          else if (k === ' ') engine.togglePause();
          else if (k === 'r' || k === 'R') { restart(); return; }
          else handled = false;
          if (handled) event.preventDefault();
          tick((v) => v + 1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [engine, restart]);

      // The main loop: advance the simulation on the tuned cadence, let the AI
      // steer when it is on, and paint every animation frame.
      React.useEffect(() => {
        let raf = 0;
        let last = performance.now();
        let lastStep = last;
        const loop = (now) => {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          engine.tickFx(dt);

          const interval = tuneRef.current.step;
          if (now - lastStep >= interval) {
            lastStep = now;
            if (aiRef.current) {
              const d = aiMove(engine, tuneRef.current);
              if (d) engine.turn(d);
            }
            const result = engine.step();
            if (result.died) {
              if (engine.best > bestRef.current) {
                bestRef.current = engine.best;
                writeBest(engine.best);
              }
              const cause = engine.deathCause;
              setStats((s) => ({
                runs: s.runs + 1,
                peak: Math.max(s.peak, engine.score),
                deaths: {
                  wall: s.deaths.wall + (cause === 'wall' ? 1 : 0),
                  self: s.deaths.self + (cause === 'self' ? 1 : 0),
                },
              }));
              // In AI mode, automatically start the next run: the point is to
              // sit back and watch, not to keep clicking.
              if (aiRef.current) {
                setTimeout(() => {
                  if (aiRef.current && engine.phase === 'dead') restart(true);
                }, 700);
              }
              tick((v) => v + 1);
            } else if (result.ate) {
              tick((v) => v + 1);
            }
          }
          const canvas = canvasRef.current;
          if (canvas) draw(canvas, engine);
          raf = window.requestAnimationFrame(loop);
        };
        raf = window.requestAnimationFrame(loop);
        return () => window.cancelAnimationFrame(raf);
      }, [engine, restart]);

      // On unmount, bank any improvement so the best score survives the tab.
      React.useEffect(() => () => {
        if (engine.best > bestRef.current) writeBest(engine.best);
      }, [engine]);

      /** Toggle AI autopilot, starting a run if the board is idle or dead. */
      const toggleAi = () => {
        const next = !ai;
        setAi(next);
        if (next && engine.phase !== 'running') restart(true);
        if (next) setStats((s) => ({ ...s, runs: s.runs }));
        tick((v) => v + 1);
      };

      /** Update one solver knob. */
      const setKnob = (k, v) => {
        setTune((t) => {
          const next = { ...t, [k]: v };
          tuneRef.current = next;
          return next;
        });
      };

      const phase = engine.phase;
      const best = Math.max(bestRef.current, engine.best);
      const lost = stats.deaths.wall + stats.deaths.self;

      const overlay = phase === 'idle' || phase === 'paused' || phase === 'dead'
        ? h('div', { className: 'dsh-as-overlay' },
            h('div', { className: 'dsh-as-overlaytitle' },
              phase === 'dead' ? 'Game Over' : phase === 'paused' ? 'Paused' : 'Auto Snake'),
            h('div', { className: 'dsh-as-overlaytext' },
              phase === 'dead'
                ? (ai
                    ? 'Scored ' + engine.score + '. Restarting\u2026'
                    : 'Scored ' + engine.score + '. Hit Play Again, or hand it to the AI.')
                : phase === 'paused'
                  ? 'Take your time. Space resumes.'
                  : 'Let the AI drive, or steer with the arrow keys. Every gem is +1.'),
            h('button', {
              type: 'button',
              className: 'dsh-as-btn primary',
              onClick: phase === 'paused'
                ? () => { engine.togglePause(); tick((v) => v + 1); }
                : () => restart(),
            }, phase === 'dead' ? 'Play Again' : phase === 'paused' ? 'Resume' : 'Start'),
          )
        : null;

      return h('div', { className: 'dsh-as' },
        h('div', { className: 'dsh-as-hud' },
          h('div', { className: 'dsh-as-stat' },
            h('div', { className: 'dsh-as-statlabel' }, 'Score'),
            h('div', { className: 'dsh-as-statvalue' }, String(engine.score))),
          h('div', { className: 'dsh-as-stat' },
            h('div', { className: 'dsh-as-statlabel' }, 'Best'),
            h('div', { className: 'dsh-as-statvalue' }, String(best))),
          h('div', { className: 'dsh-as-stat' },
            h('div', { className: 'dsh-as-statlabel' }, 'Length'),
            h('div', { className: 'dsh-as-statvalue' }, String(engine.snake.length))),
          h('div', { className: 'dsh-as-spacer' }),
          h('button', {
            type: 'button',
            className: ai ? 'dsh-as-btn ai' : 'dsh-as-btn',
            onClick: toggleAi,
            title: 'Let the solver play by itself',
          }, ai ? '\u25A0 Stop AI' : '\u25B6 Auto-play'),
          h('button', {
            type: 'button',
            className: 'dsh-as-btn',
            disabled: phase === 'dead' || phase === 'idle',
            onClick: () => { engine.togglePause(); tick((v) => v + 1); },
          }, phase === 'paused' ? 'Resume' : 'Pause'),
        ),
        h('div', { className: 'dsh-as-stage' },
          h('canvas', { className: 'dsh-as-canvas', ref: canvasRef }),
          overlay,
        ),
        h('div', { className: 'dsh-as-foot' },
          h('span', { className: ai ? 'dsh-as-badge ai' : 'dsh-as-badge' }, ai ? 'AI driving' : 'Manual'),
          h('span', null, 'Len ' + engine.snake.length),
          h('span', null, '\u00b7'),
          h('span', null, (1000 / tune.step).toFixed(1) + ' steps/s'),
          h('span', null, '\u00b7'),
          h('span', null,
            phase === 'running' ? 'Running'
              : phase === 'paused' ? 'Paused'
                : phase === 'dead' ? (engine.deathCause === 'wall' ? 'Wall' : engine.deathCause === 'self' ? 'Self' : 'Stopped')
                  : 'Ready'),
        ),
        h('div', { className: 'dsh-as-tune' },
          h('div', { className: 'dsh-as-tunerow' },
            h('label', { htmlFor: 'dsh-as-margin' }, 'Safety margin'),
            h('input', {
              id: 'dsh-as-margin',
              type: 'range',
              min: 0,
              max: 60,
              step: 1,
              value: tune.margin,
              onChange: (e) => setKnob('margin', Number(e.target.value)),
            }),
            h('span', { className: 'dsh-as-tunerval' }, String(tune.margin)),
          ),
          h('div', { className: 'dsh-as-tunerow' },
            h('label', { htmlFor: 'dsh-as-speed' }, 'Speed'),
            h('input', {
              id: 'dsh-as-speed',
              type: 'range',
              min: MIN_STEP,
              max: MAX_STEP,
              step: 2,
              value: tune.step,
              onChange: (e) => setKnob('step', Number(e.target.value)),
            }),
            h('span', { className: 'dsh-as-tunerval' }, tune.step + 'ms'),
          ),
          h('div', { className: 'dsh-as-tunerow' },
            h('label', { htmlFor: 'dsh-as-look' }, 'Tail lookahead'),
            h('input', {
              id: 'dsh-as-look',
              type: 'checkbox',
              checked: tune.lookahead,
              onChange: (e) => setKnob('lookahead', e.target.checked),
            }),
            h('span', { className: 'dsh-as-spacer' }),
          ),
          h('div', { className: 'dsh-as-tunehint' },
            'Safety margin demands the move leave that many more free cells than the body length. '
            + 'Higher plays cautiously and takes long routes; at 0 it is greedy. Tail lookahead also '
            + 'requires a path back to the tail, which is what stops it walling itself in.'),
        ),
        h('div', { className: 'dsh-as-foot' },
          h('span', null, 'AI runs ' + stats.runs),
          h('span', null, '\u00b7'),
          h('span', null, 'peak ' + stats.peak),
          h('span', null, '\u00b7'),
          h('span', null, 'deaths ' + lost + (lost > 0 ? ' (wall ' + stats.deaths.wall + ' / self ' + stats.deaths.self + ')' : '')),
        ),
        h('div', { className: 'dsh-as-pad' },
          h('div', { className: 'dsh-as-dbtn blank' }),
          h('div', { className: 'dsh-as-dbtn', onPointerDown: (e) => { e.preventDefault(); setAi(false); engine.turn(DIRS[3]); tick((v) => v + 1); } }, '\u2191'),
          h('div', { className: 'dsh-as-dbtn blank' }),
          h('div', { className: 'dsh-as-dbtn', onPointerDown: (e) => { e.preventDefault(); setAi(false); engine.turn(DIRS[1]); tick((v) => v + 1); } }, '\u2190'),
          h('div', { className: 'dsh-as-dbtn', onPointerDown: (e) => { e.preventDefault(); engine.togglePause(); tick((v) => v + 1); } }, phase === 'paused' ? '\u25B6' : '\u23F8'),
          h('div', { className: 'dsh-as-dbtn', onPointerDown: (e) => { e.preventDefault(); setAi(false); engine.turn(DIRS[0]); tick((v) => v + 1); } }, '\u2192'),
          h('div', { className: 'dsh-as-dbtn blank' }),
          h('div', { className: 'dsh-as-dbtn', onPointerDown: (e) => { e.preventDefault(); setAi(false); engine.turn(DIRS[2]); tick((v) => v + 1); } }, '\u2193'),
          h('div', { className: 'dsh-as-dbtn blank' }),
        ),
      );
    }

    // ------------------------------------------------------------------- config

    /**
     * The bundle's row on Settings -> Plugins.
     *
     * Shows the persisted high score and clears it. The game needs no
     * configuration of its own, so this stays deliberately small.
     *
     * @returns {object} React element tree.
     */
    function AutoSnakeConfig() {
      ensureStyle();
      const [best, setBest] = React.useState(() => readBest());
      return h('div', { className: 'dsh-as-setrow' },
        h('div', { className: 'dsh-as-settext' },
          h('div', { className: 'dsh-as-settitle' }, 'High score'),
          h('div', { className: 'dsh-as-setdesc' },
            best > 0 ? 'Best AI run so far: ' + best + ' gems.' : 'No runs recorded in this browser yet.'),
        ),
        h('div', { className: 'dsh-as-spacer' }),
        h('button', {
          type: 'button',
          className: 'dsh-as-btn',
          disabled: best === 0,
          onClick: () => { writeBest(0); setBest(0); },
        }, 'Reset'),
      );
    }

    // ---------------------------------------------------------------- lifecycle

    const inject = ['slots'];

    /**
     * Register the panel and the settings row.
     *
     * @param {object} ctx - the Cordis client context.
     */
    function apply(ctx) {
      // `sidebar.right.pane.tab` is a KEYED slot, so the dispatch option is
      // `key` (not `id`, which belongs to list slots), and its value is the tab
      // type definition's id.
      ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab',
        key: 'auto-snake',
      }, AutoSnakePanel));

      // The row on this bundle's page in Settings -> Plugins, keyed by package
      // name and rendered with `view: 'page'`.
      ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
        name: 'plugins.bundle.config',
        key: 'dsh-auto-snake',
      }, AutoSnakeConfig));
    }

    exports.name = NS;
    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});

