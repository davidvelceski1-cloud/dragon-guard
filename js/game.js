/* Dragon Guard – core game state and rules (no drawing here, see render.js). */
(function () {
  'use strict';
  const C = DG.CONFIG;
  const COLORS = C.COLOR_ORDER;

  const G = (DG.Game = {
    state: 'menu',     // 'menu' | 'playing' | 'paused' | 'complete' | 'gameover'
    mode: 'level',     // 'level' | 'endless'
    levelIndex: 0,     // 0-based index into DG.LEVELS
    wave: 1,           // endless wave number
    run: null,         // everything about the level being played (see newRun)
    clock: 0,          // animation clock, frozen while paused
    menuDragons: []    // decorative dragons behind the title screen
  });

  const laneX = (lane) => C.LANE_W * (lane + 0.5);
  const sumAmmo = (a) => COLORS.reduce((s, c) => s + a[c], 0);
  const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];
  G.laneX = laneX;

  // ------------------------------------------------------------------ effects
  function burst(r, x, y, color, n, speed, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      const life = 0.4 + Math.random() * 0.5;
      r.particles.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 260,
        life: life, max: life, color: color, size: (size || 3) * (0.6 + Math.random() * 0.8)
      });
    }
  }

  function floatText(r, x, y, text, color, size) {
    r.texts.push({ x: x, y: y, text: text, color: color || '#fff', size: size || 16, life: 1.1, max: 1.1 });
  }

  function banner(r, text, sub, life) {
    r.banner = { text: text, sub: sub || '', life: life || 1.6, max: life || 1.6 };
  }

  // ------------------------------------------------------------------ setup
  /** Fresh per-level state. `carry` keeps score/hearts/ammo between endless waves. */
  function newRun(level, carry) {
    const r = {
      level: level,
      pending: level.dragons.map((d) => ({ t: d.t, lane: d.lane, layers: d.layers.slice() }))
        .sort((a, b) => a.t - b.t),
      dragons: [], balls: [], particles: [], texts: [], beams: [],
      ammo: Object.assign({}, level.ammo),
      startAmmo: null,
      hearts: C.HEARTS,
      score: 0,
      streak: 0,
      volleyReady: false,
      time: -C.START_DELAY,
      selected: null,
      shake: 0, flash: 0, flinch: 0,
      banner: null,
      hint: level.hint,
      hintTime: level.hint ? C.HINT_TIME : 0,
      outcome: null,     // null | 'win' | 'wave' | 'hearts' | 'ammo'
      endTimer: 0,
      wrongShots: 0,
      roarCooldown: 0,
      totalLayers: level.dragons.reduce((s, d) => s + d.layers.length, 0)
    };
    if (carry) {
      r.hearts = carry.hearts;
      r.score = carry.score;
      r.streak = carry.streak;
      r.volleyReady = carry.volleyReady;
      r.selected = carry.selected;
      COLORS.forEach((c) => (r.ammo[c] += carry.ammo[c]));
    }
    r.startAmmo = Object.assign({}, r.ammo);
    return r;
  }

  G.initMenu = function () {
    this.menuDragons = [0, 1, 2, 3].map((l) => ({
      lane: l, x: laneX(l), y: 60 + Math.random() * 300,
      layers: [randColor()], phase: Math.random() * 6.28,
      boost: 0, hitFlash: 0, speed: 14 + Math.random() * 12
    }));
  };

  G.startLevel = function (index) {
    this.mode = 'level';
    this.levelIndex = index;
    this.run = newRun(DG.getLevel(index));
    banner(this.run, 'Level ' + (index + 1), this.run.level.name, C.START_DELAY);
    this.state = 'playing';
    DG.UI.hideAll();
  };

  G.startEndless = function () {
    this.mode = 'endless';
    this.wave = 1;
    this.run = newRun(DG.generateEndlessWave(1));
    this.run.hint = 'Endless mode: waves keep getting faster. How long can you last?';
    this.run.hintTime = C.HINT_TIME;
    banner(this.run, 'Endless Mode', 'Wave 1', C.START_DELAY);
    this.state = 'playing';
    DG.UI.hideAll();
  };

  G.playFromTitle = function () {
    const u = DG.Save.data.unlocked;
    if (u > DG.LEVELS.length) this.startEndless();
    else this.startLevel(u - 1);
  };

  G.retry = function () {
    if (this.mode === 'endless') this.startEndless();
    else this.startLevel(this.levelIndex);
  };

  G.next = function () {
    if (this.levelIndex < DG.LEVELS.length - 1) this.startLevel(this.levelIndex + 1);
    else this.startEndless();
  };

  G.toMenu = function () {
    this.state = 'menu';
    this.run = null;
    DG.UI.refreshTitle();
    DG.UI.show('title');
  };

  G.pause = function () {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    DG.UI.show('pause');
  };

  G.resume = function () {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    DG.UI.hideAll();
  };

  // ------------------------------------------------------------------ queries
  /** Lowest (closest to the castle) dragon in a lane that can be shot, or null. */
  G.lowestTarget = function (r, lane) {
    let best = null;
    for (const d of r.dragons) {
      if (d.lane === lane && d.y >= C.FIELD_TOP + 6 && (!best || d.y > best.y)) best = d;
    }
    return best;
  };

  // ------------------------------------------------------------------ player actions
  G.handleTap = function (x, y) {
    if (this.state !== 'playing') return;
    const r = this.run;
    if (y < C.HUD_H) {
      if (x < 64) this.pause();
      return;
    }
    if (y < C.FIELD_TOP) {           // Royal Volley row
      if (r.volleyReady) this.useVolley();
      return;
    }
    const col = Math.max(0, Math.min(C.LANES - 1, Math.floor(x / C.LANE_W)));
    if (y >= C.CANNON_TOP) this.selectCannon(COLORS[col]);
    else this.fire(col);
  };

  G.selectCannon = function (color) {
    const r = this.run;
    if (!r || r.outcome) return;
    const x = laneX(COLORS.indexOf(color));
    if (r.startAmmo[color] === 0) {
      floatText(r, x, C.CANNON_TOP - 14, 'Not needed', 'rgba(255,255,255,0.8)', 12);
      DG.Audio.play('empty');
      return;
    }
    if (r.ammo[color] === 0) {
      floatText(r, x, C.CANNON_TOP - 14, 'Empty!', '#ffb4b4', 14);
      DG.Audio.play('empty');
      return;
    }
    r.selected = color;
    DG.Audio.play('select');
  };

  G.fire = function (lane) {
    const r = this.run;
    if (!r || r.outcome) return;
    const x = laneX(lane);
    const msgY = C.WALL_TOP - 70;
    if (!r.selected) {
      floatText(r, x, msgY, 'Pick a cannon!', '#fff', 14);
      DG.Audio.play('empty');
      return;
    }
    const c = r.selected;
    if (r.ammo[c] <= 0) {
      floatText(r, x, msgY, 'No ' + C.COLORS[c].name + ' left!', '#ffb4b4', 14);
      DG.Audio.play('empty');
      return;
    }
    if (!this.lowestTarget(r, lane)) {         // don't waste ammo on an empty lane
      floatText(r, x, msgY, 'No dragon', 'rgba(255,255,255,0.8)', 13);
      return;
    }
    r.ammo[c]--;
    const cx = laneX(COLORS.indexOf(c));
    r.balls.push({ color: c, lane: lane, x: cx, y: C.CANNON_TOP + 12, tx: x });
    burst(r, cx, C.CANNON_TOP + 12, '#fff3c4', 8, 120, 2.5);
    r.shake = Math.max(r.shake, 1.5);
    DG.Audio.play('shot');
  };

  G.useVolley = function () {
    const r = this.run;
    if (!r || !r.volleyReady || r.outcome) return;
    const targets = [];
    for (let l = 0; l < C.LANES; l++) {
      const d = this.lowestTarget(r, l);
      if (d) targets.push(d);
    }
    if (!targets.length) {
      floatText(r, C.W / 2, C.FIELD_TOP + 40, 'No dragons in range', '#fff', 14);
      return;
    }
    for (let l = 0; l < C.LANES; l++) r.beams.push({ lane: l, life: 0.7, max: 0.7 });
    targets.forEach((d) => defeat(r, d, C.SCORE.volleyPerLayer * d.layers.length, d.layers[0]));
    r.volleyReady = false;
    r.streak = 0;
    r.shake = Math.max(r.shake, 10);
    DG.Audio.play('volley');
  };

  // ------------------------------------------------------------------ hits
  function resolveHit(r, ball, d) {
    const c = d.layers[0];
    if (c === ball.color) {
      d.layers.shift();
      d.hitFlash = 0.15;
      burst(r, d.x, d.y, C.COLORS[c].main, 18, 220, 3.5);
      burst(r, d.x, d.y, '#ffffff', 6, 150, 2);
      r.score += C.SCORE.layer;
      r.streak++;
      r.shake = Math.max(r.shake, 4);
      if (!r.volleyReady && r.streak >= C.VOLLEY_STREAK) {
        r.volleyReady = true;
        DG.Audio.play('volleyReady');
        floatText(r, C.W / 2, C.FIELD_TOP + 34, 'Royal Volley ready!', '#ffd54f', 17);
      }
      if (d.layers.length === 0) {
        defeat(r, d, C.SCORE.dragonPerLayer * d.maxLayers, c);
      } else {
        DG.Audio.play('hit');
        floatText(r, d.x, d.y - 34, '+' + C.SCORE.layer, '#ffffff', 14);
      }
    } else {
      // Wrong colour: shot wasted, streak lost, dragon gets angry and fast
      r.streak = 0;
      r.wrongShots++;
      d.boost = C.WRONG_BOOST_TIME;
      d.hitFlash = 0.08;
      burst(r, d.x, d.y + 10, '#8a8a8a', 8, 90, 3);
      floatText(r, d.x, d.y - 34, 'Wrong colour!', '#ff8a80', 14);
      DG.Audio.play('wrong');
    }
  }

  function defeat(r, d, points, color) {
    const i = r.dragons.indexOf(d);
    if (i >= 0) r.dragons.splice(i, 1);
    r.score += points;
    burst(r, d.x, d.y, '#ffd54f', 20, 260, 3);
    burst(r, d.x, d.y, C.COLORS[color].light, 14, 200, 4);
    floatText(r, d.x, d.y - 20, '+' + points, '#ffd54f', 18);
    r.shake = Math.max(r.shake, 7);
    DG.Audio.play('defeat');
  }

  function dragonReachedWall(r, d) {
    burst(r, d.x, d.y + 10, '#ff6b6b', 24, 240, 4);
    burst(r, d.x, d.y + 10, C.COLORS[d.layers[0]].main, 12, 200, 3);
    if (r.outcome) return;                       // level already decided
    r.hearts--;
    r.flash = 1;
    r.flinch = 1.2;
    r.shake = 12;
    r.streak = 0;
    DG.Audio.play('roar');
    floatText(r, d.x, C.WALL_TOP - 60, '-1 ♥', '#ff4d6d', 20);
    if (r.hearts <= 0) setOutcome(r, 'hearts');
  }

  function setOutcome(r, kind) {
    r.outcome = kind;
    r.selected = kind === 'wave' ? r.selected : null;
    if (kind === 'win') { r.endTimer = C.END_DELAY_WIN; banner(r, 'Victory!', 'The royals are safe', 1.4); DG.Audio.play('win'); }
    if (kind === 'wave') { r.endTimer = C.END_DELAY_WIN; banner(r, 'Wave cleared!', '', 1.4); DG.Audio.play('win'); }
    if (kind === 'hearts') { r.endTimer = C.END_DELAY_FAIL; banner(r, 'Oh no!', 'The castle has fallen', 1.3); }
    if (kind === 'ammo') { r.endTimer = C.END_DELAY_FAIL; banner(r, 'Out of ammo!', 'Not enough cannonballs left', 1.3); }
  }

  /**
   * "No ammo left" check: fails the level when the remaining cannonballs can no longer
   * beat every remaining armour layer, and no Royal Volley is ready or still reachable.
   */
  function checkAmmo(r) {
    const need = {}, inFlight = {};
    COLORS.forEach((c) => { need[c] = 0; inFlight[c] = 0; });
    r.pending.forEach((d) => d.layers.forEach((c) => need[c]++));
    r.dragons.forEach((d) => d.layers.forEach((c) => need[c]++));
    r.balls.forEach((b) => inFlight[b.color]++);

    let deficit = false;
    let possibleHits = r.streak;                 // how far the streak could still climb
    COLORS.forEach((c) => {
      const avail = r.ammo[c] + inFlight[c];
      if (need[c] > avail) deficit = true;
      possibleHits += Math.min(need[c], avail);
    });
    if (deficit && !r.volleyReady && possibleHits < C.VOLLEY_STREAK) setOutcome(r, 'ammo');
  }

  // ------------------------------------------------------------------ results
  G.finishLevel = function () {
    const r = this.run;
    const ammoLeft = sumAmmo(r.ammo);
    const heartBonus = r.hearts * C.SCORE.heart;
    const ammoBonus = ammoLeft * C.SCORE.ammo;
    r.score += heartBonus + ammoBonus;

    // Stars: 1 for winning, +1 for no hearts lost, +1 for saving ammo
    // (on exact-ammo levels, +1 for never firing a wrong colour instead)
    const spare = Math.max(0, sumAmmo(r.startAmmo) - r.totalLayers);
    let stars = 1;
    if (r.hearts >= C.HEARTS) stars++;
    if (spare === 0 ? r.wrongShots === 0 : ammoLeft >= Math.ceil(spare / 2)) stars++;

    const save = DG.Save.data;
    const key = String(this.levelIndex + 1);
    const prev = save.best[key] || { score: 0, stars: 0 };
    const newBest = r.score > prev.score;
    save.best[key] = { score: Math.max(prev.score, r.score), stars: Math.max(prev.stars, stars) };
    save.unlocked = Math.max(save.unlocked, this.levelIndex + 2);
    DG.Save.save();

    this.state = 'complete';
    DG.UI.showComplete({
      level: this.levelIndex + 1, stars: stars, score: r.score, best: save.best[key].score,
      newBest: newBest, heartBonus: heartBonus, ammoBonus: ammoBonus,
      isLast: this.levelIndex >= DG.LEVELS.length - 1
    });
  };

  G.nextWave = function () {
    const r = this.run;
    const healed = r.hearts < C.HEARTS;
    const carry = {
      hearts: Math.min(C.HEARTS, r.hearts + 1), score: r.score + r.hearts * 50,
      ammo: r.ammo, streak: r.streak, volleyReady: r.volleyReady, selected: r.selected
    };
    this.wave++;
    this.run = newRun(DG.generateEndlessWave(this.wave), carry);
    banner(this.run, 'Wave ' + this.wave, healed ? '+1 ♥' : 'Faster dragons!', C.START_DELAY);
  };

  G.gameOver = function (reason) {
    const r = this.run;
    this.state = 'gameover';
    DG.Audio.play('lose');
    const info = { reason: reason, mode: this.mode, score: r.score, wave: this.wave, level: this.levelIndex + 1 };
    if (this.mode === 'endless') {
      const s = DG.Save.data;
      info.newBest = r.score > s.endlessBest;
      s.endlessBest = Math.max(s.endlessBest, r.score);
      s.endlessWave = Math.max(s.endlessWave, this.wave);
      DG.Save.save();
      info.best = s.endlessBest;
    }
    DG.UI.showGameOver(info);
  };

  function resolveOutcome(r) {
    if (r.outcome === 'win') G.finishLevel();
    else if (r.outcome === 'wave') G.nextWave();
    else G.gameOver(r.outcome);
  }

  // ------------------------------------------------------------------ update
  function updateEffects(r, dt) {
    for (let i = r.particles.length - 1; i >= 0; i--) {
      const p = r.particles[i];
      p.life -= dt;
      if (p.life <= 0) { r.particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = r.texts.length - 1; i >= 0; i--) {
      const t = r.texts[i];
      t.life -= dt;
      t.y -= 28 * dt;
      if (t.life <= 0) r.texts.splice(i, 1);
    }
    for (let i = r.beams.length - 1; i >= 0; i--) {
      r.beams[i].life -= dt;
      if (r.beams[i].life <= 0) r.beams.splice(i, 1);
    }
    if (r.banner) { r.banner.life -= dt; if (r.banner.life <= 0) r.banner = null; }
    if (r.hintTime > 0) r.hintTime -= dt;
    r.shake = Math.max(0, r.shake - dt * 25);
    r.flash = Math.max(0, r.flash - dt * 2.5);
    r.flinch = Math.max(0, r.flinch - dt);
    r.roarCooldown -= dt;
  }

  function updateMenu(dt) {
    for (const d of G.menuDragons) {
      d.y += d.speed * dt;
      if (d.y > 400) {
        d.y = -40;
        d.layers = Math.random() < 0.35 ? [randColor(), randColor()] : [randColor()];
      }
    }
  }

  G.update = function (dt) {
    if (this.state === 'paused') return;
    this.clock += dt;
    if (this.state === 'menu' || !this.run) { updateMenu(dt); return; }

    const r = this.run;
    updateEffects(r, dt);
    if (this.state !== 'playing') return;

    r.time += dt;

    // Spawn dragons whose time has come
    while (r.pending.length && r.pending[0].t <= r.time) {
      const p = r.pending.shift();
      r.dragons.push({
        lane: p.lane, x: laneX(p.lane), y: C.SPAWN_Y, layers: p.layers, maxLayers: p.layers.length,
        phase: Math.random() * 6.28, boost: 0, hitFlash: 0
      });
      if (r.roarCooldown <= 0 && (p.layers.length > 1 || Math.random() < 0.2)) {
        DG.Audio.play('roar', true);
        r.roarCooldown = 2.5;
      }
    }

    // Move dragons
    for (let i = r.dragons.length - 1; i >= 0; i--) {
      const d = r.dragons[i];
      d.hitFlash = Math.max(0, d.hitFlash - dt);
      if (d.boost > 0) {
        d.boost -= dt;
        if (Math.random() < dt * 14) {             // angry smoke puffs
          r.particles.push({ x: d.x + (Math.random() - 0.5) * 10, y: d.y - 16, vx: (Math.random() - 0.5) * 30,
            vy: -30, g: -40, life: 0.5, max: 0.5, color: 'rgba(90,90,90,0.7)', size: 4 });
        }
      }
      d.y += r.level.speed * (d.boost > 0 ? C.WRONG_BOOST_MULT : 1) * dt;
      if (d.y >= C.REACH_Y) {
        r.dragons.splice(i, 1);
        dragonReachedWall(r, d);
      }
    }

    // Move cannonballs; each hits the lowest dragon in its lane
    for (let i = r.balls.length - 1; i >= 0; i--) {
      const b = r.balls[i];
      b.y -= C.BALL_SPEED * dt;
      b.x += (b.tx - b.x) * Math.min(1, dt * 25);
      const d = this.lowestTarget(r, b.lane);
      if (d && b.y <= d.y + 16) {
        r.balls.splice(i, 1);
        resolveHit(r, b, d);
      } else if (b.y < C.FIELD_TOP - 10) {
        r.balls.splice(i, 1);                      // its target was destroyed first
      }
    }

    if (!r.outcome) {
      if (!r.pending.length && !r.dragons.length) setOutcome(r, this.mode === 'endless' ? 'wave' : 'win');
      else checkAmmo(r);
    }

    if (r.outcome) {
      r.endTimer -= dt;
      if (r.endTimer <= 0) resolveOutcome(r);
    }
  };
})();
